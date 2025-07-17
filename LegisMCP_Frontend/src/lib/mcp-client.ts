import { EventEmitter } from 'events';
import { EventSourcePolyfill } from 'event-source-polyfill';
import { getMCPUsageLogger } from './mcp-usage-logger';

// MARK: - Types and Interfaces

export interface McpClientOptions {
    serverUrl: string;
    apiKey: string;
    sessionTimeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
    accessToken?: string; // Auth0 access token for logging
}

export interface McpClientState {
    connected: boolean;
    authenticated: boolean;
    sessionId?: string;
    subscriptionTier?: string;
    usageLimit?: number;
    monthlyUsage?: number;
    lastActivity?: Date;
}

export interface McpServerInfo {
    name: string;
    version: string;
    protocolVersion: string;
    capabilities: {
        tools?: boolean;
        resources?: boolean;
        prompts?: boolean;
        sampling?: boolean;
    };
}

export interface McpTool {
    name: string;
    description?: string;
    inputSchema: Record<string, unknown>;
}

export interface McpResource {
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
}

export interface McpPrompt {
    name: string;
    description?: string;
    arguments?: Record<string, unknown>[];
}

export interface McpToolResult extends Record<string, unknown> {
    content: Array<{
        type: string;
        text?: string;
        data?: unknown;
    }>;
    isError?: boolean;
}

export interface McpResourceContent {
    uri: string;
    mimeType: string;
    text?: string;
    blob?: string;
}

export interface McpPromptResult {
    description?: string;
    messages: Array<{
        role: string;
        content: {
            type: string;
            text?: string;
        };
    }>;
}

// MARK: - JSON-RPC Types

interface JsonRpcRequest extends Record<string, unknown> {
    jsonrpc: '2.0';
    method: string;
    params?: Record<string, unknown>;
    id?: string | number;
}

interface JsonRpcResponse<T = unknown> {
    jsonrpc: '2.0';
    result?: T;
    error?: {
        code: number;
        message: string;
        data?: unknown;
    };
    id?: string | number;
}

interface InitializeResult {
    sessionId: string;
    subscriptionTier: string;
    usageLimit: number;
    monthlyUsage: number;
}

interface ListToolsResult {
    tools: McpTool[];
}

interface ListResourcesResult {
    resources: McpResource[];
}

interface ListPromptsResult {
    prompts: McpPrompt[];
}

// MARK: - MCP Client Class

export class McpClient extends EventEmitter {
    private options: McpClientOptions;
    private state: McpClientState;
    private eventSource?: EventSource;
    private retryCount = 0;
    private retryTimer?: NodeJS.Timeout;
    private requestCounter = 0;
    private pendingRequests = new Map<string | number, {
        resolve: (value: unknown) => void;
        reject: (error: unknown) => void;
        timeout: NodeJS.Timeout;
    }>();
    private usageLogger = getMCPUsageLogger();

    constructor(options: McpClientOptions) {
        super();
        this.options = {
            sessionTimeout: 30 * 60 * 1000, // 30 minutes
            retryAttempts: 3,
            retryDelay: 1000,
            ...options
        };
        
        this.state = {
            connected: false,
            authenticated: false
        };

        // Set access token for usage logging if provided
        if (options.accessToken) {
            this.usageLogger.setAccessToken(options.accessToken);
        }
    }

    // MARK: - Connection Management

