import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { LogOut, ArrowLeft, Sun, Moon, User, ChevronDown, Settings } from 'lucide-react';
import { ThemeProvider, useTheme } from '@/components/ui/theme-provider';
import { ProfileModal } from './ProfileModal';
import { apiUrl } from '@/utils/api';
import { isDev47Subdomain } from '@/utils/urlUtils';
import { logoutSession, clearAuthSession, getCurrentUser } from '@/utils/authSession';
import { Loader } from '@/components/ui/loader';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface User {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  role?: string;
  is_writer?: boolean;
  created_at: string;
}

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  backTo?: string;
  allowWriter?: boolean;
}

export default function AdminLayout({ children, title, backTo = '/admin#content', allowWriter = false }: AdminLayoutProps) {
  return (
    <div className="admin-theme-wrapper">
      <ThemeProvider 
        storageKey="vs-admin-theme" 
        defaultTheme="dark"
        scoped={true}
      >
        <AdminLayoutContent children={children} title={title} backTo={backTo} allowWriter={allowWriter} />
      </ThemeProvider>
    </div>
  );
}

function AdminLayoutContent({ children, title, backTo, allowWriter }: AdminLayoutProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [currentUser, setCurrentUser] = useState<User | null>(() => getCurrentUser() as User | null);
  const [isVerifying, setIsVerifying] = useState(!currentUser);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkAdminAuth() {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      
      if (!token || !user) {
        clearAuthSession();
        setLocation('/login');
        return;
      }

      let userData: User;
      try {
        userData = JSON.parse(user);
      } catch {
        clearAuthSession();
        setLocation('/login');
        return;
      }

      let isAdmin = Boolean(userData.is_admin || userData.role === 'admin');
      let isWriter = Boolean(userData.role === 'writer' || userData.is_writer || isAdmin);

      // If user appears neither admin nor writer, double-check server profile in case role was just granted
      if (!isAdmin && !isWriter) {
        try {
          const res = await fetch(apiUrl('/api/auth/profile'), {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.status === 401) {
            clearAuthSession();
            setLocation('/login');
            return;
          }
          if (res.ok) {
            const freshData = await res.json();
            userData = freshData;
            isAdmin = Boolean(freshData.is_admin || freshData.role === 'admin');
            isWriter = Boolean(freshData.role === 'writer' || freshData.is_writer || isAdmin);
            localStorage.setItem('user', JSON.stringify(freshData));
          }
        } catch {}
      }

      // If user is a writer and not admin, handle routing to dedicated writer workspace
      if (!isAdmin) {
        const path = (window.location.pathname || '').replace(/\/+$/, '');
        if (isWriter) {
          // If the page explicitly permits writer access (like BlogEditor), do not redirect
          if (allowWriter) {
            if (isMounted) {
              setCurrentUser(userData);
              setIsVerifying(false);
            }
            return;
          }

          if (path === '/admin/blogs') {
            setLocation('/writer/blogs');
            return;
          }
          if (path === '/admin/blogs/new') {
            setLocation('/writer/blogs/new');
            return;
          }
          if (path.startsWith('/admin/blogs/edit/')) {
            const blogId = path.replace('/admin/blogs/edit/', '');
            setLocation(`/writer/blogs/edit/${blogId}`);
            return;
          }

          toast({
            title: 'Admin Privileges Required',
            description: 'Redirected to your Creator Studio.',
          });
          setLocation('/writer/blogs');
          return;
        } else {
          toast({
            title: 'Access Denied',
            description: 'You need admin privileges to view this section.',
            variant: 'destructive',
          });
          setLocation('/profile');
          return;
        }
      }

      if (isMounted) {
        setCurrentUser(userData);
        setIsVerifying(false);
      }
    }

    checkAdminAuth();

    return () => {
      isMounted = false;
    };
  }, [setLocation, toast, allowWriter]);

  const handleLogout = () => {
    logoutSession();
  };

  if (isVerifying || !currentUser) {
    return (
      <Loader size="xl" fullScreen text="Connecting to Admin Mainframe..." />
    );
  }

  const isAdmin = Boolean(currentUser.is_admin || currentUser.role === 'admin');
  const defaultBlogsRoute = isDev47Subdomain() ? '/' : '/blogs';
  const effectiveBackTo = (!isAdmin && backTo === '/admin#content') ? defaultBlogsRoute : (backTo || defaultBlogsRoute);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-secondary transition-colors duration-700 admin-theme-scope">
      <header className="sticky top-0 z-40 w-full bg-white/40 dark:bg-black/20 backdrop-blur-2xl border-b border-white/30 dark:border-white/5">
        <div className="p-3 sm:p-4 max-w-7xl mx-auto w-full">
          {/* Mobile Header - Stack vertically */}
          <div className="flex flex-col space-y-3 sm:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Link href={effectiveBackTo}>
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-cornflower-800 dark:text-cornflower-200 hover:bg-white/40 dark:hover:bg-white/5 rounded-full">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                </Link>
                <h1 className="text-lg font-bold truncate text-cornflower-900 dark:text-cornflower-50">{title}</h1>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-xs bg-cornflower-500/10 dark:bg-cornflower-500/10 text-cornflower-700 dark:text-cornflower-300 border-cornflower-200/50 dark:border-cornflower-400/20 rounded-full">
                Welcome, {currentUser.username}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="flex items-center gap-2.5 px-2 py-1.5 h-10 rounded-full border border-white/50 dark:border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-500"
                  >
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-cornflower-500 shadow-inner">
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
                <DropdownMenuContent align="end" sideOffset={8} className="w-64 bg-white/60 dark:bg-black/40 backdrop-blur-3xl border border-white/50 dark:border-white/10 shadow-2xl rounded-[2rem] p-3">
                  <DropdownMenuItem 
                    onClick={() => setProfileModalOpen(true)} 
                    className="cursor-pointer rounded-2xl hover:bg-cornflower-500/10 dark:hover:bg-cornflower-500/10 transition-colors p-3 mb-1"
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-cornflower-500/10 text-cornflower-600 dark:text-cornflower-300 mr-3 shadow-inner">
                      <Settings className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-cornflower-900 dark:text-cornflower-100">Admin Settings</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
                    className="cursor-pointer rounded-2xl hover:bg-cornflower-500/10 dark:hover:bg-cornflower-500/10 transition-colors p-3 mb-1"
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-cornflower-500/10 text-cornflower-600 dark:text-cornflower-300 mr-3 shadow-inner">
                      {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </div>
                    <span className="font-bold text-cornflower-900 dark:text-cornflower-100">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-cornflower-500/20 my-2" />
                  
                  <DropdownMenuItem 
                    onClick={handleLogout} 
                    className="cursor-pointer rounded-2xl hover:bg-cornflower-950/10 text-cornflower-950 dark:text-cornflower-200 transition-colors p-3"
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-cornflower-950/10 mr-3 shadow-inner">
                      <LogOut className="w-5 h-5" />
                    </div>
                    <span className="font-bold">Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Desktop Header - Single row */}
          <div className="hidden sm:flex h-12 items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href={effectiveBackTo}>
                <Button variant="ghost" size="sm" className="text-cornflower-800 dark:text-cornflower-200 hover:bg-white/40 dark:hover:bg-white/5 rounded-full px-4">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <h1 className="text-2xl font-black text-cornflower-900 dark:text-cornflower-50 tracking-tight">{title}</h1>
              <Badge variant="secondary" className="bg-cornflower-500/10 dark:bg-cornflower-500/10 text-cornflower-700 dark:text-cornflower-300 border-cornflower-200/50 dark:border-cornflower-400/20 rounded-full px-4 py-1">Welcome, {currentUser.username}</Badge>
            </div>
            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="flex items-center gap-2.5 px-2 py-1.5 h-11 rounded-full border border-white/50 dark:border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-500"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-cornflower-500 shadow-inner">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm font-black tracking-wide text-cornflower-900 dark:text-cornflower-100 pr-1 hidden sm:inline">
                      {currentUser.username}
                    </span>
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/40 dark:bg-white/5 border border-cornflower-200/50 dark:border-cornflower-500/10">
                      <ChevronDown className="w-3.5 h-3.5 text-cornflower-600 dark:text-cornflower-400" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={8} className="w-64 bg-white/70 dark:bg-black/40 backdrop-blur-3xl border border-white/50 dark:border-white/10 shadow-2xl rounded-[2.5rem] p-4">
                  <DropdownMenuItem 
                    onClick={() => setProfileModalOpen(true)} 
                    className="cursor-pointer rounded-[1.5rem] hover:bg-cornflower-500/10 dark:hover:bg-cornflower-500/10 transition-colors p-3 mb-2"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-cornflower-500/10 text-cornflower-600 dark:text-cornflower-300 mr-3 shadow-inner">
                      <Settings className="w-5 h-5" />
                    </div>
                    <span className="font-black text-cornflower-900 dark:text-cornflower-100">Admin Settings</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
                    className="cursor-pointer rounded-[1.5rem] hover:bg-cornflower-500/10 dark:hover:bg-cornflower-500/10 transition-colors p-3 mb-2"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-cornflower-500/10 text-cornflower-600 dark:text-cornflower-300 mr-3 shadow-inner">
                      {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </div>
                    <span className="font-black text-cornflower-900 dark:text-cornflower-100">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-cornflower-500/20 my-3" />
                  
                  <DropdownMenuItem 
                    onClick={handleLogout} 
                    className="cursor-pointer rounded-[1.5rem] hover:bg-cornflower-950/10 text-cornflower-950 dark:text-cornflower-200 transition-colors p-3"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-cornflower-950/10 mr-3 shadow-inner">
                      <LogOut className="w-5 h-5" />
                    </div>
                    <span className="font-black">Sign Out</span>
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

      {/* Profile Modal */}
      <ProfileModal 
        isOpen={profileModalOpen} 
        onClose={() => setProfileModalOpen(false)} 
      />
    </div>
  );
}
