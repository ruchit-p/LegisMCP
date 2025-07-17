'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { DashboardLayout, Alert } from '@/components/admin/dashboard-layout';
import { UserActivityDashboard } from '@/components/admin/user-activity-dashboard';
import { useAnalytics } from '@/components/providers/analytics-provider';
import { WithRoleCheck } from '@/components/auth/WithRoleCheck';

export default function UserAnalyticsDashboardPage() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const isLoading = status === 'loading';
  const analytics = useAnalytics();
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // Load alerts on component mount
  useEffect(() => {
    // Mock alerts related to user activity
    const mockAlerts: Alert[] = [
      {
        id: '1',
        type: 'info',
        title: 'User Activity Spike',
        message: 'User activity has increased by 35% in the last 2 hours',
        timestamp: new Date(),
        isRead: false,
        priority: 'medium'
      },
      {
        id: '2',
        type: 'warning',
        title: 'High Bounce Rate',
        message: 'Homepage bounce rate is above 60% - consider optimization',
        timestamp: new Date(Date.now() - 900000), // 15 minutes ago
        isRead: false,
        priority: 'medium'
      },
      {
        id: '3',
        type: 'success',
        title: 'User Engagement Up',
        message: 'Average session duration increased by 25%',
        timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
        isRead: true,
        priority: 'low'
      }
    ];
    
    setAlerts(mockAlerts);
  }, []);

  // Track user analytics dashboard access
  useEffect(() => {
    if (!isLoading && user) {
      analytics.logFeatureUsage('user_analytics_dashboard_access', 'admin', true);
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
        title="User Analytics"
        description="Monitor user behavior, engagement, and interaction patterns"
        alerts={alerts}
        onAlertDismiss={handleAlertDismiss}
      >
        <UserActivityDashboard />
      </DashboardLayout>
    </WithRoleCheck>
  );
}