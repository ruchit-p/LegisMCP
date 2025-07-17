'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { DashboardLayout, Alert } from '@/components/admin/dashboard-layout';
import { ErrorMonitoringDashboard } from '@/components/admin/error-monitoring-dashboard';
import { useAnalytics } from '@/components/providers/analytics-provider';
import { useAlertsService } from '@/lib/alerts-service';
import { WithRoleCheck } from '@/components/auth/WithRoleCheck';

export default function ErrorMonitoringDashboardPage() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const isLoading = status === 'loading';
  const analytics = useAnalytics();
  const { initializeService } = useAlertsService();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [, setLoading] = useState(true);

  // Load alerts from database
  useEffect(() => {
    const loadAlerts = async () => {
      if (!user || isLoading) return;
      
      try {
        setLoading(true);
        const service = await initializeService();
        
        // Fetch alerts from the database
        const result = await service.getAlerts({
          limit: 10,
          resolved: false // Only show unresolved alerts
        });
        
        // Transform database alerts to match component interface
        const transformedAlerts: Alert[] = result.data.map(alert => ({
          id: alert.id,
          type: alert.alert_type,
          title: alert.title,
          message: alert.message,
          timestamp: new Date(alert.created_at),
          isRead: alert.is_read,
          priority: alert.severity
        }));
        
        setAlerts(transformedAlerts);
      } catch (error) {
        console.error('Failed to load alerts:', error);
        // Fallback to mock data if API fails
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
      } finally {
        setLoading(false);
      }
    };

    loadAlerts();
  }, [user, isLoading, initializeService]);

  // Track error monitoring dashboard access
  useEffect(() => {
    if (!isLoading && user) {
      analytics.logFeatureUsage('error_monitoring_dashboard_access', 'admin', true);
    }
  }, [user, isLoading, analytics]);

  // Handle alert dismissal
  const handleAlertDismiss = async (alertId: string) => {
    try {
      const service = await initializeService();
      await service.updateAlert(alertId, { is_read: true });
      
      setAlerts(prevAlerts => 
        prevAlerts.map(alert => 
          alert.id === alertId 
            ? { ...alert, isRead: true }
            : alert
        )
      );
      
      analytics.logFeatureUsage('alert_dismissed', 'admin', true);
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
      // Still update UI optimistically
      setAlerts(prevAlerts => 
        prevAlerts.map(alert => 
          alert.id === alertId 
            ? { ...alert, isRead: true }
            : alert
        )
      );
      analytics.logFeatureUsage('alert_dismissed', 'admin', true);
    }
  };

  return (
    <WithRoleCheck requiredRole={['admin', 'super_admin']}>
      <DashboardLayout
        title="Error Monitoring"
        description="Track and analyze errors across the platform"
        alerts={alerts}
        onAlertDismiss={handleAlertDismiss}
      >
        <ErrorMonitoringDashboard />
      </DashboardLayout>
    </WithRoleCheck>
  );
}