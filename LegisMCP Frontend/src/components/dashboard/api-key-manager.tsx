"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
  Key, 
  Plus, 
  Copy, 
  Trash2, 
  AlertCircle, 
  Calendar,
  Clock,
  Shield,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';

// MARK: - Types

interface ApiKeyInfo {
  id: string;
  name: string;
  keyPrefix: string;
  fullKey?: string; // Only present on creation
  isActive: boolean;
  expiresAt?: string;
  lastUsedAt?: string;
  createdAt: string;
}



// MARK: - API Key Manager Component

/**
 * Component for managing API keys - creation, listing, and deletion.
 */
export function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<ApiKeyInfo | null>(null);
  const { toast } = useToast();

  /**
   * Loads the user's API keys from the backend.
   */
  const loadApiKeys = useCallback(async () => {
    try {
      const response = await fetch('/api/keys');
      if (!response.ok) {
        throw new Error('Failed to load API keys');
      }
      const data = await response.json();
      setKeys(data.keys || []);
    } catch (error) {
      console.error('Error loading API keys:', error);
      toast({
        title: "Error",
        description: "Failed to load API keys. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Load API keys on component mount
  useEffect(() => {
    loadApiKeys();
  }, [loadApiKeys]);

  /**
   * Creates a new API key.
   */
  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Error", 
        description: "Please enter a name for your API key.",
        variant: "destructive",
      });
      return;
    }

    if (newKeyName.length > 100) {
      toast({
        title: "Error",
        description: "API key name must be less than 100 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newKeyName.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create API key');
      }

      const data = await response.json();
      setNewlyCreatedKey(data.key);
      setKeys(prev => [data.key, ...prev]);
      setNewKeyName('');
      setShowNewKeyForm(false);
      
      toast({
        title: "Success",
        description: "API key created successfully!",
        variant: "default",
      });
    } catch (error) {
      console.error('Error creating API key:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create API key",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Deactivates an API key.
   */
  const deactivateApiKey = async (keyId: string, keyName: string) => {
    if (!confirm(`Are you sure you want to deactivate the API key "${keyName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/keys/${keyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to deactivate API key');
      }

      setKeys(prev => prev.map(key => 
        key.id === keyId ? { ...key, isActive: false } : key
      ));
      
      toast({
        title: "Success",
        description: "API key deactivated successfully.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error deactivating API key:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to deactivate API key",
        variant: "destructive",
      });
    }
  };

  /**
   * Copies text to clipboard.
   */
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "API key copied to clipboard.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: "Error",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  /**
   * Dismisses the newly created key dialog.
   */
  const dismissNewKey = () => {
    setNewlyCreatedKey(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Key Management
          </CardTitle>
          <CardDescription>
            Generate and manage API keys for accessing the LegislativeMCP server API.
            Keep your keys secure and never share them publicly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showNewKeyForm ? (
            <Button onClick={() => setShowNewKeyForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Generate New API Key
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="keyName" className="text-sm font-medium">
                  API Key Name
                </label>
                <input
                  id="keyName"
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., My App API Key"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">
                  Choose a descriptive name to identify this key later.
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={createApiKey} 
                  disabled={isCreating}
                  className="flex items-center gap-2"
                >
                  {isCreating ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Create Key
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowNewKeyForm(false);
                    setNewKeyName('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Newly Created Key Dialog */}
      {newlyCreatedKey && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <CheckCircle className="h-5 w-5" />
              API Key Created Successfully
            </CardTitle>
            <CardDescription className="text-green-700 dark:text-green-300">
              Copy your new API key now - it will not be shown again for security reasons.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-900 rounded-md border">
              <code className="flex-1 font-mono text-sm break-all">
                {newlyCreatedKey.fullKey}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(newlyCreatedKey.fullKey!)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-200">
              <AlertCircle className="h-4 w-4" />
                              Store this key securely. You won&apos;t be able to view it again.
            </div>
            <Button onClick={dismissNewKey} variant="outline" size="sm">
              I&apos;ve saved my key
            </Button>
          </CardContent>
        </Card>
      )}

      {/* API Keys List */}
      <Card>
        <CardHeader>
          <CardTitle>Your API Keys</CardTitle>
          <CardDescription>
            {keys.length === 0 
              ? "No API keys created yet. Generate your first key to get started."
              : `You have ${keys.filter(k => k.isActive).length} active API key(s).`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No API keys found.</p>
              <p className="text-sm">Create your first API key to get started with the API.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    key.isActive 
                      ? 'border-border bg-card' 
                      : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium truncate">{key.name}</h3>
                      {key.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                          <Shield className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full">
                          <AlertCircle className="h-3 w-3" />
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="font-mono">{key.keyPrefix}...</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Created {format(new Date(key.createdAt), 'MMM d, yyyy')}
                      </span>
                      {key.lastUsedAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last used {format(new Date(key.lastUsedAt), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {key.isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deactivateApiKey(key.id, key.name)}
                        className="flex items-center gap-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        Deactivate
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Using Your API Key</CardTitle>
          <CardDescription>
            How to authenticate with the LegislativeMCP server using your API key.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Environment Variable Configuration</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Set your API key as an environment variable in your AI agent configuration:
            </p>
            <code className="block p-3 bg-muted rounded-md text-sm font-mono">
              MCP_API_KEY=your_api_key_here
            </code>
          </div>
          <div>
            <h4 className="font-medium mb-2">MCP Server Configuration</h4>
            <p className="text-sm text-muted-foreground mb-2">
              The MCP server will automatically use this environment variable to authenticate your requests.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-200">
            <AlertCircle className="h-4 w-4" />
            Never share your API keys publicly or commit them to version control.
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 