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
  Zap, 
  Activity, 
  AlertTriangle, 
  Clock, 
  Users,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  Timer,
  BarChart3
} from 'lucide-react';
import { 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Bar,
  PieChart,
  Pie,
  Cell,
  Area,
  ComposedChart
} from 'recharts';
import { cn } from '@/lib/utils';

// Types for MCP tools data
interface McpToolMetrics {
  totalCalls: number;
  uniqueUsers: number;
  avgResponseTime: number;
  successRate: number;
  activeTools: number;
  totalErrors: number;
  peakCallsPerMinute: number;
  avgSessionDuration: number;
}

interface McpToolUsage {
  toolName: string;
  description: string;
  calls: number;
  uniqueUsers: number;
  avgResponseTime: number;
  successRate: number;
  errorCount: number;
  lastUsed: Date;
  category: string;
}

interface McpToolTrend {
  timestamp: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  avgResponseTime: number;
  activeUsers: number;
}

interface McpToolError {
  id: string;
  toolName: string;
  errorType: string;
  message: string;
  timestamp: Date;
  userId: string;
  userEmail: string;
  count: number;
}

interface McpUserUsage {
  userId: string;
  userEmail: string;
  totalCalls: number;
  favoriteTools: string[];
  avgResponseTime: number;
  successRate: number;
  lastActivity: Date;
  subscription: string;
}

// Mock data
const mockMcpMetrics: McpToolMetrics = {
  totalCalls: 45678,
  uniqueUsers: 567,
  avgResponseTime: 1234,
  successRate: 96.8,
  activeTools: 12,
  totalErrors: 234,
  peakCallsPerMinute: 45,
  avgSessionDuration: 8.5
};

const mockToolUsage: McpToolUsage[] = [
  {
    toolName: 'analyze-bill',
    description: 'Comprehensive analysis of congressional bills',
    calls: 12456,
    uniqueUsers: 234,
    avgResponseTime: 1567,
    successRate: 98.2,
    errorCount: 23,
    lastUsed: new Date('2024-01-07T10:30:00Z'),
    category: 'analysis'
  },
  {
    toolName: 'universal-search',
    description: 'Search across all legislative data',
    calls: 8934,
    uniqueUsers: 189,
    avgResponseTime: 890,
    successRate: 97.5,
    errorCount: 18,
    lastUsed: new Date('2024-01-07T10:25:00Z'),
    category: 'search'
  },
  {
    toolName: 'get-bill',
    description: 'Retrieve specific bill information',
    calls: 6789,
    uniqueUsers: 156,
    avgResponseTime: 445,
    successRate: 99.1,
    errorCount: 8,
    lastUsed: new Date('2024-01-07T10:20:00Z'),
    category: 'data'
  },
  {
    toolName: 'member-search',
    description: 'Search for members of Congress',
    calls: 4567,
    uniqueUsers: 123,
    avgResponseTime: 678,
    successRate: 96.8,
    errorCount: 15,
    lastUsed: new Date('2024-01-07T10:15:00Z'),
    category: 'search'
  },
  {
    toolName: 'trending-bills',
    description: 'Get trending congressional bills',
    calls: 3456,
    uniqueUsers: 98,
    avgResponseTime: 1234,
    successRate: 95.4,
    errorCount: 28,
    lastUsed: new Date('2024-01-07T10:10:00Z'),
    category: 'analysis'
  },
  {
    toolName: 'congress-query',
    description: 'Natural language queries about Congress',
    calls: 2345,
    uniqueUsers: 87,
    avgResponseTime: 2345,
    successRate: 94.2,
    errorCount: 34,
    lastUsed: new Date('2024-01-07T10:05:00Z'),
    category: 'ai'
  }
];

const mockToolTrends: McpToolTrend[] = [
  { timestamp: '2024-01-07T06:00:00Z', totalCalls: 245, successfulCalls: 238, failedCalls: 7, avgResponseTime: 1245, activeUsers: 23 },
  { timestamp: '2024-01-07T07:00:00Z', totalCalls: 298, successfulCalls: 289, failedCalls: 9, avgResponseTime: 1189, activeUsers: 34 },
  { timestamp: '2024-01-07T08:00:00Z', totalCalls: 367, successfulCalls: 356, failedCalls: 11, avgResponseTime: 1234, activeUsers: 45 },
  { timestamp: '2024-01-07T09:00:00Z', totalCalls: 423, successfulCalls: 408, failedCalls: 15, avgResponseTime: 1278, activeUsers: 56 },
  { timestamp: '2024-01-07T10:00:00Z', totalCalls: 489, successfulCalls: 473, failedCalls: 16, avgResponseTime: 1198, activeUsers: 67 },
  { timestamp: '2024-01-07T11:00:00Z', totalCalls: 445, successfulCalls: 431, failedCalls: 14, avgResponseTime: 1156, activeUsers: 61 },
  { timestamp: '2024-01-07T12:00:00Z', totalCalls: 398, successfulCalls: 387, failedCalls: 11, avgResponseTime: 1189, activeUsers: 54 }
];

