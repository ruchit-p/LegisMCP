'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { DashboardLayout, Alert } from '@/components/admin/dashboard-layout';
import { McpToolsDashboard } from '@/components/admin/mcp-tools-dashboard';
import { useAnalytics } from '@/components/providers/analytics-provider';
import { WithRoleCheck } from '@/components/auth/WithRoleCheck';

export default function McpToolsDashboardPage() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const isLoading = status === 'loading';
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

  return (
    <WithRoleCheck requiredRole={['admin', 'super_admin']}>
      <DashboardLayout
        title="MCP Tools Analytics"
        description="Monitor MCP tool usage, performance, and effectiveness"
        alerts={alerts}
        onAlertDismiss={handleAlertDismiss}
      >
        <McpToolsDashboard />
      </DashboardLayout>
    </WithRoleCheck>
  );
}