'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { DashboardLayout, Alert } from '@/components/admin/dashboard-layout';
import { ApiUsageDashboard } from '@/components/admin/api-usage-dashboard';
import { useAnalytics } from '@/components/providers/analytics-provider';
import { WithRoleCheck } from '@/components/auth/WithRoleCheck';

export default function ApiUsageDashboardPage() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const isLoading = status === 'loading';
  const analytics = useAnalytics();
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // Load alerts on component mount
  useEffect(() => {
    // Mock alerts related to API usage
    const mockAlerts: Alert[] = [
      {
        id: '1',
        type: 'warning',
        title: 'High API Usage Detected',
        message: 'API calls have increased by 45% in the last hour',
        timestamp: new Date(),
        isRead: false,
        priority: 'medium'
      },
      {
        id: '2',
        type: 'error',
        title: 'Rate Limit Violations',
        message: '3 users have exceeded their rate limits',
        timestamp: new Date(Date.now() - 600000), // 10 minutes ago
        isRead: false,
        priority: 'high'
      },
      {
        id: '3',
        type: 'info',
        title: 'New API Endpoint Released',
        message: '/api/votes endpoint is now available',
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        isRead: true,
        priority: 'low'
      }
    ];
    
    setAlerts(mockAlerts);
  }, []);

  // Track API usage dashboard access
  useEffect(() => {
    if (!isLoading && user) {
      analytics.logFeatureUsage('api_usage_dashboard_access', 'admin', true);
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
        title="API Usage Analytics"
        description="Monitor API usage, rate limits, and endpoint performance"
        alerts={alerts}
        onAlertDismiss={handleAlertDismiss}
      >
        <ApiUsageDashboard />
      </DashboardLayout>
    </WithRoleCheck>
  );
}