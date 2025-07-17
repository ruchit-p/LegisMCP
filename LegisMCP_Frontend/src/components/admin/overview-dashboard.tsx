'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  Database,
  Zap,
  Shield,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  CheckCircle
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { cn } from '@/lib/utils';

// Types for dashboard data
interface SystemMetrics {
  totalUsers: number;
  activeUsers: number;
  totalApiCalls: number;
  totalMcpCalls: number;
  errorRate: number;
  avgResponseTime: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  uptime: number;
}

interface TrendData {
  date: string;
  users: number;
  apiCalls: number;
  errors: number;
  responseTime: number;
}

interface TopEndpoint {
  endpoint: string;
  calls: number;
  avgResponseTime: number;
  errorRate: number;
}

interface RecentError {
  id: string;
  timestamp: Date;
  type: string;
  message: string;
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Mock data - in real implementation this would come from API
const mockSystemMetrics: SystemMetrics = {
  totalUsers: 1247,
  activeUsers: 342,
  totalApiCalls: 89432,
  totalMcpCalls: 23891,
  errorRate: 2.3,
  avgResponseTime: 145,
  systemHealth: 'healthy',
  uptime: 99.97
};

const mockTrendData: TrendData[] = [
  { date: '2024-01-01', users: 120, apiCalls: 2400, errors: 45, responseTime: 145 },
  { date: '2024-01-02', users: 135, apiCalls: 2800, errors: 52, responseTime: 142 },
  { date: '2024-01-03', users: 148, apiCalls: 3200, errors: 38, responseTime: 148 },
  { date: '2024-01-04', users: 162, apiCalls: 3600, errors: 41, responseTime: 151 },
  { date: '2024-01-05', users: 178, apiCalls: 4100, errors: 35, responseTime: 139 },
  { date: '2024-01-06', users: 195, apiCalls: 4500, errors: 29, responseTime: 136 },
  { date: '2024-01-07', users: 210, apiCalls: 4900, errors: 31, responseTime: 143 }
];

const mockTopEndpoints: TopEndpoint[] = [
  { endpoint: '/api/bills', calls: 12450, avgResponseTime: 128, errorRate: 1.2 },
  { endpoint: '/api/members', calls: 8932, avgResponseTime: 156, errorRate: 2.1 },
  { endpoint: '/api/votes', calls: 5674, avgResponseTime: 198, errorRate: 3.4 },
  { endpoint: '/api/committees', calls: 4321, avgResponseTime: 142, errorRate: 1.8 },
  { endpoint: '/api/mcp/logs', calls: 3456, avgResponseTime: 89, errorRate: 0.5 }
];

const mockRecentErrors: RecentError[] = [
  {
    id: '1',
    timestamp: new Date('2024-01-07T10:30:00Z'),
    type: 'API_ERROR',
    message: 'Rate limit exceeded for user auth0|user123',
    count: 3,
    severity: 'medium'
  },
  {
    id: '2',
    timestamp: new Date('2024-01-07T09:45:00Z'),
    type: 'DATABASE_ERROR',
    message: 'Connection timeout to D1 database',
    count: 1,
    severity: 'high'
  },
  {
    id: '3',
    timestamp: new Date('2024-01-07T08:20:00Z'),
    type: 'VALIDATION_ERROR',
    message: 'Invalid bill number format in request',
    count: 12,
    severity: 'low'
  }
];

// Component for metric cards
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  trend?: TrendData[];
}

