'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  AlertTriangle, 
  Clock, 
  Users,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Search,
  Zap,
  Timer,
  Shield,
  Globe
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Bar,
  Area,
  ComposedChart
} from 'recharts';
import { cn } from '@/lib/utils';

// Types for API usage data
interface ApiUsageMetrics {
  totalCalls: number;
  uniqueUsers: number;
  avgResponseTime: number;
  errorRate: number;
  rateLimitHits: number;
  totalDataTransfer: number;
  peakCallsPerMinute: number;
  activeApiKeys: number;
}

interface EndpointUsage {
  endpoint: string;
  method: string;
  calls: number;
  uniqueUsers: number;
  avgResponseTime: number;
  errorRate: number;
  rateLimitHits: number;
  lastUsed: Date;
}

interface UsageTrend {
  timestamp: string;
  calls: number;
  errors: number;
  responseTime: number;
  activeUsers: number;
}

interface UserApiUsage {
  userId: string;
  userEmail: string;
  totalCalls: number;
  subscription: string;
  rateLimitHits: number;
  errorRate: number;
  lastActivity: Date;
  mostUsedEndpoint: string;
}

interface RateLimitStatus {
  endpoint: string;
  limit: number;
  used: number;
  remaining: number;
  resetTime: Date;
  violationCount: number;
}

// Mock data
const mockApiMetrics: ApiUsageMetrics = {
  totalCalls: 234567,
  uniqueUsers: 1247,
  avgResponseTime: 145,
  errorRate: 2.3,
  rateLimitHits: 89,
  totalDataTransfer: 1024.5, // MB
  peakCallsPerMinute: 1240,
  activeApiKeys: 892
};

const mockEndpointUsage: EndpointUsage[] = [
  {
    endpoint: '/api/bills',
    method: 'GET',
    calls: 45123,
    uniqueUsers: 234,
    avgResponseTime: 128,
    errorRate: 1.2,
    rateLimitHits: 12,
    lastUsed: new Date('2024-01-07T10:30:00Z')
  },
  {
    endpoint: '/api/members',
    method: 'GET',
    calls: 32145,
    uniqueUsers: 189,
    avgResponseTime: 156,
    errorRate: 2.1,
    rateLimitHits: 8,
    lastUsed: new Date('2024-01-07T10:25:00Z')
  },
  {
    endpoint: '/api/votes',
    method: 'GET',
    calls: 18765,
    uniqueUsers: 145,
    avgResponseTime: 198,
    errorRate: 3.4,
    rateLimitHits: 23,
    lastUsed: new Date('2024-01-07T10:20:00Z')
  },
  {
    endpoint: '/api/committees',
    method: 'GET',
    calls: 12456,
    uniqueUsers: 98,
    avgResponseTime: 142,
    errorRate: 1.8,
    rateLimitHits: 5,
    lastUsed: new Date('2024-01-07T10:15:00Z')
  },
  {
    endpoint: '/api/search',
    method: 'POST',
    calls: 9876,
    uniqueUsers: 167,
    avgResponseTime: 234,
    errorRate: 4.2,
    rateLimitHits: 34,
    lastUsed: new Date('2024-01-07T10:10:00Z')
  }
];

const mockUsageTrends: UsageTrend[] = [
  { timestamp: '2024-01-07T06:00:00Z', calls: 1200, errors: 15, responseTime: 145, activeUsers: 45 },
  { timestamp: '2024-01-07T07:00:00Z', calls: 1450, errors: 18, responseTime: 142, activeUsers: 62 },
  { timestamp: '2024-01-07T08:00:00Z', calls: 1800, errors: 12, responseTime: 148, activeUsers: 78 },
  { timestamp: '2024-01-07T09:00:00Z', calls: 2100, errors: 25, responseTime: 151, activeUsers: 89 },
  { timestamp: '2024-01-07T10:00:00Z', calls: 2450, errors: 20, responseTime: 139, activeUsers: 102 },
  { timestamp: '2024-01-07T11:00:00Z', calls: 2200, errors: 16, responseTime: 136, activeUsers: 95 },
  { timestamp: '2024-01-07T12:00:00Z', calls: 1900, errors: 14, responseTime: 143, activeUsers: 87 }
];

