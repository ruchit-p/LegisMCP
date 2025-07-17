'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  AlertTriangle, 
  Activity, 
  XCircle, 
  Clock, 
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Search,
  Filter,
  Download,
  Shield,
  Zap,
  Database,
  Globe,
  AlertCircle,
  CheckCircle,
  X
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
  Area,
  ComposedChart
} from 'recharts';
import { cn } from '@/lib/utils';

// Types for error monitoring data
interface ErrorMetrics {
  totalErrors: number;
  errorRate: number;
  criticalErrors: number;
  resolvedErrors: number;
  avgResolutionTime: number;
  errorFrequency: number;
  affectedUsers: number;
  systemUptime: number;
}

interface ErrorEvent {
  id: string;
  timestamp: Date;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  component: string;
  endpoint?: string;
  userId?: string;
  userEmail?: string;
  stackTrace?: string;
  count: number;
  status: 'open' | 'investigating' | 'resolved';
  assignedTo?: string;
  tags: string[];
}

interface ErrorTrend {
  timestamp: string;
  totalErrors: number;
  criticalErrors: number;
  highErrors: number;
  mediumErrors: number;
  lowErrors: number;
  errorRate: number;
  affectedUsers: number;
}

interface ErrorCategory {
  category: string;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  avgResolutionTime: number;
}

interface ErrorAlert {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  isActive: boolean;
  lastTriggered?: Date;
  triggerCount: number;
}

// Mock data
const mockErrorMetrics: ErrorMetrics = {
  totalErrors: 1247,
  errorRate: 3.2,
  criticalErrors: 23,
  resolvedErrors: 1156,
  avgResolutionTime: 24.5, // hours
  errorFrequency: 12.3, // errors per hour
  affectedUsers: 89,
  systemUptime: 99.7
};

const mockErrorEvents: ErrorEvent[] = [
  {
    id: '1',
    timestamp: new Date('2024-01-07T10:30:00Z'),
    type: 'DATABASE_CONNECTION_ERROR',
    severity: 'critical',
    message: 'Unable to connect to D1 database - connection timeout',
    component: 'LegisAPI',
    endpoint: '/api/bills',
    userId: 'user123',
    userEmail: 'john@example.com',
    count: 5,
    status: 'investigating',
    assignedTo: 'tech-team',
    tags: ['database', 'timeout', 'api']
  },
  {
    id: '2',
    timestamp: new Date('2024-01-07T10:25:00Z'),
    type: 'RATE_LIMIT_EXCEEDED',
    severity: 'high',
    message: 'User exceeded rate limit for MCP tool calls',
    component: 'MCP Server',
    userId: 'user456',
    userEmail: 'jane@example.com',
    count: 12,
    status: 'open',
    tags: ['rate-limit', 'mcp', 'user']
  },
  {
    id: '3',
    timestamp: new Date('2024-01-07T10:20:00Z'),
    type: 'AUTHENTICATION_ERROR',
    severity: 'medium',
    message: 'Invalid JWT token in request',
    component: 'Frontend',
    endpoint: '/api/auth/profile',
    count: 3,
    status: 'resolved',
    assignedTo: 'auth-team',
    tags: ['auth', 'jwt', 'token']
  },
  {
    id: '4',
    timestamp: new Date('2024-01-07T10:15:00Z'),
    type: 'VALIDATION_ERROR',
    severity: 'low',
    message: 'Invalid bill number format in search query',
    component: 'LegisAPI',
    endpoint: '/api/search',
    count: 8,
    status: 'resolved',
    tags: ['validation', 'search', 'format']
  },
  {
    id: '5',
    timestamp: new Date('2024-01-07T10:10:00Z'),
    type: 'TIMEOUT_ERROR',
    severity: 'high',
    message: 'Congress.gov API request timeout',
    component: 'LegisAPI',
    endpoint: '/api/bills',
    count: 2,
    status: 'investigating',
    assignedTo: 'api-team',
    tags: ['timeout', 'external-api', 'congress']
  }
];