const mockToolErrors: McpToolError[] = [
  {
    id: '1',
    toolName: 'analyze-bill',
    errorType: 'TIMEOUT',
    message: 'Request timeout while analyzing HR 1234',
    timestamp: new Date('2024-01-07T10:30:00Z'),
    userId: 'user1',
    userEmail: 'john@example.com',
    count: 3
  },
  {
    id: '2',
    toolName: 'universal-search',
    errorType: 'INVALID_QUERY',
    message: 'Invalid search query format',
    timestamp: new Date('2024-01-07T10:25:00Z'),
    userId: 'user2',
    userEmail: 'jane@example.com',
    count: 2
  },
  {
    id: '3',
    toolName: 'congress-query',
    errorType: 'RATE_LIMIT',
    message: 'Rate limit exceeded for AI query processing',
    timestamp: new Date('2024-01-07T10:20:00Z'),
    userId: 'user3',
    userEmail: 'bob@example.com',
    count: 1
  }
];

const mockUserUsage: McpUserUsage[] = [
  {
    userId: 'user1',
    userEmail: 'john@example.com',
    totalCalls: 456,
    favoriteTools: ['analyze-bill', 'get-bill', 'universal-search'],
    avgResponseTime: 1234,
    successRate: 97.8,
    lastActivity: new Date('2024-01-07T10:30:00Z'),
    subscription: 'Professional'
  },
  {
    userId: 'user2',
    userEmail: 'jane@example.com',
    totalCalls: 234,
    favoriteTools: ['universal-search', 'member-search'],
    avgResponseTime: 890,
    successRate: 96.5,
    lastActivity: new Date('2024-01-07T10:25:00Z'),
    subscription: 'Starter'
  },
  {
    userId: 'user3',
    userEmail: 'bob@example.com',
    totalCalls: 345,
    favoriteTools: ['trending-bills', 'congress-query'],
    avgResponseTime: 1567,
    successRate: 94.2,
    lastActivity: new Date('2024-01-07T10:20:00Z'),
    subscription: 'Enterprise'
  }
];

// Tool category colors
const categoryColors = {
  analysis: '#3b82f6',
  search: '#10b981',
  data: '#f59e0b',
  ai: '#8b5cf6'
};

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

