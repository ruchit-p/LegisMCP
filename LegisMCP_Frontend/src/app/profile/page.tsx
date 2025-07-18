'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  Trash2,
  Save,
  Edit,
  AlertTriangle,
  CheckCircle,
  Camera
} from 'lucide-react';

// MARK: - Types

interface UserProfile {
  id: string;
  email: string;
  name?: string;
  nickname?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  emailVerified: boolean;
  updatedAt: string;
  user_metadata?: Record<string, unknown>;
}

interface ProfileFormData {
  name: string;
  nickname: string;
  given_name: string;
  family_name: string;
  picture: string;
}

// MARK: - Profile Page Component

/**
 * Professional profile page for user account management.
 * Allows users to view, edit their details, and delete their account.
 */
export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    nickname: '',
    given_name: '',
    family_name: '',
    picture: ''
  });

  // MARK: - Data Loading

  /**
   * Loads the user profile from the API
   */
  const loadProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/user/profile');
      
      if (!response.ok) {
        throw new Error('Failed to load profile');
      }
      
      const data = await response.json();
      setProfile(data.profile);
      
      // Initialize form data
      setFormData({
        name: data.profile.name || '',
        nickname: data.profile.nickname || '',
        given_name: data.profile.given_name || '',
        family_name: data.profile.family_name || '',
        picture: data.profile.picture || ''
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (session?.user && status !== 'loading') {
      loadProfile();
    }
  }, [session, status, loadProfile]);

  // MARK: - Form Handlers

  /**
   * Handles form input changes
   */
  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /**
   * Saves profile changes
   */
  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }
      
      const data = await response.json();
      setProfile(data.profile);
      setIsEditing(false);
      
      toast({
        title: "Success",
        description: "Profile updated successfully!",
        variant: "default",
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Cancels profile editing
   */
  const handleCancelEdit = () => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        nickname: profile.nickname || '',
        given_name: profile.given_name || '',
        family_name: profile.family_name || '',
        picture: profile.picture || ''
      });
    }
    setIsEditing(false);
  };

  /**
   * Handles account deletion
   */
  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      
      const response = await fetch('/api/user/profile', {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete account');
      }
      
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
        variant: "default",
      });
      
      // Sign out and redirect
      router.push('/api/auth/signout');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete account",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // MARK: - Render Helpers

  /**
   * Renders the profile avatar
   */
  const renderAvatar = () => (
    <div className="relative">
      <Avatar className="w-24 h-24">
        {profile?.picture ? (
          <Image
            src={profile.picture}
            alt={profile.name || profile.email}
            width={96}
            height={96}
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
            {(profile?.name?.[0] || profile?.email?.[0] || 'U').toUpperCase()}
          </div>
        )}
      </Avatar>
      {isEditing && (
        <Button
          size="icon"
          variant="outline"
          className="absolute -bottom-2 -right-2 rounded-full w-8 h-8"
          onClick={() => {
            // TODO: Implement profile picture upload
            toast({
              title: "Coming Soon",
              description: "Profile picture upload will be available soon.",
              variant: "default",
            });
          }}
        >
          <Camera className="w-4 h-4" />
        </Button>
      )}
    </div>
  );

  /**
   * Renders a form field
   */
  const renderFormField = (
    label: string,
    field: keyof ProfileFormData,
    placeholder: string,
    icon: React.ReactNode
  ) => (
    <div className="space-y-2">
      <Label htmlFor={field} className="flex items-center gap-2">
        {icon}
        {label}
      </Label>
      {isEditing ? (
        <Input
          id={field}
          value={formData[field]}
          onChange={(e) => handleInputChange(field, e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <div className="p-3 bg-muted rounded-md">
          {formData[field] || <span className="text-muted-foreground">Not set</span>}
        </div>
      )}
    </div>
  );

  // MARK: - Loading State

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // MARK: - Authentication Check

  if (!session?.user) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>
                Please sign in to access your profile.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <a href="/api/auth/signin">Sign In</a>
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
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
            <p className="text-muted-foreground mt-2">
              Manage your account settings and preferences.
            </p>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Security
              </TabsTrigger>
              <TabsTrigger value="danger" className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Account
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Personal Information
                    {!isEditing ? (
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSaveProfile}
                          disabled={isSaving}
                          className="flex items-center gap-2"
                        >
                          {isSaving ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          Save
                        </Button>
                      </div>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Update your personal information and profile details.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar and Basic Info */}
                  <div className="flex items-center gap-6">
                    {renderAvatar()}
                    <div className="flex-1 space-y-1">
                      <h3 className="text-lg font-semibold">
                        {profile?.name || 'No name set'}
                      </h3>
                      <p className="text-muted-foreground flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {profile?.email}
                      </p>
                      <div className="flex items-center gap-2">
                        {profile?.emailVerified ? (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Unverified
                          </Badge>
                        )}
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Updated {new Date(profile?.updatedAt || '').toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderFormField(
                      "Display Name",
                      "name",
                      "Enter your display name",
                      <User className="h-4 w-4" />
                    )}
                    {renderFormField(
                      "Nickname",
                      "nickname",
                      "Enter your nickname",
                      <User className="h-4 w-4" />
                    )}
                    {renderFormField(
                      "First Name",
                      "given_name",
                      "Enter your first name",
                      <User className="h-4 w-4" />
                    )}
                    {renderFormField(
                      "Last Name",
                      "family_name",
                      "Enter your last name",
                      <User className="h-4 w-4" />
                    )}
                  </div>

                  {isEditing && (
                    <div className="space-y-2">
                      <Label htmlFor="picture" className="flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        Profile Picture URL
                      </Label>
                      <Input
                        id="picture"
                        value={formData.picture}
                        onChange={(e) => handleInputChange('picture', e.target.value)}
                        placeholder="https://example.com/your-photo.jpg"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter a URL to your profile picture, or leave blank to use the default avatar.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Manage your account security and authentication.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <div className="font-medium">Email Verification</div>
                        <div className="text-sm text-muted-foreground">
                          {profile?.emailVerified 
                            ? 'Your email address is verified'
                            : 'Please verify your email address'
                          }
                        </div>
                      </div>
                      <Badge variant={profile?.emailVerified ? 'secondary' : 'destructive'}>
                        {profile?.emailVerified ? 'Verified' : 'Unverified'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <div className="font-medium">Password</div>
                        <div className="text-sm text-muted-foreground">
                          Manage your password through Auth0
                        </div>
                      </div>
                      <Button variant="outline" asChild>
                        <a 
                          href={`https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/u/reset-password`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Change Password
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Danger Zone Tab */}
            <TabsContent value="danger" className="space-y-6">
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                  <CardDescription>
                    Irreversible and destructive actions for your account.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/5">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                        <div className="flex-1 space-y-2">
                          <h4 className="font-semibold text-destructive">Delete Account</h4>
                          <p className="text-sm text-muted-foreground">
                            Permanently delete your account and all associated data. This action cannot be undone.
                          </p>
                          <div className="text-sm text-muted-foreground">
                            <strong>This will delete:</strong>
                            <ul className="list-disc list-inside mt-1 space-y-1">
                              <li>Your profile and account information</li>
                              <li>All API keys and access tokens</li>
                              <li>Usage history and analytics data</li>
                              <li>All subscription and billing information</li>
                            </ul>
                          </div>
                          
                          {!showDeleteConfirm ? (
                            <Button
                              variant="destructive"
                              onClick={() => setShowDeleteConfirm(true)}
                              className="mt-4"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Account
                            </Button>
                          ) : (
                            <div className="mt-4 space-y-3">
                              <p className="text-sm font-medium text-destructive">
                                Are you absolutely sure? This action cannot be undone.
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  variant="destructive"
                                  onClick={handleDeleteAccount}
                                  disabled={isDeleting}
                                  className="flex items-center gap-2"
                                >
                                  {isDeleting ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                  Yes, Delete Account
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setShowDeleteConfirm(false)}
                                  disabled={isDeleting}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
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