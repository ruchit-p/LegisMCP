'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { redirect } from 'next/navigation';
import { DashboardLayout, Alert } from '@/components/admin/dashboard-layout';
import { ErrorMonitoringDashboard } from '@/components/admin/error-monitoring-dashboard';
import { useAnalytics } from '@/components/providers/analytics-provider';

export default function ErrorMonitoringDashboardPage() {
  const { user, isLoading } = useUser();
  const analytics = useAnalytics();
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // Load alerts on component mount
  useEffect(() => {
    // Mock alerts related to error monitoring
    const mockAlerts: Alert[] = [
      {
        id: '1',
        type: 'error',
        title: 'Critical Error Spike',
        message: 'Error rate has increased to 8.5% in the last 15 minutes',
        timestamp: new Date(),
        isRead: false,
        priority: 'critical'
      },
      {
        id: '2',
        type: 'warning',
        title: 'Database Connection Issues',
        message: 'Multiple D1 database timeout errors detected',
        timestamp: new Date(Date.now() - 600000), // 10 minutes ago
        isRead: false,
        priority: 'high'
      },
      {
        id: '3',
        type: 'info',
        title: 'Error Rate Normalized',
        message: 'Error rate has returned to baseline levels',
        timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
        isRead: true,
        priority: 'low'
      }
    ];
    
    setAlerts(mockAlerts);
  }, []);

  // Track error monitoring dashboard access
  useEffect(() => {
    if (!isLoading && user) {
      analytics.logFeatureUsage('error_monitoring_dashboard_access', 'admin', true);
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
      title="Error Monitoring"
      description="Track and analyze errors across the platform"
      alerts={alerts}
      onAlertDismiss={handleAlertDismiss}
    >
      <ErrorMonitoringDashboard />
    </DashboardLayout>
  );
}