const mockUserApiUsage: UserApiUsage[] = [
  {
    userId: 'user1',
    userEmail: 'john@example.com',
    totalCalls: 5234,
    subscription: 'Professional',
    rateLimitHits: 12,
    errorRate: 1.8,
    lastActivity: new Date('2024-01-07T10:30:00Z'),
    mostUsedEndpoint: '/api/bills'
  },
  {
    userId: 'user2',
    userEmail: 'jane@example.com',
    totalCalls: 3456,
    subscription: 'Starter',
    rateLimitHits: 23,
    errorRate: 3.2,
    lastActivity: new Date('2024-01-07T10:25:00Z'),
    mostUsedEndpoint: '/api/members'
  },
  {
    userId: 'user3',
    userEmail: 'bob@example.com',
    totalCalls: 2145,
    subscription: 'Enterprise',
    rateLimitHits: 3,
    errorRate: 0.9,
    lastActivity: new Date('2024-01-07T10:20:00Z'),
    mostUsedEndpoint: '/api/votes'
  }
];

const mockRateLimitStatus: RateLimitStatus[] = [
  {
    endpoint: '/api/bills',
    limit: 1000,
    used: 847,
    remaining: 153,
    resetTime: new Date(Date.now() + 3600000),
    violationCount: 2
  },
  {
    endpoint: '/api/members',
    limit: 500,
    used: 423,
    remaining: 77,
    resetTime: new Date(Date.now() + 3600000),
    violationCount: 1
  },
  {
    endpoint: '/api/votes',
    limit: 250,
    used: 241,
    remaining: 9,
    resetTime: new Date(Date.now() + 3600000),
    violationCount: 5
  }
];

// Components
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