const mockErrorTrends: ErrorTrend[] = [
  { timestamp: '2024-01-07T06:00:00Z', totalErrors: 45, criticalErrors: 2, highErrors: 8, mediumErrors: 15, lowErrors: 20, errorRate: 2.8, affectedUsers: 12 },
  { timestamp: '2024-01-07T07:00:00Z', totalErrors: 52, criticalErrors: 3, highErrors: 10, mediumErrors: 18, lowErrors: 21, errorRate: 3.1, affectedUsers: 15 },
  { timestamp: '2024-01-07T08:00:00Z', totalErrors: 38, criticalErrors: 1, highErrors: 6, mediumErrors: 12, lowErrors: 19, errorRate: 2.5, affectedUsers: 10 },
  { timestamp: '2024-01-07T09:00:00Z', totalErrors: 61, criticalErrors: 4, highErrors: 12, mediumErrors: 20, lowErrors: 25, errorRate: 3.8, affectedUsers: 18 },
  { timestamp: '2024-01-07T10:00:00Z', totalErrors: 48, criticalErrors: 2, highErrors: 9, mediumErrors: 16, lowErrors: 21, errorRate: 3.2, affectedUsers: 14 },
  { timestamp: '2024-01-07T11:00:00Z', totalErrors: 42, criticalErrors: 1, highErrors: 7, mediumErrors: 14, lowErrors: 20, errorRate: 2.9, affectedUsers: 11 },
  { timestamp: '2024-01-07T12:00:00Z', totalErrors: 39, criticalErrors: 1, highErrors: 6, mediumErrors: 13, lowErrors: 19, errorRate: 2.7, affectedUsers: 9 }
];

const mockErrorCategories: ErrorCategory[] = [
  { category: 'Database Errors', count: 245, percentage: 35.2, trend: 'up', avgResolutionTime: 18.5 },
  { category: 'API Errors', count: 189, percentage: 27.1, trend: 'down', avgResolutionTime: 12.3 },
  { category: 'Authentication', count: 134, percentage: 19.3, trend: 'stable', avgResolutionTime: 8.7 },
  { category: 'Validation', count: 98, percentage: 14.1, trend: 'down', avgResolutionTime: 4.2 },
  { category: 'Rate Limiting', count: 31, percentage: 4.5, trend: 'up', avgResolutionTime: 2.1 }
];

const mockErrorAlerts: ErrorAlert[] = [
  {
    id: '1',
    name: 'Critical Error Rate',
    condition: 'error_rate > 5%',
    threshold: 5,
    isActive: true,
    lastTriggered: new Date('2024-01-07T09:30:00Z'),
    triggerCount: 3
  },
  {
    id: '2',
    name: 'Database Connection Failures',
    condition: 'database_errors > 10 in 5min',
    threshold: 10,
    isActive: true,
    lastTriggered: new Date('2024-01-07T10:15:00Z'),
    triggerCount: 7
  },
  {
    id: '3',
    name: 'High Error Volume',
    condition: 'total_errors > 100 in 1hr',
    threshold: 100,
    isActive: false,
    triggerCount: 0
  }
];

// Severity colors
const severityColors = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6'
};

