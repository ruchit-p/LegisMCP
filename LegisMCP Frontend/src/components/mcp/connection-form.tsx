'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { McpClient, McpClientOptions, McpClientState, validateConnectionString, parseConnectionString } from '@/lib/mcp-client';
import { useToast } from '@/hooks/use-toast';

// MARK: - Types and Interfaces

interface ConnectionFormProps {
    onConnectionChange: (client: McpClient | null, state: McpClientState | null) => void;
    className?: string;
}

interface ConnectionStatus {
    status: 'disconnected' | 'connecting' | 'connected' | 'error';
    message?: string;
    sessionId?: string;
    subscriptionTier?: string;
    usageInfo?: {
        used: number;
        limit: number;
        tier: string;
    };
}

// MARK: - Connection Form Component

export function ConnectionForm({ onConnectionChange, className = '' }: ConnectionFormProps) {
    const { toast } = useToast();
    const [connectionString, setConnectionString] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [status, setStatus] = useState<ConnectionStatus>({ status: 'disconnected' });
    const [client, setClient] = useState<McpClient | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<{ connectionString?: string; apiKey?: string }>({});

    // MARK: - Effect Hooks

    useEffect(() => {
        // Load saved connection details from localStorage
        const savedConnectionString = localStorage.getItem('mcp-connection-string');
        const savedApiKey = localStorage.getItem('mcp-api-key');
        
        if (savedConnectionString) {
            setConnectionString(savedConnectionString);
        }
        
        if (savedApiKey) {
            setApiKey(savedApiKey);
        }
    }, []);

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            if (client) {
                client.disconnect().catch(console.error);
            }
        };
    }, [client]);

    // MARK: - Connection Management

    const validateForm = (): boolean => {
        const newErrors: { connectionString?: string; apiKey?: string } = {};
        
        if (!connectionString.trim()) {
            newErrors.connectionString = 'Connection string is required';
        } else if (!validateConnectionString(connectionString)) {
            newErrors.connectionString = 'Invalid connection string format';
        }
        
        if (!apiKey.trim()) {
            newErrors.apiKey = 'API key is required';
        } else if (!apiKey.startsWith('cmcp_')) {
            newErrors.apiKey = 'Invalid API key format (should start with cmcp_)';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleConnect = async () => {
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setStatus({ status: 'connecting', message: 'Connecting to MCP server...' });

        try {
            // Parse connection string
            const { serverUrl, path } = parseConnectionString(connectionString);
            const fullUrl = `${serverUrl}${path}`;

            // Create MCP client
            const clientOptions: McpClientOptions = {
                serverUrl: fullUrl,
                apiKey: apiKey.trim(),
                retryAttempts: 3,
                retryDelay: 1000
            };

            const newClient = new McpClient(clientOptions);

            // Set up event listeners
            newClient.on('connecting', () => {
                setStatus({ status: 'connecting', message: 'Establishing connection...' });
            });

            newClient.on('connected', (state: McpClientState) => {
                setStatus({
                    status: 'connected',
                    message: 'Successfully connected to MCP server',
                    sessionId: state.sessionId,
                    subscriptionTier: state.subscriptionTier,
                    usageInfo: newClient.getUsageInfo()
                });
                
                toast({
                    title: 'Connected',
                    description: 'Successfully connected to MCP server',
                    variant: 'success'
                });
                
                // Save connection details
                localStorage.setItem('mcp-connection-string', connectionString);
                localStorage.setItem('mcp-api-key', apiKey);
                
                onConnectionChange(newClient, state);
            });

            newClient.on('disconnected', () => {
                setStatus({ status: 'disconnected', message: 'Disconnected from MCP server' });
                setClient(null);
                onConnectionChange(null, null);
            });

            newClient.on('error', (error) => {
                console.error('MCP Client Error:', error);
                setStatus({ 
                    status: 'error', 
                    message: error.message || 'Connection failed' 
                });
                
                toast({
                    title: 'Connection Error',
                    description: error.message || 'Failed to connect to MCP server',
                    variant: 'destructive'
                });
            });

            newClient.on('reconnecting', (attempt) => {
                setStatus({ 
                    status: 'connecting', 
                    message: `Reconnecting... (attempt ${attempt})` 
                });
            });

            // Connect to the server
            await newClient.connect();
            setClient(newClient);

        } catch (error) {
            console.error('Connection failed:', error);
            setStatus({ 
                status: 'error', 
                message: error instanceof Error ? error.message : 'Connection failed' 
            });
            
            toast({
                title: 'Connection Failed',
                description: error instanceof Error ? error.message : 'Unknown error occurred',
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (client) {
            setIsLoading(true);
            try {
                await client.disconnect();
                setClient(null);
                setStatus({ status: 'disconnected', message: 'Disconnected from MCP server' });
                onConnectionChange(null, null);
                
                toast({
                    title: 'Disconnected',
                    description: 'Successfully disconnected from MCP server',
                    variant: 'default'
                });
            } catch (error) {
                console.error('Disconnect failed:', error);
                toast({
                    title: 'Disconnect Failed',
                    description: 'Failed to disconnect cleanly',
                    variant: 'destructive'
                });
            } finally {
                setIsLoading(false);
            }
        }
    };

    // MARK: - Helper Functions

    const getStatusIcon = () => {
        switch (status.status) {
            case 'connected':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'connecting':
                return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
            case 'error':
                return <XCircle className="h-4 w-4 text-red-500" />;
            default:
                return <AlertCircle className="h-4 w-4 text-gray-500" />;
        }
    };

    const getStatusBadgeVariant = () => {
        switch (status.status) {
            case 'connected':
                return 'default';
            case 'connecting':
                return 'secondary';
            case 'error':
                return 'destructive';
            default:
                return 'outline';
        }
    };

    // MARK: - Render

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    MCP Server Connection
                    {getStatusIcon()}
                </CardTitle>
                <CardDescription>
                    Connect to your Azure-hosted MCP server using your connection string and API key
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Connection Status */}
                <div className="flex items-center justify-between">
                    <Badge variant={getStatusBadgeVariant()}>
                        {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
                    </Badge>
                    {status.subscriptionTier && (
                        <Badge variant="outline">
                            {status.subscriptionTier.charAt(0).toUpperCase() + status.subscriptionTier.slice(1)}
                        </Badge>
                    )}
                </div>

                {/* Status Message */}
                {status.message && (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{status.message}</AlertDescription>
                    </Alert>
                )}

                {/* Usage Information */}
                {status.usageInfo && (
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Usage Statistics</Label>
                        <div className="flex items-center justify-between text-sm">
                            <span>Monthly Usage:</span>
                            <span>
                                {status.usageInfo.used.toLocaleString()} / {status.usageInfo.limit.toLocaleString()}
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ 
                                    width: `${Math.min((status.usageInfo.used / status.usageInfo.limit) * 100, 100)}%` 
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Connection Form */}
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="connectionString">Connection String</Label>
                        <Input
                            id="connectionString"
                            type="url"
                            value={connectionString}
                            onChange={(e) => setConnectionString(e.target.value)}
                            placeholder="https://your-mcp-server.azurewebsites.net/mcp"
                            disabled={status.status === 'connected' || isLoading}
                            className={errors.connectionString ? 'border-red-500' : ''}
                        />
                        {errors.connectionString && (
                            <p className="text-sm text-red-500 mt-1">{errors.connectionString}</p>
                        )}
                        <p className="text-sm text-gray-600 mt-1">
                            Enter your Azure MCP server URL (e.g., https://your-server.azurewebsites.net/mcp)
                        </p>
                    </div>

                    <div>
                        <Label htmlFor="apiKey">API Key</Label>
                        <Input
                            id="apiKey"
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="cmcp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                            disabled={status.status === 'connected' || isLoading}
                            className={errors.apiKey ? 'border-red-500' : ''}
                        />
                        {errors.apiKey && (
                            <p className="text-sm text-red-500 mt-1">{errors.apiKey}</p>
                        )}
                        <p className="text-sm text-gray-600 mt-1">
                            Enter your API key from the dashboard
                        </p>
                    </div>
                </div>

                {/* Connection Actions */}
                <div className="flex gap-2">
                    {status.status === 'connected' ? (
                        <Button 
                            onClick={handleDisconnect}
                            disabled={isLoading}
                            variant="outline"
                            className="flex-1"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Disconnecting...
                                </>
                            ) : (
                                'Disconnect'
                            )}
                        </Button>
                    ) : (
                        <Button 
                            onClick={handleConnect}
                            disabled={isLoading || !connectionString.trim() || !apiKey.trim()}
                            className="flex-1"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Connecting...
                                </>
                            ) : (
                                'Connect'
                            )}
                        </Button>
                    )}
                    
                    <Button 
                        variant="outline"
                        size="icon"
                        onClick={() => window.open('https://docs.example.com/mcp-setup', '_blank')}
                        title="Setup Guide"
                    >
                        <ExternalLink className="h-4 w-4" />
                    </Button>
                </div>

                {/* Session Information */}
                {status.sessionId && (
                    <div className="text-xs text-gray-500 space-y-1">
                        <div>Session ID: {status.sessionId}</div>
                        <div>Last Activity: {new Date().toLocaleString()}</div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
} 