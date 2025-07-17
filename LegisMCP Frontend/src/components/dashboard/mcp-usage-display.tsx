'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, TrendingUp, Activity, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface MCPUsageData {
  plan: string;
  callsUsed: number;
  callsLimit: number;
  isUnlimited: boolean;
  resetDate?: string;
  usage: Array<{
    id: string;
    timestamp: string;
    tool: string;
    status: 'success' | 'error';
    responseTime: number;
    error?: string;
  }>;
}

export function MCPUsageDisplay() {
  const [usageData, setUsageData] = useState<MCPUsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsageData();
  }, []);

  const loadUsageData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/mcp/usage');
      
      if (!response.ok) {
        throw new Error('Failed to load usage data');
      }

      const data = await response.json();
      setUsageData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={loadUsageData} variant="outline" className="mt-4">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!usageData) {
    return null;
  }

  const usagePercentage = usageData.isUnlimited 
    ? 0 
    : (usageData.callsUsed / usageData.callsLimit) * 100;

  const remainingCalls = usageData.isUnlimited 
    ? Infinity 
    : Math.max(0, usageData.callsLimit - usageData.callsUsed);

  return (
    <div className="space-y-6">
      {/* Usage Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            MCP Usage Overview
          </CardTitle>
          <CardDescription>
            Track your Model Context Protocol tool calls
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Usage Stats */}
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Current Plan</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold capitalize">{usageData.plan}</span>
                {usageData.isUnlimited && (
                  <Badge variant="secondary">Unlimited</Badge>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Calls Used</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{usageData.callsUsed.toLocaleString()}</span>
                {!usageData.isUnlimited && (
                  <span className="text-sm text-muted-foreground">
                    / {usageData.callsLimit.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Remaining</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">
                  {usageData.isUnlimited ? '∞' : remainingCalls.toLocaleString()}
                </span>
                {remainingCalls === 0 && !usageData.isUnlimited && (
                  <Badge variant="destructive">Limit Reached</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Progress Bar for Limited Plans */}
          {!usageData.isUnlimited && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Usage Progress</span>
                <span className="text-muted-foreground">{Math.round(usagePercentage)}%</span>
              </div>
              <Progress 
                value={usagePercentage} 
                className={usagePercentage >= 90 ? 'bg-red-100' : ''}
              />
              {usagePercentage >= 90 && (
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  You&apos;re approaching your usage limit. Consider upgrading your plan.
                </p>
              )}
            </div>
          )}

          {/* Reset Date for Monthly Plans */}
          {usageData.resetDate && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm">Next reset</span>
              <span className="text-sm font-medium">
                {new Date(usageData.resetDate).toLocaleDateString()}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Usage Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent MCP Tool Calls
          </CardTitle>
          <CardDescription>
            Your last 30 days of MCP tool usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usageData.usage.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No MCP tool calls yet</p>
              <p className="text-sm mt-2">Start using the MCP server to see your usage here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Tool</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Response Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageData.usage.map((call) => (
                    <TableRow key={call.id}>
                      <TableCell className="text-sm">
                        {formatDistanceToNow(new Date(call.timestamp), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{call.tool}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={call.status === 'success' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {call.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {call.responseTime}ms
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade CTA for Free/Limited Plans */}
      {(usageData.plan === 'free' || remainingCalls === 0) && !usageData.isUnlimited && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="flex items-center justify-between py-6">
            <div className="space-y-1">
              <p className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Need more MCP calls?
              </p>
              <p className="text-sm text-muted-foreground">
                Upgrade to a paid plan for more calls and premium features
              </p>
            </div>
            <Button asChild>
              <a href="/pricing">View Plans</a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}