const statusColors = {
  open: 'bg-red-100 text-red-800 border-red-300',
  investigating: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  resolved: 'bg-green-100 text-green-800 border-green-300'
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
              <TrendingUp className="h-3 w-3 text-red-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-green-500" />
            )}
            <span className={cn(
              change.type === 'increase' ? 'text-red-500' : 'text-green-500'
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

function ErrorEventsTable({ events }: { events: ErrorEvent[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Error Events</CardTitle>
        <CardDescription>Latest errors and incidents across the platform</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Component</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Count</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="text-sm">
                  {event.timestamp.toLocaleTimeString()}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {event.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className="text-xs"
                    style={{ 
                      borderColor: severityColors[event.severity],
                      color: severityColors[event.severity]
                    }}
                  >
                    {event.severity.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{event.component}</span>
                  {event.endpoint && (
                    <div className="text-xs text-gray-500">{event.endpoint}</div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="max-w-xs truncate" title={event.message}>
                    {event.message}
                  </div>
                  {event.userEmail && (
                    <div className="text-xs text-gray-500 mt-1">
                      User: {event.userEmail}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {event.count}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={cn("text-xs", statusColors[event.status])}>
                    {event.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Search className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <AlertCircle className="h-3 w-3" />
                    </Button>
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

function ErrorCategoriesTable({ categories }: { categories: ErrorCategory[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Error Categories</CardTitle>
        <CardDescription>Breakdown of errors by category</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {categories.map((category) => (
            <div key={category.category} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{category.category}</span>
                    <Badge variant="outline" className="text-xs">
                      {category.count}
                    </Badge>
                    {category.trend === 'up' && (
                      <TrendingUp className="h-3 w-3 text-red-500" />
                    )}
                    {category.trend === 'down' && (
                      <TrendingDown className="h-3 w-3 text-green-500" />
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {category.percentage}% of total errors
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">
                  {category.avgResolutionTime}h
                </div>
                <div className="text-xs text-gray-500">
                  Avg resolution
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ErrorAlertsTable({ alerts }: { alerts: ErrorAlert[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Error Alerts</CardTitle>
        <CardDescription>Configure and monitor error alert conditions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center space-x-3">
                <div className={cn(
                  "h-2 w-2 rounded-full",
                  alert.isActive ? "bg-green-500" : "bg-gray-400"
                )} />
                <div>
                  <div className="font-medium">{alert.name}</div>
                  <div className="text-sm text-gray-500">{alert.condition}</div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {alert.triggerCount} triggers
                  </div>
                  {alert.lastTriggered && (
                    <div className="text-xs text-gray-500">
                      Last: {alert.lastTriggered.toLocaleTimeString()}
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Main component
export function ErrorMonitoringDashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [metrics, setMetrics] = useState<ErrorMetrics>(mockErrorMetrics);
  const [events, setEvents] = useState<ErrorEvent[]>(mockErrorEvents);
  const [trends, setTrends] = useState<ErrorTrend[]>(mockErrorTrends);
  const [categories, setCategories] = useState<ErrorCategory[]>(mockErrorCategories);
  const [alerts, setAlerts] = useState<ErrorAlert[]>(mockErrorAlerts);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
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

  // Filter events based on search and filters
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.component.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSeverity = selectedSeverity === 'all' || event.severity === selectedSeverity;
    const matchesStatus = selectedStatus === 'all' || event.status === selectedStatus;
    
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header and controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Error Monitoring</h2>
          <p className="text-muted-foreground">
            Last updated: {lastUpdated.toLocaleString()}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search errors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
          </div>
          <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="investigating">Investigating</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
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
          title="Total Errors"
          value={metrics.totalErrors.toLocaleString()}
          change={{ value: 15.2, type: 'increase' }}
          icon={AlertTriangle}
          description="Last 24 hours"
        />
        
        <MetricCard
          title="Error Rate"
          value={`${metrics.errorRate}%`}
          change={{ value: 0.8, type: 'increase' }}
          icon={Activity}
          description="Percentage of requests"
        />
        
        <MetricCard
          title="Critical Errors"
          value={metrics.criticalErrors.toLocaleString()}
          change={{ value: 25.0, type: 'increase' }}
          icon={XCircle}
          description="Requiring immediate attention"
        />
        
        <MetricCard
          title="Avg Resolution Time"
          value={`${metrics.avgResolutionTime}h`}
          change={{ value: 12.5, type: 'decrease' }}
          icon={Clock}
          description="Time to resolve"
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Resolved Errors"
          value={metrics.resolvedErrors.toLocaleString()}
          change={{ value: 8.3, type: 'increase' }}
          icon={CheckCircle}
          description="Successfully resolved"
        />
        
        <MetricCard
          title="Error Frequency"
          value={`${metrics.errorFrequency}/h`}
          change={{ value: 18.7, type: 'increase' }}
          icon={Zap}
          description="Errors per hour"
        />
        
        <MetricCard
          title="Affected Users"
          value={metrics.affectedUsers.toLocaleString()}
          change={{ value: 22.1, type: 'increase' }}
          icon={Shield}
          description="Users experiencing errors"
        />
        
        <MetricCard
          title="System Uptime"
          value={`${metrics.systemUptime}%`}
          change={{ value: 0.2, type: 'decrease' }}
          icon={Globe}
          description="Overall system availability"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Error Trends</CardTitle>
            <CardDescription>Error count and rate over time</CardDescription>
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
                    dataKey="totalErrors" 
                    stroke="#ef4444" 
                    fill="#ef4444"
                    fillOpacity={0.3}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="errorRate" 
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
            <CardTitle>Error Severity Distribution</CardTitle>
            <CardDescription>Breakdown of errors by severity level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Critical', value: 23, color: '#ef4444' },
                      { name: 'High', value: 89, color: '#f97316' },
                      { name: 'Medium', value: 156, color: '#eab308' },
                      { name: 'Low', value: 234, color: '#3b82f6' }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {[
                      { name: 'Critical', value: 23, color: '#ef4444' },
                      { name: 'High', value: 89, color: '#f97316' },
                      { name: 'Medium', value: 156, color: '#eab308' },
                      { name: 'Low', value: 234, color: '#3b82f6' }
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

      {/* Error events table */}
      <ErrorEventsTable events={filteredEvents} />

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ErrorCategoriesTable categories={categories} />
        <ErrorAlertsTable alerts={alerts} />
      </div>
    </div>
  );
}