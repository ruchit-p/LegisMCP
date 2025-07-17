'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Users, 
  Activity, 
  MousePointer, 
  Clock, 
  Search,
  Download,
  MapPin,
  Smartphone,
  Monitor,
  Tablet
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { cn } from '@/lib/utils';

// Types for user activity data
interface UserActivityEvent {
  id: string;
  userId: string;
  userEmail: string;
  sessionId: string;
  eventType: string;
  eventData: Record<string, unknown>;
  pageUrl: string;
  pageTitle: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  timestamp: Date;
  location?: string;
}

interface UserSession {
  sessionId: string;
  userId: string;
  userEmail: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  pageViews: number;
  interactions: number;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  location?: string;
}

interface PageAnalytics {
  pageUrl: string;
  pageTitle: string;
  views: number;
  uniqueViews: number;
  avgTimeOnPage: number;
  bounceRate: number;
  interactions: number;
}

interface DeviceStats {
  device: string;
  count: number;
  percentage: number;
}

// Mock data
const mockUserEvents: UserActivityEvent[] = [
  {
    id: '1',
    userId: 'user1',
    userEmail: 'john@example.com',
    sessionId: 'session1',
    eventType: 'page_view',
    eventData: { previousPage: '/', loadTime: 250 },
    pageUrl: '/dashboard',
    pageTitle: 'Dashboard',
    deviceType: 'desktop',
    timestamp: new Date('2024-01-07T10:30:00Z'),
    location: 'New York, US'
  },
  {
    id: '2',
    userId: 'user2',
    userEmail: 'jane@example.com',
    sessionId: 'session2',
    eventType: 'button_click',
    eventData: { buttonText: 'Start Free Trial', section: 'hero' },
    pageUrl: '/',
    pageTitle: 'Home',
    deviceType: 'mobile',
    timestamp: new Date('2024-01-07T10:25:00Z'),
    location: 'London, UK'
  },
  {
    id: '3',
    userId: 'user3',
    userEmail: 'bob@example.com',
    sessionId: 'session3',
    eventType: 'search_query',
    eventData: { query: 'healthcare bills', searchType: 'bills', resultsCount: 25 },
    pageUrl: '/dashboard',
    pageTitle: 'Dashboard',
    deviceType: 'desktop',
    timestamp: new Date('2024-01-07T10:20:00Z'),
    location: 'Toronto, CA'
  }
];

const mockUserSessions: UserSession[] = [
  {
    sessionId: 'session1',
    userId: 'user1',
    userEmail: 'john@example.com',
    startTime: new Date('2024-01-07T10:00:00Z'),
    endTime: new Date('2024-01-07T10:45:00Z'),
    duration: 45 * 60 * 1000, // 45 minutes in ms
    pageViews: 8,
    interactions: 12,
    deviceType: 'desktop',
    location: 'New York, US'
  },
  {
    sessionId: 'session2',
    userId: 'user2',
    userEmail: 'jane@example.com',
    startTime: new Date('2024-01-07T09:30:00Z'),
    endTime: new Date('2024-01-07T09:55:00Z'),
    duration: 25 * 60 * 1000, // 25 minutes in ms
    pageViews: 5,
    interactions: 7,
    deviceType: 'mobile',
    location: 'London, UK'
  },
  {
    sessionId: 'session3',
    userId: 'user3',
    userEmail: 'bob@example.com',
    startTime: new Date('2024-01-07T08:15:00Z'),
    duration: 12 * 60 * 1000, // 12 minutes in ms
    pageViews: 3,
    interactions: 4,
    deviceType: 'desktop',
    location: 'Toronto, CA'
  }
];

const mockPageAnalytics: PageAnalytics[] = [
  {
    pageUrl: '/',
    pageTitle: 'Home',
    views: 1247,
    uniqueViews: 892,
    avgTimeOnPage: 145000, // 2:25
    bounceRate: 32.1,
    interactions: 456
  },
  {
    pageUrl: '/dashboard',
    pageTitle: 'Dashboard',
    views: 892,
    uniqueViews: 634,
    avgTimeOnPage: 380000, // 6:20
    bounceRate: 18.5,
    interactions: 1204
  },
  {
    pageUrl: '/admin',
    pageTitle: 'Admin Panel',
    views: 156,
    uniqueViews: 89,
    avgTimeOnPage: 720000, // 12:00
    bounceRate: 12.3,
    interactions: 523
  }
];

const mockDeviceStats: DeviceStats[] = [
  { device: 'Desktop', count: 1456, percentage: 62.3 },
  { device: 'Mobile', count: 678, percentage: 29.1 },
  { device: 'Tablet', count: 201, percentage: 8.6 }
];

