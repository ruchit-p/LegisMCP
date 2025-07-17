'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { redirect } from 'next/navigation';
import { DashboardLayout, Alert } from '@/components/admin/dashboard-layout';
import { ApiUsageDashboard } from '@/components/admin/api-usage-dashboard';
import { useAnalytics } from '@/components/providers/analytics-provider';

export default function ApiUsageDashboardPage() {
  const { user, isLoading } = useUser();
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
      title="API Usage Analytics"
      description="Monitor API usage, rate limits, and endpoint performance"
      alerts={alerts}
      onAlertDismiss={handleAlertDismiss}
    >
      <ApiUsageDashboard />
    </DashboardLayout>
  );
}