    public async connect(): Promise<void> {
        try {
            this.emit('connecting');
            
            // Initialize the session
            await this.initialize();
            
            // Establish SSE connection
            await this.establishSseConnection();
            
            this.state.connected = true;
            this.state.authenticated = true;
            this.retryCount = 0;
            
            this.emit('connected', this.state);
            
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    public async disconnect(): Promise<void> {
        try {
            this.emit('disconnecting');
            
            // Close SSE connection
            if (this.eventSource) {
                this.eventSource.close();
                this.eventSource = undefined;
            }
            
            // Clear retry timer
            if (this.retryTimer) {
                clearTimeout(this.retryTimer);
                this.retryTimer = undefined;
            }
            
            // Reject all pending requests
            for (const [, request] of this.pendingRequests) {
                clearTimeout(request.timeout);
                request.reject(new Error('Connection closed'));
            }
            this.pendingRequests.clear();
            
            // Delete session on server
            if (this.state.sessionId) {
                try {
                    await fetch(`${this.options.serverUrl}/session/${this.state.sessionId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${this.options.apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    });
                } catch {
                    // Ignore errors during session cleanup
                }
            }
            
            this.state.connected = false;
            this.state.authenticated = false;
            this.state.sessionId = undefined;
            
            this.emit('disconnected');
            
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    private async initialize(): Promise<void> {
        const initializeRequest = {
            jsonrpc: '2.0' as const,
            id: this.getNextRequestId(),
            method: 'initialize',
            params: {
                protocolVersion: '2024-11-05',
                capabilities: {
                    tools: true,
                    resources: true,
                    prompts: true
                },
                clientInfo: {
                    name: 'MCP Congress Frontend',
                    version: '1.0.0'
                }
            }
        };

        const response = await this.sendHttpRequest<InitializeResult>(initializeRequest);
        
        if (response.error) {
            throw new Error(`Initialize failed: ${response.error.message}`);
        }
        
        const result = response.result!;
        this.state.sessionId = result.sessionId;
        this.state.subscriptionTier = result.subscriptionTier;
        this.state.usageLimit = result.usageLimit;
        this.state.monthlyUsage = result.monthlyUsage;
        
        this.emit('initialized', result);
    }

    private async establishSseConnection(): Promise<void> {
        return new Promise((resolve, reject) => {
            const headers: Record<string, string> = {
                'Authorization': `Bearer ${this.options.apiKey}`,
                'Accept': 'text/event-stream',
                'Cache-Control': 'no-cache'
            };
            
            if (this.state.sessionId) {
                headers['Mcp-Session-Id'] = this.state.sessionId;
            }
            
            // Create EventSource with headers using polyfill for Cloudflare Workers compatibility
            this.eventSource = new EventSourcePolyfill(this.options.serverUrl, {
                headers
            }) as EventSource;
            
            this.eventSource.onopen = () => {
                resolve();
            };
            
            this.eventSource.onerror = (error) => {
                if (this.state.connected) {
                    this.handleConnectionError(error);
                } else {
                    reject(error);
                }
            };
            
            this.eventSource.onmessage = (event) => {
                this.handleSseMessage(event);
            };
        });
    }

    private handleSseMessage(event: MessageEvent): void {
        try {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
                case 'connection':
                    this.state.sessionId = data.sessionId;
                    this.emit('session', data);
                    break;
                    
                case 'ping':
                    this.emit('ping', data);
                    break;
                    
                case 'response':
                    this.handleResponse(data);
                    break;
                    
                case 'notification':
                    this.handleNotification(data);
                    break;
                    
                default:
                    this.emit('message', data);
                    break;
            }
            
        } catch (error) {
            this.emit('error', new Error(`Failed to parse SSE message: ${error}`));
        }
    }

    private handleConnectionError(error: Event): void {
        this.state.connected = false;
        this.emit('error', error);
        
        // Attempt to reconnect
        if (this.retryCount < this.options.retryAttempts!) {
            this.retryCount++;
            const delay = this.options.retryDelay! * Math.pow(2, this.retryCount - 1);
            
            this.retryTimer = setTimeout(() => {
                this.emit('reconnecting', this.retryCount);
                this.connect().catch(error => {
                    this.emit('error', error);
                });
            }, delay);
        } else {
            this.emit('connectionFailed');
        }
    }

    // MARK: - Request/Response Handling

    private async sendHttpRequest<T = unknown>(request: Record<string, unknown>): Promise<JsonRpcResponse<T>> {
        const response = await fetch(this.options.serverUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.options.apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...(this.state.sessionId ? { 'Mcp-Session-Id': this.state.sessionId } : {})
            },
            body: JSON.stringify(request)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const sessionId = response.headers.get('Mcp-Session-Id');
        if (sessionId) {
            this.state.sessionId = sessionId;
        }

        return await response.json();
    }

    private async sendRequest<T = unknown>(request: JsonRpcRequest): Promise<JsonRpcResponse<T>> {
        if (!this.state.connected) {
            throw new Error('Not connected to MCP server');
        }

        return new Promise((resolve, reject) => {
            const id = request.id;
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error('Request timeout'));
            }, 30000); // 30 second timeout

            this.pendingRequests.set(id, { resolve, reject, timeout });
            
            // Send via HTTP POST
            this.sendHttpRequest(request).then(response => {
                if (this.pendingRequests.has(id)) {
                    const pending = this.pendingRequests.get(id)!;
                    clearTimeout(pending.timeout);
                    this.pendingRequests.delete(id);
                    
                    if (response.error) {
                        pending.reject(new Error(response.error.message));
                    } else {
                        pending.resolve(response.result);
                    }
                }
            }).catch(error => {
                if (this.pendingRequests.has(id)) {
                    const pending = this.pendingRequests.get(id)!;
                    clearTimeout(pending.timeout);
                    this.pendingRequests.delete(id);
                    pending.reject(error);
                }
            });
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON-RPC response data is dynamic
    private handleResponse(data: any): void {
        const id = data.id;
        if (this.pendingRequests.has(id)) {
            const pending = this.pendingRequests.get(id)!;
            clearTimeout(pending.timeout);
            this.pendingRequests.delete(id);
            
            if (data.error) {
                pending.reject(new Error(data.error.message));
            } else {
                pending.resolve(data.result);
            }
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON-RPC notification data is dynamic
    private handleNotification(data: any): void {
        this.emit('notification', data);
    }

    private getNextRequestId(): number {
        return ++this.requestCounter;
    }

    // MARK: - MCP Protocol Methods

    public async listTools(): Promise<McpTool[]> {
        const response = await this.sendRequest<ListToolsResult>({
            jsonrpc: '2.0',
            id: this.getNextRequestId(),
            method: 'tools/list'
        });
        
        return response.result?.tools || [];
    }

    public async callTool(name: string, args: Record<string, unknown> = {}): Promise<McpToolResult> {
        const startTime = Date.now();
        
        try {
            const response = await this.sendRequest<McpToolResult>({
                jsonrpc: '2.0',
                id: this.getNextRequestId(),
                method: 'tools/call',
                params: {
                    name,
                    arguments: args
                }
            });
            
            const result = response.result!;
            const responseTime = Date.now() - startTime;
            
            // Log successful tool call
            await this.usageLogger.logSuccess(
                name,
                args,
                result,
                responseTime
            );
            
            return result;
        } catch (error) {
            const responseTime = Date.now() - startTime;
            
            // Log failed tool call
            await this.usageLogger.logError(
                name,
                args,
                error instanceof Error ? error.message : 'Unknown error',
                responseTime
            );
            
            throw error;
        }
    }

    public async listResources(): Promise<McpResource[]> {
        const response = await this.sendRequest<ListResourcesResult>({
            jsonrpc: '2.0',
            id: this.getNextRequestId(),
            method: 'resources/list'
        });
        
        return response.result?.resources || [];
    }

    public async readResource(uri: string): Promise<McpResourceContent> {
        const response = await this.sendRequest<McpResourceContent>({
            jsonrpc: '2.0',
            id: this.getNextRequestId(),
            method: 'resources/read',
            params: {
                uri
            }
        });
        
        return response.result!;
    }

    public async listPrompts(): Promise<McpPrompt[]> {
        const response = await this.sendRequest<ListPromptsResult>({
            jsonrpc: '2.0',
            id: this.getNextRequestId(),
            method: 'prompts/list'
        });
        
        return response.result?.prompts || [];
    }

    public async getPrompt(name: string, args: Record<string, unknown> = {}): Promise<McpPromptResult> {
        const response = await this.sendRequest<McpPromptResult>({
            jsonrpc: '2.0',
            id: this.getNextRequestId(),
            method: 'prompts/get',
            params: {
                name,
                arguments: args
            }
        });
        
        return response.result!;
    }

    // MARK: - Public Getters

    public getState(): McpClientState {
        return { ...this.state };
    }

    public isConnected(): boolean {
        return this.state.connected;
    }

    public isAuthenticated(): boolean {
        return this.state.authenticated;
    }

    public getSessionId(): string | undefined {
        return this.state.sessionId;
    }

    public getUsageInfo(): { used: number; limit: number; tier: string } | undefined {
        if (!this.state.monthlyUsage || !this.state.usageLimit || !this.state.subscriptionTier) {
            return undefined;
        }
        
        return {
            used: this.state.monthlyUsage,
            limit: this.state.usageLimit,
            tier: this.state.subscriptionTier
        };
    }

    public setAccessToken(token: string): void {
        this.options.accessToken = token;
        this.usageLogger.setAccessToken(token);
    }
}

// MARK: - Utility Functions

export function createMcpClient(options: McpClientOptions): McpClient {
    return new McpClient(options);
}

export function validateConnectionString(connectionString: string): boolean {
    try {
        const url = new URL(connectionString);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

export function parseConnectionString(connectionString: string): { serverUrl: string; path: string } {
    const url = new URL(connectionString);
    return {
        serverUrl: `${url.protocol}//${url.host}`,
        path: url.pathname || '/mcp'
    };
} 