function MetricCard({ title, value, change, icon: Icon, description }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
            {change.type === 'increase' ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
            <span className={cn(
              change.type === 'increase' ? 'text-green-500' : 'text-red-500'
            )}>
              {change.value}%
            </span>
            <span>from last hour</span>
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function EndpointUsageTable({ endpoints }: { endpoints: EndpointUsage[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>API Endpoints Usage</CardTitle>
        <CardDescription>Performance metrics for each endpoint</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Endpoint</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Calls</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Avg Response</TableHead>
              <TableHead>Error Rate</TableHead>
              <TableHead>Rate Limits</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {endpoints.map((endpoint) => (
              <TableRow key={`${endpoint.method}-${endpoint.endpoint}`}>
                <TableCell>
                  <div className="font-medium">{endpoint.endpoint}</div>
                  <div className="text-sm text-gray-500">
                    Last used: {endpoint.lastUsed.toLocaleTimeString()}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={endpoint.method === 'GET' ? 'default' : 'secondary'}>
                    {endpoint.method}
                  </Badge>
                </TableCell>
                <TableCell>{endpoint.calls.toLocaleString()}</TableCell>
                <TableCell>{endpoint.uniqueUsers}</TableCell>
                <TableCell>{endpoint.avgResponseTime}ms</TableCell>
                <TableCell>
                  <span className={cn(
                    "font-medium",
                    endpoint.errorRate > 5 ? "text-red-600" : 
                    endpoint.errorRate > 2 ? "text-yellow-600" : "text-green-600"
                  )}>
                    {endpoint.errorRate}%
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{endpoint.rateLimitHits}</span>
                    {endpoint.rateLimitHits > 20 && (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function UserUsageTable({ users }: { users: UserApiUsage[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top API Users</CardTitle>
        <CardDescription>Users with highest API usage</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Subscription</TableHead>
              <TableHead>Total Calls</TableHead>
              <TableHead>Error Rate</TableHead>
              <TableHead>Rate Limits</TableHead>
              <TableHead>Most Used</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.userId}>
                <TableCell>
                  <div>
                    <div className="font-medium">{user.userEmail}</div>
                    <div className="text-sm text-gray-500">
                      Last: {user.lastActivity.toLocaleTimeString()}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={
                    user.subscription === 'Enterprise' ? 'default' :
                    user.subscription === 'Professional' ? 'secondary' : 'outline'
                  }>
                    {user.subscription}
                  </Badge>
                </TableCell>
                <TableCell>{user.totalCalls.toLocaleString()}</TableCell>
                <TableCell>
                  <span className={cn(
                    "font-medium",
                    user.errorRate > 5 ? "text-red-600" : 
                    user.errorRate > 2 ? "text-yellow-600" : "text-green-600"
                  )}>
                    {user.errorRate}%
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{user.rateLimitHits}</span>
                    {user.rateLimitHits > 20 && (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {user.mostUsedEndpoint}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function RateLimitMonitor({ rateLimits }: { rateLimits: RateLimitStatus[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rate Limit Status</CardTitle>
        <CardDescription>Current rate limiting status by endpoint</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {rateLimits.map((limit) => {
            const usagePercentage = (limit.used / limit.limit) * 100;
            const isNearLimit = usagePercentage > 80;
            
            return (
              <div key={limit.endpoint} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{limit.endpoint}</span>
                    {limit.violationCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {limit.violationCount} violations
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {limit.used} / {limit.limit}
                  </div>
                </div>
                <div className="space-y-1">
                  <Progress 
                    value={usagePercentage} 
                    className={cn(
                      "h-2",
                      isNearLimit && "text-red-500"
                    )}
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{limit.remaining} remaining</span>
                    <span>Resets: {limit.resetTime.toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Main component
export function ApiUsageDashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [metrics] = useState<ApiUsageMetrics>(mockApiMetrics);
  const [endpoints] = useState<EndpointUsage[]>(mockEndpointUsage);
  const [trends] = useState<UsageTrend[]>(mockUsageTrends);
  const [users] = useState<UserApiUsage[]>(mockUserApiUsage);
  const [rateLimits] = useState<RateLimitStatus[]>(mockRateLimitStatus);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Filter endpoints based on search query
  const filteredEndpoints = endpoints.filter(endpoint =>
    endpoint.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
    endpoint.method.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header and controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">API Usage Analytics</h2>
          <p className="text-muted-foreground">
            Last updated: {lastUpdated.toLocaleString()}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search endpoints..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
          </div>
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">24 Hours</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
            </SelectContent>
          </Select>
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
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total API Calls"
          value={metrics.totalCalls.toLocaleString()}
          change={{ value: 12.5, type: 'increase' }}
          icon={BarChart3}
          description="All endpoints"
        />
        
        <MetricCard
          title="Unique Users"
          value={metrics.uniqueUsers.toLocaleString()}
          change={{ value: 8.3, type: 'increase' }}
          icon={Users}
          description="Active API users"
        />
        
        <MetricCard
          title="Avg Response Time"
          value={`${metrics.avgResponseTime}ms`}
          change={{ value: 2.1, type: 'decrease' }}
          icon={Clock}
          description="All endpoints"
        />
        
        <MetricCard
          title="Error Rate"
          value={`${metrics.errorRate}%`}
          change={{ value: 0.8, type: 'decrease' }}
          icon={AlertTriangle}
          description="Last 24 hours"
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Rate Limit Hits"
          value={metrics.rateLimitHits.toLocaleString()}
          change={{ value: 15.2, type: 'increase' }}
          icon={Shield}
          description="Rate limit violations"
        />
        
        <MetricCard
          title="Data Transfer"
          value={`${metrics.totalDataTransfer}MB`}
          change={{ value: 5.7, type: 'increase' }}
          icon={Globe}
          description="Total data served"
        />
        
        <MetricCard
          title="Peak Calls/Min"
          value={metrics.peakCallsPerMinute.toLocaleString()}
          change={{ value: 3.4, type: 'increase' }}
          icon={Zap}
          description="Highest traffic"
        />
        
        <MetricCard
          title="Active API Keys"
          value={metrics.activeApiKeys.toLocaleString()}
          change={{ value: 2.1, type: 'increase' }}
          icon={Timer}
          description="Keys used today"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Usage Trends</CardTitle>
            <CardDescription>API calls and response times over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                  />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="calls" 
                    stroke="#3b82f6" 
                    fill="#3b82f6"
                    fillOpacity={0.3}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="responseTime" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Error Distribution</CardTitle>
            <CardDescription>Errors and active users over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                  />
                  <Bar 
                    yAxisId="left"
                    dataKey="errors" 
                    fill="#ef4444"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="activeUsers" 
                    stroke="#10b981" 
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rate limits and endpoint usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RateLimitMonitor rateLimits={rateLimits} />
        
        <div className="lg:col-span-2">
          <EndpointUsageTable endpoints={filteredEndpoints} />
        </div>
      </div>

      {/* User usage table */}
      <UserUsageTable users={users} />
    </div>
  );
}