function MetricCard({ title, value, change, icon: Icon, description, trend }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            {change.type === 'increase' ? (
              <ArrowUp className="h-3 w-3 text-green-500" />
            ) : (
              <ArrowDown className="h-3 w-3 text-red-500" />
            )}
            <span className={cn(
              change.type === 'increase' ? 'text-green-500' : 'text-red-500'
            )}>
              {change.value}%
            </span>
            <span>from last week</span>
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && trend.length > 0 && (
          <div className="mt-3 h-16">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <Line 
                  type="monotone" 
                  dataKey="users" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// System status component
function SystemStatus({ health, uptime }: { health: string; uptime: number }) {
  const getStatusColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-500 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-500 bg-yellow-50 border-yellow-200';
      case 'critical': return 'text-red-500 bg-red-50 border-red-200';
      default: return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (health: string) => {
    switch (health) {
      case 'healthy': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'critical': return AlertTriangle;
      default: return Activity;
    }
  };

  const StatusIcon = getStatusIcon(health);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">System Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={cn(
          "flex items-center space-x-2 p-3 rounded-lg border",
          getStatusColor(health)
        )}>
          <StatusIcon className="h-4 w-4" />
          <span className="font-medium capitalize">{health}</span>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uptime</span>
            <span className="font-medium">{uptime}%</span>
          </div>
          <Progress value={uptime} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}

// Recent errors component
function RecentErrorsList({ errors }: { errors: RecentError[] }) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Recent Errors</CardTitle>
        <CardDescription>Latest system errors and issues</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {errors.map((error) => (
            <div key={error.id} className="flex items-start space-x-3 p-3 rounded-lg border">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {error.type}
                  </p>
                  <Badge className={cn("text-xs", getSeverityColor(error.severity))}>
                    {error.severity}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {error.message}
                </p>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <span>Count: {error.count}</span>
                  <span>{error.timestamp.toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Main overview dashboard component
export function OverviewDashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>(mockSystemMetrics);
  const [trendData, setTrendData] = useState<TrendData[]>(mockTrendData);
  const [topEndpoints, setTopEndpoints] = useState<TopEndpoint[]>(mockTopEndpoints);
  const [recentErrors, setRecentErrors] = useState<RecentError[]>(mockRecentErrors);

  // Refresh data
  const refreshData = async () => {
    setIsLoading(true);
    try {
      // In real implementation, fetch from API
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Overview</h2>
          <p className="text-muted-foreground">
            Last updated: {lastUpdated.toLocaleString()}
          </p>
        </div>
        <Button 
          onClick={refreshData} 
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SystemStatus health={systemMetrics.systemHealth} uptime={systemMetrics.uptime} />
        
        {/* Key Metrics */}
        <MetricCard
          title="Total Users"
          value={systemMetrics.totalUsers.toLocaleString()}
          change={{ value: 12.5, type: 'increase' }}
          icon={Users}
          description="Registered users"
          trend={trendData}
        />
        
        <MetricCard
          title="Active Users"
          value={systemMetrics.activeUsers.toLocaleString()}
          change={{ value: 8.2, type: 'increase' }}
          icon={Activity}
          description="Active in last 24h"
        />
        
        <MetricCard
          title="Error Rate"
          value={`${systemMetrics.errorRate}%`}
          change={{ value: 0.5, type: 'decrease' }}
          icon={AlertTriangle}
          description="Last 24 hours"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Usage Trends */}
        <Card>
          <CardHeader>
            <CardTitle>API Usage Trends</CardTitle>
            <CardDescription>Daily API calls over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="apiCalls" 
                    stroke="#3b82f6" 
                    fill="#3b82f6"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Error Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Error Trends</CardTitle>
            <CardDescription>Daily error count and response time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="errors" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="responseTime" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Endpoints */}
        <Card>
          <CardHeader>
            <CardTitle>Top API Endpoints</CardTitle>
            <CardDescription>Most frequently used endpoints</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topEndpoints.map((endpoint, index) => (
                <div key={endpoint.endpoint} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-6 h-6 bg-primary/10 rounded-full text-xs font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{endpoint.endpoint}</p>
                      <p className="text-xs text-gray-500">
                        {endpoint.calls.toLocaleString()} calls
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{endpoint.avgResponseTime}ms</p>
                    <p className="text-xs text-gray-500">{endpoint.errorRate}% errors</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Errors */}
        <RecentErrorsList errors={recentErrors} />
      </div>
    </div>
  );
}