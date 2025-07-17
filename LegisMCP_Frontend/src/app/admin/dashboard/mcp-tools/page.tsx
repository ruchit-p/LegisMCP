'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { redirect } from 'next/navigation';
import { DashboardLayout, Alert } from '@/components/admin/dashboard-layout';
import { McpToolsDashboard } from '@/components/admin/mcp-tools-dashboard';
import { useAnalytics } from '@/components/providers/analytics-provider';

export default function McpToolsDashboardPage() {
  const { user, isLoading } = useUser();
  const analytics = useAnalytics();
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // Load alerts on component mount
  useEffect(() => {
    // Mock alerts related to MCP tools
    const mockAlerts: Alert[] = [
      {
        id: '1',
        type: 'warning',
        title: 'MCP Tool Performance Issue',
        message: 'analyze-bill tool showing increased response times',
        timestamp: new Date(),
        isRead: false,
        priority: 'medium'
      },
      {
        id: '2',
        type: 'info',
        title: 'New MCP Tool Popular',
        message: 'universal-search tool usage up 150% this week',
        timestamp: new Date(Date.now() - 1200000), // 20 minutes ago
        isRead: false,
        priority: 'low'
      },
      {
        id: '3',
        type: 'success',
        title: 'MCP Server Optimization',
        message: 'All MCP tools responding within SLA targets',
        timestamp: new Date(Date.now() - 2700000), // 45 minutes ago
        isRead: true,
        priority: 'low'
      }
    ];
    
    setAlerts(mockAlerts);
  }, []);

  // Track MCP tools dashboard access
  useEffect(() => {
    if (!isLoading && user) {
      analytics.logFeatureUsage('mcp_tools_dashboard_access', 'admin', true);
    }
  }, [user, isLoading, analytics]);

  // Handle alert dismissal
  const handleAlertDismiss = (alertId: string) => {
    setAlerts(prevAlerts => 
      prevAlerts.map(alert => 
        alert.id === alertId 
          ? { ...alert, isRead: true }
          : alert
      )
    );
    
    analytics.logFeatureUsage('alert_dismissed', 'admin', true);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    redirect('/api/auth/login');
  }

  // Check admin access
  const hasAdminAccess = user.email?.includes('@legismcp.com') || 
                        user.nickname === 'admin' || 
                        user.email === 'admin@example.com';

  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don&apos;t have permission to access the admin dashboard.
          </p>
          <button
            onClick={() => window.history.back()}
            className="text-primary hover:text-primary/80 underline"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout
      title="MCP Tools Analytics"
      description="Monitor MCP tool usage, performance, and effectiveness"
      alerts={alerts}
      onAlertDismiss={handleAlertDismiss}
    >
      <McpToolsDashboard />
    </DashboardLayout>
  );
}