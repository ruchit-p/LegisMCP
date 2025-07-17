'use client';

import { useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Users, 
  AlertTriangle, 
  Activity, 
  Settings, 
  Database,
  TrendingUp,
  Shield,
  Bell,
  Menu,
  X,
  LogOut,
  Home,
  Zap,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Navigation items for the admin dashboard
const navigationItems = [
  {
    id: 'overview',
    label: 'Overview',
    icon: Home,
    href: '/admin/dashboard',
    description: 'System overview and key metrics'
  },
  {
    id: 'users',
    label: 'User Analytics',
    icon: Users,
    href: '/admin/dashboard/users',
    description: 'User activity and behavior analysis'
  },
  {
    id: 'api-usage',
    label: 'API Usage',
    icon: BarChart3,
    href: '/admin/dashboard/api-usage',
    description: 'API usage statistics and trends'
  },
  {
    id: 'mcp-tools',
    label: 'MCP Tools',
    icon: Zap,
    href: '/admin/dashboard/mcp-tools',
    description: 'MCP tool usage and performance'
  },
  {
    id: 'errors',
    label: 'Error Monitoring',
    icon: AlertTriangle,
    href: '/admin/dashboard/errors',
    description: 'Error logs and monitoring'
  },
  {
    id: 'system-health',
    label: 'System Health',
    icon: Activity,
    href: '/admin/dashboard/system-health',
    description: 'Performance and health metrics'
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: FileText,
    href: '/admin/dashboard/reports',
    description: 'Generate and export reports'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    href: '/admin/dashboard/settings',
    description: 'Dashboard configuration'
  }
];

// Alert types for the notification system
export type AlertType = 'error' | 'warning' | 'info' | 'success';

export interface Alert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// Props for the dashboard layout
interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
  alerts?: Alert[];
  onAlertDismiss?: (alertId: string) => void;
}

// Alert icon mapping
const alertIcons = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle
};

// Alert color mapping
const alertColors = {
  error: 'text-red-500 bg-red-50 border-red-200',
  warning: 'text-yellow-500 bg-yellow-50 border-yellow-200',
  info: 'text-blue-500 bg-blue-50 border-blue-200',
  success: 'text-green-500 bg-green-50 border-green-200'
};

export function DashboardLayout({ 
  children, 
  title, 
  description, 
  alerts = [], 
  onAlertDismiss 
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Get unread alerts
  const unreadAlerts = alerts.filter(alert => !alert.isRead);
  const criticalAlerts = alerts.filter(alert => alert.priority === 'critical');

  // Handle navigation
  const handleNavigation = (href: string) => {
    router.push(href);
    setSidebarOpen(false);
  };

  // Handle alert dismissal
  const handleAlertDismiss = (alertId: string) => {
    if (onAlertDismiss) {
      onAlertDismiss(alertId);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Admin Dashboard
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  LegislativeMCP Platform
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 p-4">
            <nav className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.href)}
                    className={cn(
                      "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-primary/10 text-primary border border-primary/20" 
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <div className="flex-1 text-left">
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {item.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </ScrollArea>

          {/* Sidebar footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start"
              onClick={() => router.push('/dashboard')}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-72">
        {/* Top header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </Button>
              
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {title}
                </h1>
                {description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Critical alerts indicator */}
              {criticalAlerts.length > 0 && (
                <div className="flex items-center space-x-2 px-3 py-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {criticalAlerts.length} Critical Alert{criticalAlerts.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {/* Alerts dropdown */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAlertsOpen(!alertsOpen)}
                  className="relative"
                >
                  <Bell className="h-4 w-4" />
                  {unreadAlerts.length > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0"
                    >
                      {unreadAlerts.length > 9 ? '9+' : unreadAlerts.length}
                    </Badge>
                  )}
                </Button>

                {/* Alerts dropdown content */}
                {alertsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          Notifications
                        </h3>
                        <Badge variant="secondary">
                          {unreadAlerts.length} new
                        </Badge>
                      </div>
                    </div>
                    
                    <ScrollArea className="max-h-80">
                      {alerts.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                          No notifications
                        </div>
                      ) : (
                        <div className="p-2">
                          {alerts.slice(0, 10).map((alert) => {
                            const Icon = alertIcons[alert.type];
                            return (
                              <div
                                key={alert.id}
                                className={cn(
                                  "flex items-start space-x-3 p-3 rounded-lg border mb-2",
                                  alertColors[alert.type],
                                  !alert.isRead && "ring-2 ring-primary/20"
                                )}
                              >
                                <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium truncate">
                                      {alert.title}
                                    </p>
                                    <button
                                      onClick={() => handleAlertDismiss(alert.id)}
                                      className="text-xs text-gray-500 hover:text-gray-700"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    {alert.message}
                                  </p>
                                  <div className="flex items-center justify-between mt-2">
                                    <Badge 
                                      variant={alert.priority === 'critical' ? 'destructive' : 'secondary'}
                                      className="text-xs"
                                    >
                                      {alert.priority}
                                    </Badge>
                                    <span className="text-xs text-gray-500">
                                      {new Date(alert.timestamp).toLocaleTimeString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                )}
              </div>

              {/* Real-time status indicator */}
              <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg border border-green-200 dark:border-green-800">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium">Live</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}