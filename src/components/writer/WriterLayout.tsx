import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { LogOut, ArrowLeft, Sun, Moon, User, ChevronDown, Settings, BookOpen, PenTool, LayoutDashboard } from 'lucide-react';
import { ThemeProvider, useTheme } from '@/components/ui/theme-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiUrl } from '@/utils/api';

interface UserData {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  role?: string;
  is_writer?: boolean;
  created_at: string;
}

interface WriterLayoutProps {
  children: React.ReactNode;
  title: string;
  backTo?: string;
}

export default function WriterLayout({ children, title, backTo = '/profile' }: WriterLayoutProps) {
  return (
    <div className="admin-theme-wrapper">
      <ThemeProvider 
        storageKey="vs-writer-theme" 
        defaultTheme="dark"
        scoped={true}
      >
        <WriterLayoutContent children={children} title={title} backTo={backTo} />
      </ThemeProvider>
    </div>
  );
}

function WriterLayoutContent({ children, title, backTo = '/profile' }: WriterLayoutProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function checkWriterAuth() {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      if (!token || !userStr) {
        setLocation('/login');
        return;
      }

      let userData: UserData;
      try {
        userData = JSON.parse(userStr);
      } catch {
        setLocation('/login');
        return;
      }

      const isAdmin = Boolean(userData.is_admin || userData.role === 'admin');
      const isWriter = Boolean(userData.role === 'writer' || userData.is_writer || isAdmin);

      if (isWriter) {
        if (isMounted) {
          setCurrentUser(userData);
          setIsVerifying(false);
        }
        return;
      }

      // If localStorage says not writer, verify with API in case role was recently updated
      try {
        const res = await fetch(apiUrl('/api/auth/profile'), {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (res.ok) {
          const freshData = await res.json();
          const freshIsAdmin = Boolean(freshData.is_admin || freshData.role === 'admin');
          const freshIsWriter = Boolean(freshData.role === 'writer' || freshData.is_writer || freshIsAdmin);

          if (freshIsWriter) {
            localStorage.setItem('user', JSON.stringify(freshData));
            if (freshData.token) {
              localStorage.setItem('token', freshData.token);
            }
            if (isMounted) {
              setCurrentUser(freshData);
              setIsVerifying(false);
            }
            return;
          }
        }
      } catch (err) {
        console.error('Failed to sync writer profile', err);
      }

      if (isMounted) {
        toast({
          title: 'Writer Access Required',
          description: 'You need writer authorization to access the Creator Studio.',
          variant: 'destructive',
        });
        setLocation('/profile');
      }
    }

    checkWriterAuth();

    return () => {
      isMounted = false;
    };
  }, [setLocation, toast]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setLocation('/');
  };

  if (isVerifying || !currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-card to-secondary flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-cornflower-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isAdmin = Boolean(currentUser.is_admin || currentUser.role === 'admin');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-secondary transition-colors duration-700 admin-theme-scope">
      <header className="sticky top-0 z-40 w-full bg-white/40 dark:bg-black/20 backdrop-blur-2xl border-b border-white/30 dark:border-white/5">
        <div className="p-3 sm:p-4 max-w-7xl mx-auto w-full">
          {/* Mobile Header */}
          <div className="flex flex-col space-y-3 sm:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Link href={backTo}>
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-cornflower-800 dark:text-cornflower-200 hover:bg-white/40 dark:hover:bg-white/5 rounded-full">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                </Link>
                <h1 className="text-lg font-bold truncate text-cornflower-900 dark:text-cornflower-50">{title}</h1>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 rounded-full px-3 py-0.5">
                ✍️ {isAdmin ? 'Admin' : 'Writer'}: {currentUser.username}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="flex items-center gap-2.5 px-2 py-1.5 h-10 rounded-full border border-white/50 dark:border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-500"
                  >
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500 shadow-inner">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-bold tracking-wide text-cornflower-900 dark:text-cornflower-100 pr-1 hidden sm:inline">
                      {currentUser.username}
                    </span>
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10">
                      <ChevronDown className="w-3 h-3 text-cornflower-600 dark:text-cornflower-400" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={8} className="w-64 bg-white/80 dark:bg-black/70 backdrop-blur-3xl border border-white/50 dark:border-white/10 shadow-2xl rounded-[2rem] p-3">
                  <DropdownMenuItem 
                    onClick={() => setLocation('/writer/blogs')} 
                    className="cursor-pointer rounded-2xl hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 transition-colors p-3 mb-1"
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-500/10 mr-3 shadow-inner">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <span className="font-bold">My Articles</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem 
                    onClick={() => setLocation('/writer/blogs/new')} 
                    className="cursor-pointer rounded-2xl hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 transition-colors p-3 mb-1"
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-500/10 mr-3 shadow-inner">
                      <PenTool className="w-4 h-4" />
                    </div>
                    <span className="font-bold">New Post</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem 
                    onClick={() => setLocation('/profile')} 
                    className="cursor-pointer rounded-2xl hover:bg-cornflower-500/10 dark:hover:bg-cornflower-500/10 transition-colors p-3 mb-1"
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-cornflower-500/10 text-cornflower-600 dark:text-cornflower-300 mr-3 shadow-inner">
                      <Settings className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-cornflower-900 dark:text-cornflower-100">Profile Settings</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem 
                    onClick={() => setLocation('/blogs')} 
                    className="cursor-pointer rounded-2xl hover:bg-cornflower-500/10 dark:hover:bg-cornflower-500/10 transition-colors p-3 mb-1"
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-cornflower-500/10 text-cornflower-600 dark:text-cornflower-300 mr-3 shadow-inner">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-cornflower-900 dark:text-cornflower-100">Dev47 Blogs</span>
                  </DropdownMenuItem>

                  {isAdmin && (
                    <DropdownMenuItem 
                      onClick={() => setLocation('/admin')} 
                      className="cursor-pointer rounded-2xl hover:bg-cornflower-500/10 dark:hover:bg-cornflower-500/10 transition-colors p-3 mb-1"
                    >
                      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-cornflower-500/10 text-cornflower-600 dark:text-cornflower-300 mr-3 shadow-inner">
                        <LayoutDashboard className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-cornflower-900 dark:text-cornflower-100">Admin Dashboard</span>
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuItem 
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
                    className="cursor-pointer rounded-2xl hover:bg-cornflower-500/10 dark:hover:bg-cornflower-500/10 transition-colors p-3 mb-1"
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-cornflower-500/10 text-cornflower-600 dark:text-cornflower-300 mr-3 shadow-inner">
                      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </div>
                    <span className="font-bold text-cornflower-900 dark:text-cornflower-100">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-cornflower-500/20 my-2" />
                  
                  <DropdownMenuItem 
                    onClick={handleLogout} 
                    className="cursor-pointer rounded-2xl hover:bg-red-500/10 text-red-600 dark:text-red-400 transition-colors p-3"
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-red-500/10 mr-3 shadow-inner">
                      <LogOut className="w-4 h-4" />
                    </div>
                    <span className="font-bold">Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden sm:flex h-12 items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href={backTo}>
                <Button variant="ghost" size="sm" className="text-cornflower-800 dark:text-cornflower-200 hover:bg-white/40 dark:hover:bg-white/5 rounded-full px-4 font-bold">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <h1 className="text-2xl font-black text-cornflower-900 dark:text-cornflower-50 tracking-tight">{title}</h1>
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 rounded-full px-4 py-1 font-semibold text-xs">
                ✍️ {isAdmin ? 'Admin' : 'Writer'}: {currentUser.username}
              </Badge>
            </div>
            <div className="flex items-center space-x-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="flex items-center gap-2.5 px-3 py-1.5 h-11 rounded-full border border-white/50 dark:border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-500"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 shadow-inner">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm font-black tracking-wide text-cornflower-900 dark:text-cornflower-100 pr-1">
                      {currentUser.username}
                    </span>
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/40 dark:bg-white/5 border border-cornflower-200/50 dark:border-cornflower-500/10">
                      <ChevronDown className="w-3.5 h-3.5 text-cornflower-600 dark:text-cornflower-400" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={8} className="w-64 bg-white/80 dark:bg-black/70 backdrop-blur-3xl border border-white/50 dark:border-white/10 shadow-2xl rounded-[2rem] p-3">
                  <DropdownMenuItem 
                    onClick={() => setLocation('/writer/blogs')} 
                    className="cursor-pointer rounded-2xl hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 transition-colors p-3 mb-1"
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-500/10 mr-3 shadow-inner">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <span className="font-bold">My Articles</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem 
                    onClick={() => setLocation('/writer/blogs/new')} 
                    className="cursor-pointer rounded-2xl hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 transition-colors p-3 mb-1"
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-500/10 mr-3 shadow-inner">
                      <PenTool className="w-4 h-4" />
                    </div>
                    <span className="font-bold">New Post</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem 
                    onClick={() => setLocation('/profile')} 
                    className="cursor-pointer rounded-2xl hover:bg-cornflower-500/10 dark:hover:bg-cornflower-500/10 transition-colors p-3 mb-1"
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-cornflower-500/10 text-cornflower-600 dark:text-cornflower-300 mr-3 shadow-inner">
                      <Settings className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-cornflower-900 dark:text-cornflower-100">Profile Settings</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem 
                    onClick={() => setLocation('/blogs')} 
                    className="cursor-pointer rounded-2xl hover:bg-cornflower-500/10 dark:hover:bg-cornflower-500/10 transition-colors p-3 mb-1"
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-cornflower-500/10 text-cornflower-600 dark:text-cornflower-300 mr-3 shadow-inner">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-cornflower-900 dark:text-cornflower-100">Dev47 Blogs</span>
                  </DropdownMenuItem>

                  {isAdmin && (
                    <DropdownMenuItem 
                      onClick={() => setLocation('/admin')} 
                      className="cursor-pointer rounded-2xl hover:bg-cornflower-500/10 dark:hover:bg-cornflower-500/10 transition-colors p-3 mb-1"
                    >
                      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-cornflower-500/10 text-cornflower-600 dark:text-cornflower-300 mr-3 shadow-inner">
                        <LayoutDashboard className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-cornflower-900 dark:text-cornflower-100">Admin Dashboard</span>
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuItem 
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
                    className="cursor-pointer rounded-2xl hover:bg-cornflower-500/10 dark:hover:bg-cornflower-500/10 transition-colors p-3 mb-1"
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-cornflower-500/10 text-cornflower-600 dark:text-cornflower-300 mr-3 shadow-inner">
                      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </div>
                    <span className="font-bold text-cornflower-900 dark:text-cornflower-100">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-cornflower-500/20 my-2" />
                  
                  <DropdownMenuItem 
                    onClick={handleLogout} 
                    className="cursor-pointer rounded-2xl hover:bg-red-500/10 text-red-600 dark:text-red-400 transition-colors p-3"
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-red-500/10 mr-3 shadow-inner">
                      <LogOut className="w-4 h-4" />
                    </div>
                    <span className="font-bold">Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-col items-center min-h-[80vh] py-4 sm:py-8 px-2 sm:px-4">
        <div className="w-full max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
