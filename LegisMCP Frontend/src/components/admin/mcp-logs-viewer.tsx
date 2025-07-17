'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  RefreshCw,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface MCPLog {
  id: number;
  user_id: number;
  user_email: string;
  user_name: string;
  tool_name: string;
  status: 'success' | 'error' | 'timeout';
  error_message?: string;
  response_time_ms: number;
  tokens_used?: number;
  timestamp: string;
  request_data?: any;
  response_data?: any;
}

export function MCPLogsViewer() {
  const [logs, setLogs] = useState<MCPLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTool, setFilterTool] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const [availableTools, setAvailableTools] = useState<string[]>([]);

  useEffect(() => {
    loadLogs();
  }, [searchQuery, filterTool, filterStatus]);

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        search: searchQuery,
        tool: filterTool,
        status: filterStatus
      });

      const response = await fetch(`/api/admin/mcp-logs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setAvailableTools(data.tools || []);
      }
    } catch (error) {
      console.error('Error loading MCP logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'timeout':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const toggleLogDetails = (logId: number) => {
    setExpandedLog(expandedLog === logId ? null : logId);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>MCP Tool Logs</CardTitle>
            <CardDescription>Monitor all MCP tool calls and diagnose issues</CardDescription>
          </div>
          <Button onClick={loadLogs} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by user or error message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={filterTool} onValueChange={setFilterTool}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by tool" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tools</SelectItem>
              {availableTools.map(tool => (
                <SelectItem key={tool} value={tool}>{tool}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="timeout">Timeout</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Logs Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Tool</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Response Time</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => toggleLogDetails(log.id)}
                    >
                      <TableCell>
                        {expandedLog === log.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{log.user_name || 'Unknown'}</div>
                          <div className="text-muted-foreground">{log.user_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {log.tool_name}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          <span className="text-sm capitalize">{log.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{log.response_time_ms}ms</span>
                      </TableCell>
                      <TableCell>
                        {log.tokens_used ? (
                          <Badge variant="secondary">{log.tokens_used}</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{format(new Date(log.timestamp), 'MMM d, HH:mm')}</div>
                          <div className="text-muted-foreground">
                            {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedLog === log.id && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-muted/50">
                          <div className="p-4 space-y-4">
                            {log.error_message && (
                              <div>
                                <h4 className="font-semibold text-sm mb-2">Error Message</h4>
                                <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-3 rounded-md text-sm">
                                  {log.error_message}
                                </div>
                              </div>
                            )}
                            
                            {log.request_data && (
                              <div>
                                <h4 className="font-semibold text-sm mb-2">Request Data</h4>
                                <pre className="bg-background p-3 rounded-md text-xs overflow-x-auto">
                                  {JSON.stringify(log.request_data, null, 2)}
                                </pre>
                              </div>
                            )}
                            
                            {log.response_data && (
                              <div>
                                <h4 className="font-semibold text-sm mb-2">Response Data</h4>
                                <pre className="bg-background p-3 rounded-md text-xs overflow-x-auto max-h-64 overflow-y-auto">
                                  {JSON.stringify(log.response_data, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}