'use client';

import { useState } from 'react';
import { McpClient, McpClientState } from '@/lib/mcp-client';
import { ConnectionForm } from '@/components/mcp/connection-form';
import { ToolExplorer } from '@/components/mcp/tool-explorer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ComingSoonFeature } from '@/components/ui/coming-soon-feature';
import { Info, Key } from 'lucide-react';

export default function McpPage() {
    const [client, setClient] = useState<McpClient | null>(null);
    const [clientState, setClientState] = useState<McpClientState | null>(null);

    const handleConnectionChange = (newClient: McpClient | null, newState: McpClientState | null) => {
        setClient(newClient);
        setClientState(newState);
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">MCP Server Connection</h1>
                <p className="text-muted-foreground">
                    Connect to your Azure-hosted MCP server and interact with its tools, resources, and prompts.
                </p>
            </div>

            {/* Information Alert */}
            <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                    This page allows you to connect to your production MCP server deployed on Azure. 
                    Once API keys are available, you'll be able to use them here for secure authentication.
                </AlertDescription>
            </Alert>

            {/* API Key Coming Soon Notice */}
            <ComingSoonFeature
                title="Secure API Key Authentication"
                description="Connect to your MCP server using secure API keys instead of manual configuration. This will make the connection process much more streamlined and secure."
                icon={<Key className="h-5 w-5" />}
                showDetailedStats={true}
            />

            {/* Connection Form */}
            <ConnectionForm onConnectionChange={handleConnectionChange} />

            {/* Tool Explorer - only show when connected */}
            {client && clientState?.connected ? (
                <ToolExplorer client={client} />
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Tool Explorer</CardTitle>
                        <CardDescription>
                            Connect to an MCP server to explore available tools, resources, and prompts
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">
                                Please connect to an MCP server first to access tools and resources.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
} 