"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
  BarChart3,
  Activity,
  Clock,
  Database,
  Shield,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Calendar,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';

// MARK: - Types

interface UsageStats {
  totalRequests: number;
  uniqueTools: number;
  avgResponseTime: number;
  totalDataTransferred: number;
  period: string;
}

interface UsageInfo {
  current: number;
  limit: number;
  percentage: number;
  planName: string;
}

interface SubscriptionInfo {
  id: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  planName: string;
}

interface UsageData {
  stats: UsageStats;
  usage: UsageInfo;
  subscription: SubscriptionInfo | null;
}

// MARK: - Usage Tracker Component

/**
 * Component for tracking API usage and displaying statistics.
 */
export function UsageTracker() {
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const { toast } = useToast();

  /**
   * Loads usage data from the backend.
   */
  const loadUsageData = useCallback(async () => {
    try {
      const response = await fetch(`/api/usage?days=${selectedPeriod}`);
      if (!response.ok) {
        throw new Error('Failed to load usage data');
      }
      const data = await response.json();
      setUsageData(data);
    } catch (error) {
      console.error('Error loading usage data:', error);
      toast({
        title: "Error",
        description: "Failed to load usage data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedPeriod, toast]);

  // Load usage data on component mount and when period changes
  useEffect(() => {
    loadUsageData();
  }, [loadUsageData]);

  /**
   * Refreshes usage data.
   */
  const refreshData = async () => {
    setIsRefreshing(true);
    await loadUsageData();
  };

  /**
   * Formats data size in bytes to human readable format.
   */
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  /**
   * Formats number with commas.
   */
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };



  /**
   * Gets usage status icon based on percentage.
   */
  const getUsageStatusIcon = (percentage: number) => {
    if (percentage >= 90) return <AlertTriangle className="h-4 w-4 text-red-600" />;
    if (percentage >= 75) return <Activity className="h-4 w-4 text-yellow-600" />;
    return <CheckCircle className="h-4 w-4 text-green-600" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!usageData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage Tracking</CardTitle>
          <CardDescription>Unable to load usage data</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={loadUsageData} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Usage Analytics
              </CardTitle>
              <CardDescription>
                Monitor your API usage and track performance metrics.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <select 
                  value={selectedPeriod} 
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="365">Last year</option>
                </select>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshData}
                disabled={isRefreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Current Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Current Usage</CardTitle>
          <CardDescription>
            Your API usage for the current billing period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  {getUsageStatusIcon(usageData.usage.percentage)}
                  <span className="font-medium">
                    {formatNumber(usageData.usage.current)} / {formatNumber(usageData.usage.limit)} requests
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  ({usageData.usage.percentage.toFixed(1)}% used)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">{usageData.usage.planName} Plan</span>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  usageData.usage.percentage >= 90 ? 'bg-red-500' :
                  usageData.usage.percentage >= 75 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(usageData.usage.percentage, 100)}%` }}
              />
            </div>

            {/* Usage Status Message */}
            {usageData.usage.percentage >= 90 && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <div className="text-sm">
                  <p className="font-medium text-red-800 dark:text-red-200">
                    High usage detected
                  </p>
                  <p className="text-red-700 dark:text-red-300">
                    You&apos;re approaching your monthly limit. Consider upgrading your plan.
                  </p>
                </div>
              </div>
            )}

            {/* Subscription Info */}
            {usageData.subscription && (
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Billing Period:</span>
                  </div>
                  <span className="font-medium">
                    {format(new Date(usageData.subscription.currentPeriodStart), 'MMM d')} - {format(new Date(usageData.subscription.currentPeriodEnd), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Requests
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(usageData.stats.totalRequests)}</div>
            <p className="text-xs text-muted-foreground">
              {usageData.stats.period}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Unique Tools
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageData.stats.uniqueTools}</div>
            <p className="text-xs text-muted-foreground">
              Different tools used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Response Time
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usageData.stats.avgResponseTime > 0 ? `${Math.round(usageData.stats.avgResponseTime)}ms` : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              Average latency
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Data Transferred
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(usageData.stats.totalDataTransferred)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total payload size
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Insights</CardTitle>
          <CardDescription>
            Performance and usage patterns for your API consumption
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Performance</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Average Response Time:</span>
                  <span className="font-medium">
                    {usageData.stats.avgResponseTime > 0 ? `${Math.round(usageData.stats.avgResponseTime)}ms` : 'No data'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Data Efficiency:</span>
                  <span className="font-medium">
                    {usageData.stats.totalRequests > 0 
                      ? `${formatBytes(usageData.stats.totalDataTransferred / usageData.stats.totalRequests)} per request`
                      : 'No data'
                    }
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Usage Patterns</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Active Tools:</span>
                  <span className="font-medium">{usageData.stats.uniqueTools} different tools</span>
                </div>
                <div className="flex justify-between">
                  <span>Usage Rate:</span>
                  <span className="font-medium">
                    {usageData.stats.totalRequests > 0 
                      ? `${(usageData.stats.totalRequests / parseInt(selectedPeriod)).toFixed(1)} requests/day`
                      : 'No data'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <h4 className="font-medium mb-2 text-blue-800 dark:text-blue-200">💡 Recommendations</h4>
            <ul className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
              {usageData.usage.percentage >= 90 && (
                <li>• Consider upgrading to a higher tier plan to avoid usage limits</li>
              )}
              {usageData.stats.avgResponseTime > 1000 && (
                <li>• Response times could be improved - check your network connection</li>
              )}
              {usageData.stats.uniqueTools === 1 && (
                <li>• Explore other available tools to maximize your subscription value</li>
              )}
              {usageData.stats.totalRequests === 0 && (
                <li>• Get started by creating an API key and making your first request</li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Plan Management */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Management</CardTitle>
          <CardDescription>
            Manage your subscription and explore upgrade options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-medium">Current Plan: {usageData.usage.planName}</div>
              <div className="text-sm text-muted-foreground">
                {formatNumber(usageData.usage.limit)} requests per month
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <a href="/billing">
                  <Shield className="h-4 w-4 mr-2" />
                  Manage Billing
                </a>
              </Button>
              {usageData.usage.percentage >= 75 && (
                <Button asChild>
                  <a href="#pricing">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Upgrade Plan
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 