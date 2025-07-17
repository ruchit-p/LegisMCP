'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { DashboardLayout, Alert } from '@/components/admin/dashboard-layout';
import { OverviewDashboard } from '@/components/admin/overview-dashboard';
import { useAnalytics } from '@/components/providers/analytics-provider';
import { WithRoleCheck } from '@/components/auth/WithRoleCheck';

export default function AdminDashboardPage() {
  return (
    <WithRoleCheck requiredRole={['admin', 'super_admin']}>
      <AdminDashboardContent />
    </WithRoleCheck>
  );
}

function AdminDashboardContent() {
  const { user, isLoading } = useUser();
  const analytics = useAnalytics();
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // Load alerts on component mount
  useEffect(() => {
    // Mock alerts - in real implementation, these would come from API
    const mockAlerts: Alert[] = [
      {
        id: '1',
        type: 'error',
        title: 'High Error Rate Detected',
        message: 'Error rate has increased to 3.2% in the last hour',
        timestamp: new Date(),
        isRead: false,
        priority: 'high'
      },
      {
        id: '2',
        type: 'warning',
        title: 'API Rate Limit Approaching',
        message: 'User auth0|user123 is approaching their rate limit',
        timestamp: new Date(Date.now() - 300000), // 5 minutes ago
        isRead: false,
        priority: 'medium'
      },
      {
        id: '3',
        type: 'info',
        title: 'System Maintenance Scheduled',
        message: 'Scheduled maintenance window tonight at 2 AM UTC',
        timestamp: new Date(Date.now() - 600000), // 10 minutes ago
        isRead: true,
        priority: 'low'
      },
      {
        id: '4',
        type: 'success',
        title: 'Database Backup Completed',
        message: 'Daily backup completed successfully',
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        isRead: true,
        priority: 'low'
      }
    ];
    
    setAlerts(mockAlerts);
  }, []);

  // Track admin dashboard access
  useEffect(() => {
    if (!isLoading && user) {
      analytics.logFeatureUsage('admin_dashboard_access', 'admin', true);
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
    
    // Track alert dismissal
    analytics.logFeatureUsage('alert_dismissed', 'admin', true);
  };

  return (
    <DashboardLayout
      title="System Overview"
      description="Monitor your LegislativeMCP platform performance and metrics"
      alerts={alerts}
      onAlertDismiss={handleAlertDismiss}
    >
      <OverviewDashboard />
    </DashboardLayout>
  );
}