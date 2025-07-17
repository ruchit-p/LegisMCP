'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  ShieldCheck, 
  User, 
  AlertCircle, 
  CheckCircle, 
  Loader2 
} from 'lucide-react';

interface AdminSetupResult {
  success: boolean;
  message: string;
  data?: {
    userId?: string;
    email: string;
    previousRole?: string;
    newRole: string;
    status?: string;
  };
}

export function AdminSetup() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'super_admin'>('admin');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AdminSetupResult | null>(null);

  const handleSetupAdmin = async () => {
    if (!email || !role) {
      setResult({
        success: false,
        message: 'Please provide both email and role'
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, role }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: data.message,
          data: data.data
        });
        setEmail(''); // Clear form on success
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to setup admin account'
        });
      }
    } catch {
      setResult({
        success: false,
        message: 'Network error. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <ShieldCheck className="h-4 w-4" />;
      case 'admin':
        return <Shield className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'admin':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Account Setup
          </CardTitle>
          <CardDescription>
            Create or update admin accounts. Only super_admin users can create other admins.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-email">Email Address</Label>
            <Input
              id="admin-email"
              type="email"
              placeholder="admin@yourdomain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-role">Role</Label>
            <Select value={role} onValueChange={(value: 'admin' | 'super_admin') => setRole(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Admin
                  </div>
                </SelectItem>
                <SelectItem value="super_admin">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Super Admin
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleSetupAdmin}
            disabled={isLoading || !email || !role}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Setup Admin Account
              </>
            )}
          </Button>

          {result && (
            <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={result.success ? 'text-green-800' : 'text-red-800'}>
                  {result.message}
                </AlertDescription>
              </div>
              
              {result.success && result.data && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Email:</span>
                    <span className="text-sm">{result.data.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">New Role:</span>
                    <Badge className={getRoleBadgeColor(result.data.newRole)}>
                      <div className="flex items-center gap-1">
                        {getRoleIcon(result.data.newRole)}
                        {result.data.newRole}
                      </div>
                    </Badge>
                  </div>
                  {result.data.previousRole && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Previous Role:</span>
                      <Badge className={getRoleBadgeColor(result.data.previousRole)}>
                        <div className="flex items-center gap-1">
                          {getRoleIcon(result.data.previousRole)}
                          {result.data.previousRole}
                        </div>
                      </Badge>
                    </div>
                  )}
                  {result.data.status === 'pending_first_login' && (
                    <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                      <strong>Note:</strong> This user will be created with admin privileges when they first log in.
                    </div>
                  )}
                </div>
              )}
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role Hierarchy</CardTitle>
          <CardDescription>
            Understanding the different admin roles and their permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <User className="h-5 w-5 text-gray-600" />
              <div>
                <div className="font-medium">User</div>
                <div className="text-sm text-gray-600">Standard user with basic access</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Shield className="h-5 w-5 text-blue-600" />
              <div>
                <div className="font-medium">Admin</div>
                <div className="text-sm text-gray-600">
                  Access to admin dashboard, user management, and analytics
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <ShieldCheck className="h-5 w-5 text-red-600" />
              <div>
                <div className="font-medium">Super Admin</div>
                <div className="text-sm text-gray-600">
                  Full system access including creating other admins
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}