const eventTypeColors = {
  page_view: '#3b82f6',
  button_click: '#10b981',
  form_interaction: '#f59e0b',
  search_query: '#8b5cf6',
  error: '#ef4444',
  session_start: '#06b6d4',
  session_end: '#6b7280'
};

const deviceIcons = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet
};

// Utility functions
const formatDuration = (milliseconds: number) => {
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = Math.floor((milliseconds % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const getEventTypeColor = (eventType: string) => {
  return eventTypeColors[eventType as keyof typeof eventTypeColors] || '#6b7280';
};

// Components
interface ActivityTimelineProps {
  events: UserActivityEvent[];
}

function ActivityTimeline({ events }: ActivityTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest user interactions and events</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.slice(0, 10).map((event) => {
            const DeviceIcon = deviceIcons[event.deviceType];
            return (
              <div key={event.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                <div 
                  className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                  style={{ backgroundColor: getEventTypeColor(event.eventType) }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm">{event.userEmail}</span>
                      <Badge variant="outline" className="text-xs">
                        {event.eventType.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <DeviceIcon className="h-3 w-3" />
                      <span>{event.location}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {event.pageTitle} • {event.pageUrl}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {event.timestamp.toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

interface UserSessionsTableProps {
  sessions: UserSession[];
}

function UserSessionsTable({ sessions }: UserSessionsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Sessions</CardTitle>
        <CardDescription>Active and recent user sessions</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Pages</TableHead>
              <TableHead>Interactions</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => {
              const DeviceIcon = deviceIcons[session.deviceType];
              const isActive = !session.endTime;
              
              return (
                <TableRow key={session.sessionId}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{session.userEmail}</div>
                      <div className="text-sm text-gray-500">{session.sessionId}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <DeviceIcon className="h-4 w-4" />
                      <span className="capitalize">{session.deviceType}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {session.duration ? formatDuration(session.duration) : 'Active'}
                  </TableCell>
                  <TableCell>{session.pageViews}</TableCell>
                  <TableCell>{session.interactions}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-3 w-3 text-gray-400" />
                      <span>{session.location}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={isActive ? "default" : "secondary"}>
                      {isActive ? 'Active' : 'Ended'}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

interface PageAnalyticsTableProps {
  pages: PageAnalytics[];
}

function PageAnalyticsTable({ pages }: PageAnalyticsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Page Analytics</CardTitle>
        <CardDescription>Performance metrics for each page</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Page</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Unique Views</TableHead>
              <TableHead>Avg Time</TableHead>
              <TableHead>Bounce Rate</TableHead>
              <TableHead>Interactions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pages.map((page) => (
              <TableRow key={page.pageUrl}>
                <TableCell>
                  <div>
                    <div className="font-medium">{page.pageTitle}</div>
                    <div className="text-sm text-gray-500">{page.pageUrl}</div>
                  </div>
                </TableCell>
                <TableCell>{page.views.toLocaleString()}</TableCell>
                <TableCell>{page.uniqueViews.toLocaleString()}</TableCell>
                <TableCell>{formatDuration(page.avgTimeOnPage)}</TableCell>
                <TableCell>
                  <span className={cn(
                    "font-medium",
                    page.bounceRate > 50 ? "text-red-600" : 
                    page.bounceRate > 30 ? "text-yellow-600" : "text-green-600"
                  )}>
                    {page.bounceRate}%
                  </span>
                </TableCell>
                <TableCell>{page.interactions.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Main component
export function UserActivityDashboard() {
  const [events] = useState<UserActivityEvent[]>(mockUserEvents);
  const [sessions] = useState<UserSession[]>(mockUserSessions);
  const [pages] = useState<PageAnalytics[]>(mockPageAnalytics);
  const [deviceStats] = useState<DeviceStats[]>(mockDeviceStats);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter events based on search query
  const filteredEvents = events.filter(event => 
    event.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.eventType.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.pageTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header and filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">User Activity</h2>
          <p className="text-muted-foreground">Monitor user behavior and engagement</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search events..."
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
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-bold">{sessions.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Sessions</p>
                <p className="text-2xl font-bold">{sessions.filter(s => !s.endTime).length}</p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold">{events.length}</p>
              </div>
              <MousePointer className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Session</p>
                <p className="text-2xl font-bold">
                  {formatDuration(
                    sessions.reduce((acc, s) => acc + (s.duration || 0), 0) / sessions.length
                  )}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Device Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="count"
                  >
                    {deviceStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b'][index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { type: 'Page Views', count: 45 },
                  { type: 'Clicks', count: 32 },
                  { type: 'Form Interactions', count: 18 },
                  { type: 'Search', count: 12 },
                  { type: 'Errors', count: 3 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ActivityTimeline events={filteredEvents} />
        <UserSessionsTable sessions={sessions} />
      </div>

      {/* Page analytics */}
      <PageAnalyticsTable pages={pages} />
    </div>
  );
}