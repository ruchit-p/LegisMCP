'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { redirect } from 'next/navigation';
import { DashboardLayout, Alert } from '@/components/admin/dashboard-layout';
import { OverviewDashboard } from '@/components/admin/overview-dashboard';
import { useAnalytics } from '@/components/providers/analytics-provider';

export default function AdminDashboardPage() {
  const { user, isLoading } = useUser();
  const analytics = useAnalytics();
  const [alerts, setAlerts] = useState<Alert[]>([]);

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

  // Load alerts on component mount
  useEffect(() => {
    setAlerts(mockAlerts);
  }, []);

  // Check if user has admin access
  useEffect(() => {
    if (!isLoading && user) {
      // Track admin dashboard access
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

  // Check if user has admin access (you might want to implement proper role checking)
  const hasAdminAccess = user.email?.includes('@legismcp.com') || 
                        user.nickname === 'admin' || 
                        user.email === 'admin@example.com'; // Temporary check

  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access the admin dashboard.
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
      title="System Overview"
      description="Monitor your LegislativeMCP platform performance and metrics"
      alerts={alerts}
      onAlertDismiss={handleAlertDismiss}
    >
      <OverviewDashboard />
    </DashboardLayout>
  );
}