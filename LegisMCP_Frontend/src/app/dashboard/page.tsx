"use client"

import React, { useState, useEffect } from 'react';

// MARK: - Types
interface ApiKey {
  isActive: boolean;
}
import { useSession } from 'next-auth/react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UsageTracker } from '@/components/dashboard/usage-tracker';
import { SubscriptionManager } from '@/components/dashboard/subscription-manager';
import { MCPUsageDisplay } from '@/components/dashboard/mcp-usage-display';
import { ComingSoonFeature } from '@/components/ui/coming-soon-feature';
import { 
  Key, 
  BarChart3, 
  Settings, 
  CreditCard,
  User,
  Shield,
  Activity
} from 'lucide-react';

// MARK: - Dashboard Page

/**
 * Main dashboard page for authenticated users.
 * Provides access to API key management and usage tracking.
 */
export default function DashboardPage() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const isLoading = status === 'loading';
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState<{
    activeKeys: number;
    monthlyRequests: number;
    avgResponseTime: number;
    planName: string;
  } | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Load dashboard data when user is authenticated
  useEffect(() => {
    if (user && !isLoading) {
      loadDashboardData();
    }
  }, [user, isLoading]);

  /**
   * Loads overview data for the dashboard.
   */
  const loadDashboardData = async () => {
    try {
      const [keysResponse, usageResponse] = await Promise.all([
        fetch('/api/keys'),
        fetch('/api/usage?days=30')
      ]);

      if (keysResponse.ok && usageResponse.ok) {
        const keysData = await keysResponse.json();
        const usageData = await usageResponse.json();

        setDashboardData({
          activeKeys: keysData.keys?.filter((k: ApiKey) => k.isActive).length || 0,
          monthlyRequests: usageData.usage?.current || 0,
          avgResponseTime: Math.round(usageData.stats?.avgResponseTime || 0),
          planName: usageData.usage?.planName || 'Free'
        });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>
                Please sign in to access your dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <a href="/api/auth/login">Sign In</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <div className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {user.name || user.email}
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your API keys and monitor usage of the LegislativeMCP server platform.
            </p>
          </div>

          {/* Dashboard Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="subscription" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Subscription
              </TabsTrigger>
              <TabsTrigger value="keys" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                API Keys
              </TabsTrigger>
              <TabsTrigger value="usage" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Usage
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Active API Keys
                    </CardTitle>
                    <Key className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {isLoadingData ? (
                        <div className="animate-pulse h-8 w-8 bg-muted rounded"></div>
                      ) : (
                        dashboardData?.activeKeys || 0
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Keys in use
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      This Month
                    </CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {isLoadingData ? (
                        <div className="animate-pulse h-8 w-16 bg-muted rounded"></div>
                      ) : (
                        (dashboardData?.monthlyRequests || 0).toLocaleString()
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      API requests
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Response Time
                    </CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {isLoadingData ? (
                        <div className="animate-pulse h-8 w-12 bg-muted rounded"></div>
                      ) : (
                        dashboardData?.avgResponseTime ? `${dashboardData.avgResponseTime}ms` : '-'
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Average ms
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Plan Status
                    </CardTitle>
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {isLoadingData ? (
                        <div className="animate-pulse h-8 w-20 bg-muted rounded"></div>
                      ) : (
                        dashboardData?.planName || 'Free'
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Subscription
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <ComingSoonFeature
                title="Quick Actions - API Key Generation"
                description="Generate and manage API keys with one click. This feature will make it super easy to get started with our API."
                icon={<Key className="h-5 w-5" />}
                showDetailedStats={true}
              />
              
              <Card>
                <CardHeader>
                  <CardTitle>Available Actions</CardTitle>
                  <CardDescription>
                    Current actions you can take right now.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                  <Button variant="outline" onClick={() => setActiveTab('usage')}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Usage
                  </Button>
                  <Button variant="outline" onClick={() => setActiveTab('subscription')}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Manage Subscription
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Subscription Tab */}
            <TabsContent value="subscription">
              <SubscriptionManager onSubscriptionUpdate={loadDashboardData} />
            </TabsContent>

            {/* API Keys Tab */}
            <TabsContent value="keys" className="space-y-6">
              <ComingSoonFeature
                title="API Key Management"
                description="Generate and manage API keys for accessing the LegislativeMCP server API. Keep your keys secure and never share them publicly."
                icon={<Key className="h-5 w-5" />}
                showDetailedStats={true}
              />
              
              <ComingSoonFeature
                title="API Key Usage Instructions"
                description="Step-by-step guide on how to authenticate with the LegislativeMCP server using your API key, including environment variable setup and MCP server configuration."
                icon={<Shield className="h-5 w-5" />}
                showDetailedStats={false}
              />
            </TabsContent>

            {/* Usage Tab */}
            <TabsContent value="usage" className="space-y-6">
              <MCPUsageDisplay />
              <UsageTracker />
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                  <CardDescription>
                    Manage your account preferences and subscription.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="font-medium">Profile</div>
                      <div className="text-sm text-muted-foreground">
                        Update your profile information
                      </div>
                    </div>
                    <Button variant="outline" asChild>
                      <a href="/profile">
                        <User className="h-4 w-4 mr-2" />
                        Edit Profile
                      </a>
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="font-medium">Billing</div>
                      <div className="text-sm text-muted-foreground">
                        Manage your subscription and billing
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => setActiveTab('subscription')}>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Manage Billing
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 