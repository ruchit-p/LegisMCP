'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    Loader2, 
    Play, 
    Settings, 
    FileText, 
    MessageSquare, 
    Copy, 
    CheckCircle,
    XCircle,
    ChevronDown,
    ChevronRight
} from 'lucide-react';
import { McpClient, McpTool, McpResource, McpPrompt, McpToolResult, McpResourceContent, McpPromptResult } from '@/lib/mcp-client';
import { useToast } from '@/hooks/use-toast';

// MARK: - Types and Interfaces

interface ToolExplorerProps {
    client: McpClient;
    className?: string;
}

interface ToolCall {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
    result?: McpToolResult;
    error?: string;
    timestamp: Date;
    duration?: number;
}

interface ResourceRead {
    id: string;
    uri: string;
    content?: McpResourceContent;
    error?: string;
    timestamp: Date;
}

interface PromptGet {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
    result?: McpPromptResult;
    error?: string;
    timestamp: Date;
}

// MARK: - Tool Explorer Component

export function ToolExplorer({ client, className = '' }: ToolExplorerProps) {
    const { toast } = useToast();
    const [tools, setTools] = useState<McpTool[]>([]);
    const [resources, setResources] = useState<McpResource[]>([]);
    const [prompts, setPrompts] = useState<McpPrompt[]>([]);
    const [selectedTool, setSelectedTool] = useState<McpTool | null>(null);
    const [selectedResource, setSelectedResource] = useState<McpResource | null>(null);
    const [selectedPrompt, setSelectedPrompt] = useState<McpPrompt | null>(null);
    const [toolArguments, setToolArguments] = useState<string>('{}');
    const [promptArguments, setPromptArguments] = useState<string>('{}');
    const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
    const [resourceReads, setResourceReads] = useState<ResourceRead[]>([]);
    const [promptGets, setPromptGets] = useState<PromptGet[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

    // MARK: - Effect Hooks

    // MARK: - Data Loading

    const loadAvailableItems = useCallback(async () => {
        setIsLoading(true);
        try {
            const [toolsData, resourcesData, promptsData] = await Promise.all([
                client.listTools(),
                client.listResources(),
                client.listPrompts()
            ]);

            setTools(toolsData);
            setResources(resourcesData);
            setPrompts(promptsData);

            // Select first tool if available
            if (toolsData.length > 0) {
                setSelectedTool(toolsData[0]);
            }

            // Select first resource if available
            if (resourcesData.length > 0) {
                setSelectedResource(resourcesData[0]);
            }

            // Select first prompt if available
            if (promptsData.length > 0) {
                setSelectedPrompt(promptsData[0]);
            }

        } catch (error) {
            console.error('Failed to load MCP items:', error);
            toast({
                title: 'Loading Error',
                description: 'Failed to load available tools, resources, and prompts',
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    }, [client, toast]);

    useEffect(() => {
        if (client && client.isConnected()) {
            loadAvailableItems();
        }
    }, [client, loadAvailableItems]);

    // MARK: - Tool Operations

    const handleToolCall = async () => {
        if (!selectedTool) return;

        setIsLoading(true);
        const callId = Date.now().toString();
        const startTime = Date.now();

        try {
            const args = toolArguments.trim() ? JSON.parse(toolArguments) : {};
            const result = await client.callTool(selectedTool.name, args);
            const duration = Date.now() - startTime;

            const toolCall: ToolCall = {
                id: callId,
                name: selectedTool.name,
                arguments: args,
                result,
                timestamp: new Date(),
                duration
            };

            setToolCalls(prev => [toolCall, ...prev]);
            
            toast({
                title: 'Tool Call Successful',
                description: `${selectedTool.name} executed successfully`,
                variant: 'success'
            });

        } catch (error) {
            const duration = Date.now() - startTime;
            const toolCall: ToolCall = {
                id: callId,
                name: selectedTool.name,
                arguments: toolArguments.trim() ? JSON.parse(toolArguments) : {},
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date(),
                duration
            };

            setToolCalls(prev => [toolCall, ...prev]);
            
            toast({
                title: 'Tool Call Failed',
                description: error instanceof Error ? error.message : 'Unknown error',
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleResourceRead = async () => {
        if (!selectedResource) return;

        setIsLoading(true);
        const readId = Date.now().toString();

        try {
            const content = await client.readResource(selectedResource.uri);
            
            const resourceRead: ResourceRead = {
                id: readId,
                uri: selectedResource.uri,
                content,
                timestamp: new Date()
            };

            setResourceReads(prev => [resourceRead, ...prev]);
            
            toast({
                title: 'Resource Read Successful',
                description: `${selectedResource.name} read successfully`,
                variant: 'success'
            });

        } catch (error) {
            const resourceRead: ResourceRead = {
                id: readId,
                uri: selectedResource.uri,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date()
            };

            setResourceReads(prev => [resourceRead, ...prev]);
            
            toast({
                title: 'Resource Read Failed',
                description: error instanceof Error ? error.message : 'Unknown error',
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handlePromptGet = async () => {
        if (!selectedPrompt) return;

        setIsLoading(true);
        const getId = Date.now().toString();

        try {
            const args = promptArguments.trim() ? JSON.parse(promptArguments) : {};
            const result = await client.getPrompt(selectedPrompt.name, args);
            
            const promptGet: PromptGet = {
                id: getId,
                name: selectedPrompt.name,
                arguments: args,
                result,
                timestamp: new Date()
            };

            setPromptGets(prev => [promptGet, ...prev]);
            
            toast({
                title: 'Prompt Get Successful',
                description: `${selectedPrompt.name} retrieved successfully`,
                variant: 'success'
            });

        } catch (error) {
            const promptGet: PromptGet = {
                id: getId,
                name: selectedPrompt.name,
                arguments: promptArguments.trim() ? JSON.parse(promptArguments) : {},
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date()
            };

            setPromptGets(prev => [promptGet, ...prev]);
            
            toast({
                title: 'Prompt Get Failed',
                description: error instanceof Error ? error.message : 'Unknown error',
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    // MARK: - Utility Functions

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: 'Copied',
            description: 'Content copied to clipboard',
            variant: 'default'
        });
    };

    const toggleExpanded = (id: string) => {
        setExpandedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const formatJsonArguments = (args: Record<string, unknown>): string => {
        return JSON.stringify(args, null, 2);
    };

    // MARK: - Render Helpers

    const renderToolCall = (toolCall: ToolCall) => {
        const isExpanded = expandedItems.has(toolCall.id);
        
        return (
            <Card key={toolCall.id} className="mb-4">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExpanded(toolCall.id)}
                            >
                                {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                ) : (
                                    <ChevronRight className="h-4 w-4" />
                                )}
                            </Button>
                            <CardTitle className="text-lg">{toolCall.name}</CardTitle>
                            {toolCall.error ? (
                                <XCircle className="h-4 w-4 text-red-500" />
                            ) : (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {toolCall.duration && (
                                <Badge variant="secondary">{toolCall.duration}ms</Badge>
                            )}
                            <Badge variant="outline">
                                {toolCall.timestamp.toLocaleTimeString()}
                            </Badge>
                        </div>
                    </div>
                </CardHeader>
                {isExpanded && (
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <Label className="text-sm font-medium">Arguments</Label>
                                <pre className="mt-1 p-2 bg-gray-100 rounded text-sm overflow-x-auto">
                                    {formatJsonArguments(toolCall.arguments)}
                                </pre>
                            </div>
                            {toolCall.result && (
                                <div>
                                    <Label className="text-sm font-medium">Result</Label>
                                    <pre className="mt-1 p-2 bg-gray-100 rounded text-sm overflow-x-auto">
                                        {JSON.stringify(toolCall.result, null, 2)}
                                    </pre>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => copyToClipboard(JSON.stringify(toolCall.result, null, 2))}
                                        className="mt-2"
                                    >
                                        <Copy className="h-4 w-4 mr-2" />
                                        Copy Result
                                    </Button>
                                </div>
                            )}
                            {toolCall.error && (
                                <Alert variant="destructive">
                                    <XCircle className="h-4 w-4" />
                                    <AlertDescription>{toolCall.error}</AlertDescription>
                                </Alert>
                            )}
                        </div>
                    </CardContent>
                )}
            </Card>
        );
    };

    const renderResourceRead = (resourceRead: ResourceRead) => {
        const isExpanded = expandedItems.has(resourceRead.id);
        
        return (
            <Card key={resourceRead.id} className="mb-4">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExpanded(resourceRead.id)}
                            >
                                {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                ) : (
                                    <ChevronRight className="h-4 w-4" />
                                )}
                            </Button>
                            <CardTitle className="text-lg">{resourceRead.uri}</CardTitle>
                            {resourceRead.error ? (
                                <XCircle className="h-4 w-4 text-red-500" />
                            ) : (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                        </div>
                        <Badge variant="outline">
                            {resourceRead.timestamp.toLocaleTimeString()}
                        </Badge>
                    </div>
                </CardHeader>
                {isExpanded && (
                    <CardContent>
                        <div className="space-y-4">
                            {resourceRead.content && (
                                <div>
                                    <Label className="text-sm font-medium">Content</Label>
                                    <div className="mt-1 p-2 bg-gray-100 rounded text-sm overflow-x-auto max-h-96">
                                        {resourceRead.content.text ? (
                                            <pre>{resourceRead.content.text}</pre>
                                        ) : (
                                            <p className="text-gray-500">Binary content ({resourceRead.content.mimeType})</p>
                                        )}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => copyToClipboard(resourceRead.content?.text || '')}
                                        className="mt-2"
                                        disabled={!resourceRead.content.text}
                                    >
                                        <Copy className="h-4 w-4 mr-2" />
                                        Copy Content
                                    </Button>
                                </div>
                            )}
                            {resourceRead.error && (
                                <Alert variant="destructive">
                                    <XCircle className="h-4 w-4" />
                                    <AlertDescription>{resourceRead.error}</AlertDescription>
                                </Alert>
                            )}
                        </div>
                    </CardContent>
                )}
            </Card>
        );
    };

    // MARK: - Main Render

    if (isLoading && tools.length === 0 && resources.length === 0 && prompts.length === 0) {
        return (
            <Card className={className}>
                <CardContent className="flex items-center justify-center p-8">
                    <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Loading MCP capabilities...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    MCP Tool Explorer
                </CardTitle>
                <CardDescription>
                    Interact with tools, resources, and prompts from your MCP server
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="tools" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="tools" className="flex items-center gap-2">
                            <Play className="h-4 w-4" />
                            Tools ({tools.length})
                        </TabsTrigger>
                        <TabsTrigger value="resources" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Resources ({resources.length})
                        </TabsTrigger>
                        <TabsTrigger value="prompts" className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Prompts ({prompts.length})
                        </TabsTrigger>
                    </TabsList>

                    {/* Tools Tab */}
                    <TabsContent value="tools" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Available Tools</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div>
                                            <Label>Select Tool</Label>
                                            <Select 
                                                value={selectedTool?.name || ''} 
                                                onValueChange={(value) => {
                                                    const tool = tools.find(t => t.name === value);
                                                    setSelectedTool(tool || null);
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a tool" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {tools.map((tool) => (
                                                        <SelectItem key={tool.name} value={tool.name}>
                                                            {tool.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        
                                        {selectedTool && (
                                            <div>
                                                <Label>Description</Label>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {selectedTool.description || 'No description available'}
                                                </p>
                                            </div>
                                        )}
                                        
                                        <div>
                                            <Label>Arguments (JSON)</Label>
                                            <Textarea
                                                value={toolArguments}
                                                onChange={(e) => setToolArguments(e.target.value)}
                                                placeholder='{"key": "value"}'
                                                rows={4}
                                            />
                                        </div>
                                        
                                        <Button 
                                            onClick={handleToolCall}
                                            disabled={!selectedTool || isLoading}
                                            className="w-full"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Calling...
                                                </>
                                            ) : (
                                                <>
                                                    <Play className="mr-2 h-4 w-4" />
                                                    Call Tool
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Tool Call History</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4 max-h-96 overflow-y-auto">
                                        {toolCalls.length === 0 ? (
                                            <p className="text-sm text-gray-500">No tool calls yet</p>
                                        ) : (
                                            toolCalls.map(renderToolCall)
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Resources Tab */}
                    <TabsContent value="resources" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Available Resources</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div>
                                            <Label>Select Resource</Label>
                                            <Select 
                                                value={selectedResource?.uri || ''} 
                                                onValueChange={(value) => {
                                                    const resource = resources.find(r => r.uri === value);
                                                    setSelectedResource(resource || null);
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a resource" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {resources.map((resource) => (
                                                        <SelectItem key={resource.uri} value={resource.uri}>
                                                            {resource.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        
                                        {selectedResource && (
                                            <div>
                                                <Label>Description</Label>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {selectedResource.description || 'No description available'}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    URI: {selectedResource.uri}
                                                </p>
                                            </div>
                                        )}
                                        
                                        <Button 
                                            onClick={handleResourceRead}
                                            disabled={!selectedResource || isLoading}
                                            className="w-full"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Reading...
                                                </>
                                            ) : (
                                                <>
                                                    <FileText className="mr-2 h-4 w-4" />
                                                    Read Resource
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Resource Read History</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4 max-h-96 overflow-y-auto">
                                        {resourceReads.length === 0 ? (
                                            <p className="text-sm text-gray-500">No resource reads yet</p>
                                        ) : (
                                            resourceReads.map(renderResourceRead)
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Prompts Tab */}
                    <TabsContent value="prompts" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Available Prompts</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div>
                                            <Label>Select Prompt</Label>
                                            <Select 
                                                value={selectedPrompt?.name || ''} 
                                                onValueChange={(value) => {
                                                    const prompt = prompts.find(p => p.name === value);
                                                    setSelectedPrompt(prompt || null);
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a prompt" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {prompts.map((prompt) => (
                                                        <SelectItem key={prompt.name} value={prompt.name}>
                                                            {prompt.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        
                                        {selectedPrompt && (
                                            <div>
                                                <Label>Description</Label>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {selectedPrompt.description || 'No description available'}
                                                </p>
                                            </div>
                                        )}
                                        
                                        <div>
                                            <Label>Arguments (JSON)</Label>
                                            <Textarea
                                                value={promptArguments}
                                                onChange={(e) => setPromptArguments(e.target.value)}
                                                placeholder='{"key": "value"}'
                                                rows={4}
                                            />
                                        </div>
                                        
                                        <Button 
                                            onClick={handlePromptGet}
                                            disabled={!selectedPrompt || isLoading}
                                            className="w-full"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Getting...
                                                </>
                                            ) : (
                                                <>
                                                    <MessageSquare className="mr-2 h-4 w-4" />
                                                    Get Prompt
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Prompt History</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4 max-h-96 overflow-y-auto">
                                        {promptGets.length === 0 ? (
                                            <p className="text-sm text-gray-500">No prompt gets yet</p>
                                        ) : (
                                            promptGets.map((promptGet) => (
                                                <Card key={promptGet.id} className="mb-4">
                                                    <CardHeader className="pb-3">
                                                        <div className="flex items-center justify-between">
                                                            <CardTitle className="text-lg">{promptGet.name}</CardTitle>
                                                            <Badge variant="outline">
                                                                {promptGet.timestamp.toLocaleTimeString()}
                                                            </Badge>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent>
                                                        {promptGet.result && (
                                                            <div className="space-y-2">
                                                                <Label>Messages</Label>
                                                                <div className="space-y-2">
                                                                    {promptGet.result.messages.map((message, index) => (
                                                                        <div key={index} className="p-2 bg-gray-100 rounded">
                                                                            <div className="text-sm font-medium">{message.role}</div>
                                                                            <div className="text-sm">{message.content.text}</div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {promptGet.error && (
                                                            <Alert variant="destructive">
                                                                <XCircle className="h-4 w-4" />
                                                                <AlertDescription>{promptGet.error}</AlertDescription>
                                                            </Alert>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
} 