import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/hooks/use-theme';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { 
  User, 
  Lock, 
  Calendar, 
  Shield,
  Save,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  LogOut,
  Sun,
  Moon,
  Bookmark,
  BookmarkCheck,
  Clock,
  ExternalLink,
  Trash2,
  BookOpen,
  MessageSquare,
  Bell,
  Sparkles,
  ArrowRight,
  Search,
  PenTool
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiUrl, apiAssetUrl } from '@/utils/api';
import { useBookmarks, BookmarkedBlog } from '@/hooks/useBookmarks';

interface UserProfileData {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  role?: string;
  is_writer?: boolean;
  created_at: string;
  last_login: string;
}

type ProfileTab = 'profile' | 'security' | 'bookmarks' | 'activity' | 'preferences';

export default function UserProfile() {
  const { theme, setTheme } = useTheme();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Read initial tab from URL query parameter (e.g. /profile?tab=bookmarks)
  const getInitialTab = (): ProfileTab => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get('tab') as ProfileTab;
      if (['profile', 'security', 'bookmarks', 'activity', 'preferences'].includes(tabParam)) {
        return tabParam;
      }
    } catch {}
    return 'profile';
  };

  const [activeTab, setActiveTab] = useState<ProfileTab>(getInitialTab);
  const [bookmarkSearch, setBookmarkSearch] = useState('');

  // Bookmarks hook
  const { bookmarks, isBookmarked, toggleBookmark, isLoading: isLoadingBookmarks } = useBookmarks();

  // Profile state
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Fetch user profile
  const { data: user, isLoading, error } = useQuery<UserProfileData>({
    queryKey: ['user-profile'],
    queryFn: async (): Promise<UserProfileData> => {
      const token = localStorage.getItem('token');
      const response = await fetch(apiUrl('/api/auth/profile'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        toast({
          title: 'Session Expired',
          description: 'Your session has expired. Please login again.',
          variant: 'destructive',
        });
        setLocation('/login');
        throw new Error('Session expired');
      }

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      return response.json();
    },
  });

  // Update profile data when user data is loaded
  useEffect(() => {
    if (user) {
      setProfileData({
        username: user.username,
        email: user.email,
      });
      try {
        localStorage.setItem('user', JSON.stringify(user));
        if ((user as any).token) {
          localStorage.setItem('token', (user as any).token);
        }
      } catch {}
    }
  }, [user]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { username: string; email: string }) => {
      const token = localStorage.getItem('token');
      const response = await fetch(apiUrl('/api/auth/profile'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setLocation('/login');
        throw new Error('Session expired. Please login again.');
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to update profile');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Profile updated successfully',
        description: 'Your profile information has been updated.',
      });

      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = { ...currentUser, ...data.user };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
    onError: (err: Error) => {
      toast({
        title: 'Error updating profile',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const token = localStorage.getItem('token');
      const response = await fetch(apiUrl('/api/auth/change-password'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setLocation('/login');
        throw new Error('Session expired. Please login again.');
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to change password');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Password changed successfully',
        description: 'Your password has been updated.',
      });

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    },
    onError: (err: Error) => {
      toast({
        title: 'Error changing password',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData.username.trim() || !profileData.email.trim()) {
      toast({
        title: 'Validation error',
        description: 'Username and email are required.',
        variant: 'destructive',
      });
      return;
    }
    updateProfileMutation.mutate(profileData);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: 'Validation error',
        description: 'All password fields are required.',
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Validation error',
        description: 'New passwords do not match.',
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: 'Validation error',
        description: 'New password must be at least 6 characters long.',
        variant: 'destructive',
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast({
      title: 'Logged out successfully',
      description: 'You have been logged out.',
    });
    window.location.href = 'https://amankayare.com/blogs';
  };

  // Filter bookmarked blogs by search
  const filteredBookmarks = bookmarks.filter((b) => {
    if (!bookmarkSearch.trim()) return true;
    const q = bookmarkSearch.toLowerCase();
    return (
      b.title.toLowerCase().includes(q) ||
      (b.excerpt && b.excerpt.toLowerCase().includes(q)) ||
      (b.category?.name && b.category.name.toLowerCase().includes(q))
    );
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div>
          <span className="text-xs uppercase tracking-widest text-muted-foreground font-mono">Loading Profile...</span>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50 bg-card/60 backdrop-blur-xl">
          <CardContent className="pt-8 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <h3 className="text-xl font-bold">Error Loading Profile</h3>
            <p className="text-muted-foreground text-sm">Failed to load your account information.</p>
            <Button
              onClick={() => setLocation('/blogs')}
              className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blogs
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Navigation Items Definition for Scalable Vertical Menu
  const navItems = [
    {
      id: 'profile' as ProfileTab,
      label: 'Profile Information',
      description: 'Personal details and email',
      icon: User,
    },
    {
      id: 'security' as ProfileTab,
      label: 'Security & Password',
      description: 'Password and credentials',
      icon: Lock,
    },
    {
      id: 'bookmarks' as ProfileTab,
      label: 'Read Later',
      description: 'Saved articles queue',
      icon: Bookmark,
      badge: bookmarks.length > 0 ? bookmarks.length : undefined,
    },
    {
      id: 'activity' as ProfileTab,
      label: 'Activity & Comments',
      description: 'Your discussion history',
      icon: MessageSquare,
      comingSoon: true,
    },
    {
      id: 'preferences' as ProfileTab,
      label: 'Preferences',
      description: 'Notifications & digest',
      icon: Bell,
      comingSoon: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background hero-squares">
      {/* Sticky Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/blogs')}
            className="text-cyan-400 hover:bg-cyan-500/10 font-bold rounded-full px-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blogs
          </Button>

          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2.5 px-3 py-1.5 h-10 rounded-full border border-border/50 bg-background/50 backdrop-blur-md shadow-sm hover:border-cyan-500/30 transition-all duration-300"
                >
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-inner text-white font-bold text-xs">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold tracking-wide text-foreground">
                    {user.username}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover/95 backdrop-blur-xl border-border/50 rounded-2xl p-2 shadow-2xl">
                <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border/50">
                  Signed in as <strong className="text-foreground">{user.email}</strong>
                </div>
                <DropdownMenuItem
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="cursor-pointer rounded-xl hover:bg-cyan-500/10 transition-colors p-2 mt-1"
                >
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-cyan-500/10 text-cyan-400 mr-2.5">
                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </div>
                  <span className="font-medium text-sm">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/50 my-1" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer rounded-xl hover:bg-destructive/10 text-destructive transition-colors p-2"
                >
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-destructive/10 mr-2.5">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-sm">Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Container with 2-Column Vertical Nav Layout */}
      <main className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Page Title */}
        <div className="mb-8 space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Account Dashboard
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            Settings & Workspace
          </h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Manage your credentials, preferences, and saved reading list across the platform.
          </p>
        </div>

        {/* Mobile Horizontal Pill Selector */}
        <div className="lg:hidden mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  isActive
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400 shadow-sm'
                    : 'bg-card/40 border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
                {item.badge !== undefined && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-cyan-500 text-black font-black">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Desktop 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Vertical Navigation Sidebar */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            {/* User Identity Micro-Card */}
            <div className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 border-2 border-cyan-500/30 ring-4 ring-cyan-500/10">
                  <AvatarFallback className="bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white font-black text-xl">
                    {user.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-lg text-foreground tracking-tight truncate">
                      {user.username}
                    </h2>
                    {user.is_admin ? (
                      <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[10px] px-2 py-0.5 font-bold">
                        <Shield className="w-3 h-3 mr-1" />
                        Admin
                      </Badge>
                    ) : (user.role === 'writer' || user.is_writer) ? (
                      <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] px-2 py-0.5 font-bold">
                        ✍️ Writer
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  <p className="text-[11px] text-muted-foreground/80 flex items-center gap-1 font-mono pt-1">
                    <Calendar className="w-3 h-3 text-cyan-500/70" />
                    Joined {formatDate(user.created_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Writer & Admin Quick Portal */}
            {(user.is_admin || user.role === 'writer' || user.is_writer) && (
              <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-5 space-y-2.5 backdrop-blur-md shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <Sparkles className="w-4 h-4" />
                  Creator Studio
                </div>
                <p className="text-xs text-muted-foreground">
                  You are authorized to publish and compose articles on Dev47.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLocation(user.is_admin ? '/admin/blogs' : '/writer/blogs')}
                    className="rounded-xl border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 font-bold text-xs"
                  >
                    {user.is_admin ? 'All Blogs' : 'My Articles'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setLocation('/writer/blogs/new')}
                    className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    New Post
                  </Button>
                </div>
              </div>
            )}

            {/* Vertical Navigation Menu */}
            <div className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md p-3 shadow-sm space-y-1.5">
              <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">
                Navigation
              </div>

              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full group flex items-center justify-between p-3 rounded-xl transition-all duration-200 text-left border ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/5 border-cyan-500/40 text-foreground shadow-sm shadow-cyan-500/10'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-cyan-500/20 text-cyan-400'
                            : 'bg-muted/50 text-muted-foreground group-hover:text-foreground group-hover:bg-muted'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate flex items-center gap-2">
                          {item.label}
                          {item.comingSoon && (
                            <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                              Soon
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground/80 truncate">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    {item.badge !== undefined && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-500 text-black shadow-sm">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Action Signout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border border-border/40 bg-card/20 hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive text-muted-foreground text-xs font-bold uppercase tracking-wider transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out of Dev47
            </button>
          </aside>

          {/* Right Column: Active View Canvas */}
          <div className="lg:col-span-8 space-y-6">
            {/* VIEW 1: Profile Information */}
            {activeTab === 'profile' && (
              <Card className="rounded-2xl border-border/50 bg-card/40 backdrop-blur-md shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold tracking-tight">Profile Information</CardTitle>
                      <CardDescription className="text-xs">
                        Update your public display identity and contact email address.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <form onSubmit={handleProfileSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Username
                      </Label>
                      <Input
                        id="username"
                        type="text"
                        value={profileData.username}
                        onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                        placeholder="Your unique handle"
                        className="rounded-xl bg-background/50 border-border/60 focus:border-cyan-500/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        placeholder="you@example.com"
                        className="rounded-xl bg-background/50 border-border/60 focus:border-cyan-500/50"
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                        className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold px-6 shadow-lg shadow-cyan-500/20"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {updateProfileMutation.isPending ? 'Saving Changes...' : 'Save Profile Changes'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* VIEW 2: Security & Password */}
            {activeTab === 'security' && (
              <Card className="rounded-2xl border-border/50 bg-card/40 backdrop-blur-md shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold tracking-tight">Security & Credentials</CardTitle>
                      <CardDescription className="text-xs">
                        Keep your account protected with a strong, updated password.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <form onSubmit={handlePasswordSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Current Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showPasswords.current ? 'text' : 'password'}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                          placeholder="Enter your current password"
                          className="rounded-xl bg-background/50 border-border/60 pr-10 focus:border-cyan-500/50"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                        >
                          {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        New Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showPasswords.new ? 'text' : 'password'}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                          placeholder="At least 6 characters"
                          className="rounded-xl bg-background/50 border-border/60 pr-10 focus:border-cyan-500/50"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                        >
                          {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Confirm New Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showPasswords.confirm ? 'text' : 'password'}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                          placeholder="Re-type your new password"
                          className="rounded-xl bg-background/50 border-border/60 pr-10 focus:border-cyan-500/50"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                        >
                          {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        type="submit"
                        disabled={changePasswordMutation.isPending}
                        className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold px-6 shadow-lg shadow-cyan-500/20"
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        {changePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* VIEW 3: Read Later (Bookmarks) */}
            {activeTab === 'bookmarks' && (
              <div className="space-y-6">
                <Card className="rounded-2xl border-border/50 bg-card/40 backdrop-blur-md shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
                          <Bookmark className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-xl font-bold tracking-tight">Read Later Queue</CardTitle>
                            <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 font-bold">
                              {bookmarks.length} {bookmarks.length === 1 ? 'article' : 'articles'}
                            </Badge>
                          </div>
                          <CardDescription className="text-xs">
                            Articles you have saved to read at your convenience.
                          </CardDescription>
                        </div>
                      </div>

                      {bookmarks.length > 0 && (
                        <div className="relative w-full sm:w-64">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Filter saved articles..."
                            value={bookmarkSearch}
                            onChange={(e) => setBookmarkSearch(e.target.value)}
                            className="rounded-xl bg-background/50 border-border/60 pl-9 text-xs"
                          />
                        </div>
                      )}
                    </div>
                  </CardHeader>
                </Card>

                {/* Bookmarks List */}
                {isLoadingBookmarks ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-32 rounded-2xl bg-card/40 border border-border/40 animate-pulse" />
                    ))}
                  </div>
                ) : bookmarks.length === 0 ? (
                  /* Empty State */
                  <Card className="rounded-2xl border-border/50 bg-card/30 backdrop-blur-md p-10 text-center">
                    <div className="max-w-md mx-auto space-y-4">
                      <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                        <Bookmark className="w-7 h-7" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold text-foreground">No Saved Articles Yet</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          When you encounter interesting posts on Dev47, tap the bookmark icon to queue them up here for later reading.
                        </p>
                      </div>
                      <div className="pt-2">
                        <Button
                          onClick={() => setLocation('/blogs')}
                          className="rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold gap-2 shadow-lg shadow-cyan-500/20"
                        >
                          <BookOpen className="w-4 h-4" />
                          Explore Blog Feed
                        </Button>
                      </div>
                    </div>
                  </Card>
                ) : filteredBookmarks.length === 0 ? (
                  <Card className="rounded-2xl border-border/50 bg-card/30 backdrop-blur-md p-8 text-center">
                    <p className="text-sm text-muted-foreground">No bookmarked articles matched &quot;{bookmarkSearch}&quot;.</p>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {filteredBookmarks.map((blog) => (
                      <div
                        key={blog.id}
                        className="group relative rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md p-5 hover:border-cyan-500/30 transition-all duration-300 shadow-sm flex flex-col sm:flex-row gap-5 items-start"
                      >
                        {/* Cover Image Thumbnail */}
                        {blog.cover_image ? (
                          <div className="w-full sm:w-40 sm:h-28 aspect-video sm:aspect-auto rounded-xl overflow-hidden bg-muted flex-shrink-0 border border-border/40">
                            <img
                              src={apiAssetUrl(blog.cover_image)}
                              alt={blog.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          </div>
                        ) : (
                          <div className="w-full sm:w-40 sm:h-28 aspect-video sm:aspect-auto rounded-xl bg-gradient-to-br from-cyan-950/40 via-blue-950/30 to-purple-950/40 flex items-center justify-center flex-shrink-0 border border-border/40">
                            <BookOpen className="w-8 h-8 text-cyan-500/40" />
                          </div>
                        )}

                        {/* Article Info */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {blog.category && (
                              <Badge variant="outline" className="text-[10px] uppercase font-bold border-cyan-500/30 text-cyan-400 bg-cyan-500/5 px-2 py-0.5 rounded-md">
                                {blog.category.name}
                              </Badge>
                            )}
                            {blog.reading_time && (
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                                <Clock className="w-3 h-3 text-cyan-400" />
                                {blog.reading_time} min read
                              </span>
                            )}
                          </div>

                          <h3
                            onClick={() => window.open(`/blog/${blog.id}`, '_blank')}
                            className="font-bold text-base text-foreground group-hover:text-cyan-400 transition-colors line-clamp-2 cursor-pointer leading-snug"
                          >
                            {blog.title}
                          </h3>

                          {blog.excerpt && (
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {blog.excerpt}
                            </p>
                          )}

                          {/* Action Links */}
                          <div className="pt-2 flex items-center gap-3">
                            <Button
                              size="sm"
                              onClick={() => window.open(`/blog/${blog.id}`, '_blank')}
                              className="rounded-xl bg-cyan-500/10 hover:bg-cyan-500 hover:text-black text-cyan-400 text-xs font-bold h-8 px-3.5 border border-cyan-500/30 gap-1.5 transition-all"
                            >
                              <span>Read Post</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleBookmark(blog)}
                              className="rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs h-8 px-3 gap-1.5 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* VIEW 4: Future Placeholder (Activity) */}
            {activeTab === 'activity' && (
              <Card className="rounded-2xl border-border/50 bg-card/40 backdrop-blur-md p-10 text-center">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <MessageSquare className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-foreground">Discussion Activity Hub</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      This space will soon aggregate all your blog comments, community replies, and discussions in one unified stream.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* VIEW 5: Future Placeholder (Preferences) */}
            {activeTab === 'preferences' && (
              <Card className="rounded-2xl border-border/50 bg-card/40 backdrop-blur-md p-10 text-center">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Bell className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-foreground">Notification & Email Preferences</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Customise your newsletter subscriptions, article digest frequency, and security alerts.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