function McpToolsTable({ tools }: { tools: McpToolUsage[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>MCP Tools Usage</CardTitle>
        <CardDescription>Performance metrics for each MCP tool</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tool Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Calls</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Response Time</TableHead>
              <TableHead>Success Rate</TableHead>
              <TableHead>Errors</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tools.map((tool) => (
              <TableRow key={tool.toolName}>
                <TableCell>
                  <div>
                    <div className="font-medium">{tool.toolName}</div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">
                      {tool.description}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className="capitalize"
                    style={{ 
                      borderColor: categoryColors[tool.category as keyof typeof categoryColors],
                      color: categoryColors[tool.category as keyof typeof categoryColors]
                    }}
                  >
                    {tool.category}
                  </Badge>
                </TableCell>
                <TableCell>{tool.calls.toLocaleString()}</TableCell>
                <TableCell>{tool.uniqueUsers}</TableCell>
                <TableCell>{tool.avgResponseTime}ms</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Progress value={tool.successRate} className="w-16 h-2" />
                    <span className={cn(
                      "text-sm font-medium",
                      tool.successRate > 95 ? "text-green-600" : 
                      tool.successRate > 90 ? "text-yellow-600" : "text-red-600"
                    )}>
                      {tool.successRate}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{tool.errorCount}</span>
                    {tool.errorCount > 20 && (
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

function McpToolErrorsTable({ errors }: { errors: McpToolError[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent MCP Tool Errors</CardTitle>
        <CardDescription>Latest errors and issues with MCP tools</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {errors.map((error) => (
            <div key={error.id} className="flex items-start space-x-3 p-3 rounded-lg border">
              <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">{error.toolName}</span>
                    <Badge variant="destructive" className="text-xs">
                      {error.errorType}
                    </Badge>
                  </div>
                  <span className="text-xs text-gray-500">
                    Count: {error.count}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {error.message}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    User: {error.userEmail}
                  </span>
                  <span className="text-xs text-gray-500">
                    {error.timestamp.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function McpUserUsageTable({ users }: { users: McpUserUsage[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top MCP Tool Users</CardTitle>
        <CardDescription>Users with highest MCP tool usage</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Subscription</TableHead>
              <TableHead>Total Calls</TableHead>
              <TableHead>Success Rate</TableHead>
              <TableHead>Avg Response</TableHead>
              <TableHead>Favorite Tools</TableHead>
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
                    user.successRate > 95 ? "text-green-600" : 
                    user.successRate > 90 ? "text-yellow-600" : "text-red-600"
                  )}>
                    {user.successRate}%
                  </span>
                </TableCell>
                <TableCell>{user.avgResponseTime}ms</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.favoriteTools.slice(0, 2).map((tool) => (
                      <Badge key={tool} variant="outline" className="text-xs">
                        {tool}
                      </Badge>
                    ))}
                    {user.favoriteTools.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{user.favoriteTools.length - 2}
                      </Badge>
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

// Main component
export function McpToolsDashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [metrics] = useState<McpToolMetrics>(mockMcpMetrics);
  const [tools] = useState<McpToolUsage[]>(mockToolUsage);
  const [trends] = useState<McpToolTrend[]>(mockToolTrends);
  const [errors] = useState<McpToolError[]>(mockToolErrors);
  const [users] = useState<McpUserUsage[]>(mockUserUsage);
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

  // Filter tools based on search query
  const filteredTools = tools.filter(tool =>
    tool.toolName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header and controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">MCP Tools Analytics</h2>
          <p className="text-muted-foreground">
            Last updated: {lastUpdated.toLocaleString()}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search tools..."
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
          title="Total Tool Calls"
          value={metrics.totalCalls.toLocaleString()}
          change={{ value: 18.5, type: 'increase' }}
          icon={Zap}
          description="All MCP tools"
        />
        
        <MetricCard
          title="Unique Users"
          value={metrics.uniqueUsers.toLocaleString()}
          change={{ value: 12.3, type: 'increase' }}
          icon={Users}
          description="Active MCP users"
        />
        
        <MetricCard
          title="Avg Response Time"
          value={`${metrics.avgResponseTime}ms`}
          change={{ value: 5.2, type: 'decrease' }}
          icon={Clock}
          description="All tools combined"
        />
        
        <MetricCard
          title="Success Rate"
          value={`${metrics.successRate}%`}
          change={{ value: 1.8, type: 'increase' }}
          icon={CheckCircle}
          description="Successful calls"
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Tools"
          value={metrics.activeTools.toLocaleString()}
          icon={Activity}
          description="Tools used today"
        />
        
        <MetricCard
          title="Total Errors"
          value={metrics.totalErrors.toLocaleString()}
          change={{ value: 8.7, type: 'decrease' }}
          icon={AlertTriangle}
          description="Error incidents"
        />
        
        <MetricCard
          title="Peak Calls/Min"
          value={metrics.peakCallsPerMinute.toLocaleString()}
          change={{ value: 25.4, type: 'increase' }}
          icon={BarChart3}
          description="Highest traffic"
        />
        
        <MetricCard
          title="Avg Session"
          value={`${metrics.avgSessionDuration}min`}
          change={{ value: 3.2, type: 'increase' }}
          icon={Timer}
          description="User session length"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tool Usage Trends</CardTitle>
            <CardDescription>MCP tool calls and success rates over time</CardDescription>
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
                    dataKey="totalCalls" 
                    stroke="#3b82f6" 
                    fill="#3b82f6"
                    fillOpacity={0.3}
                  />
                  <Bar 
                    yAxisId="left"
                    dataKey="failedCalls" 
                    fill="#ef4444"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="avgResponseTime" 
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
            <CardTitle>Tool Categories</CardTitle>
            <CardDescription>Usage distribution by tool category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Analysis', value: 15912, color: '#3b82f6' },
                      { name: 'Search', value: 13501, color: '#10b981' },
                      { name: 'Data', value: 6789, color: '#f59e0b' },
                      { name: 'AI', value: 2345, color: '#8b5cf6' }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {[
                      { name: 'Analysis', value: 15912, color: '#3b82f6' },
                      { name: 'Search', value: 13501, color: '#10b981' },
                      { name: 'Data', value: 6789, color: '#f59e0b' },
                      { name: 'AI', value: 2345, color: '#8b5cf6' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tools table */}
      <McpToolsTable tools={filteredTools} />

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <McpToolErrorsTable errors={errors} />
        <McpUserUsageTable users={users} />
      </div>
    </div>
  );
}