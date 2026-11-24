import { useEffect, lazy, Suspense } from "react";
import { Route, Switch, useLocation } from "wouter";
import NotFound from "@/pages/not-found.tsx";
import Portfolio from "@/components/Portfolio";
import Login from "@/pages/Login";
import Register from "@/pages/Register"; 
import AdminDashboard from "@/pages/AdminDashboard";
import BlogPost from "@/pages/BlogPost";
import BlogHome from "@/pages/BlogHome";
import UserProfile from "@/pages/UserProfile";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import { isDev47Subdomain } from "@/utils/urlUtils";

// Lazy load admin pages
const ProjectsManagement = lazy(() => import("./pages/admin/ProjectsManagement"));
const BlogsManagement = lazy(() => import("./pages/admin/BlogsManagement"));
const CertificationsManagement = lazy(() => import("./pages/admin/CertificationsManagement"));
const AboutManagement = lazy(() => import("./pages/admin/AboutManagement"));
const ExperienceManagement = lazy(() => import("./pages/admin/ExperienceManagement"));
const TechnicalSkillsManagement = lazy(() => import("./pages/admin/TechnicalSkillsManagement"));
const BlogEditor = lazy(() => import("./pages/admin/BlogEditor"));
const WriterBlogEditor = lazy(() => import("./pages/writer/WriterBlogEditor"));
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { DelayedContent } from "@/components/ui/DelayedContent";

// Lazy load admin components with Suspense
export const withSuspense = (Component: React.ComponentType) => {
  return (
    <DelayedContent fullScreen>
      <Component />
    </DelayedContent>
  );
};

function SubdomainBlogsRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(`/${window.location.search}`);
  }, [setLocation]);
  return <BlogHome />;
}

function MainDomainBlogsRedirect() {
  useEffect(() => {
    window.location.replace(`https://dev47.amankayare.com/${window.location.search}`);
  }, []);
  return <DelayedContent fullScreen><div /></DelayedContent>;
}

function MainDomainPostRedirect({ id }: { id: string }) {
  useEffect(() => {
    window.location.replace(`https://dev47.amankayare.com/blog/${id}${window.location.search}`);
  }, [id]);
  return <DelayedContent fullScreen><div /></DelayedContent>;
}

function App() {
  const isSubdomain = isDev47Subdomain();
  const isProdMainDomain = typeof window !== 'undefined' && 
    (window.location.hostname === 'amankayare.com' || window.location.hostname === 'www.amankayare.com');

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="vs-portfolio-theme">
        <TooltipProvider>
          <Toaster />
          <Suspense fallback={<DelayedContent fullScreen><div /></DelayedContent>}>
            <Switch>
              <Route path="/login" component={Login} />
              <Route path="/register" component={Register} />
              <Route path="/forgot-password" component={ForgotPassword} />
              <Route path="/reset-password/:token" component={ResetPassword} />
              <Route path="/profile" component={UserProfile} />
              <Route path="/writer/blogs">{() => <DelayedContent><BlogsManagement isWriterMode={true} /></DelayedContent>}</Route>
              <Route path="/writer/blogs/new">{() => <DelayedContent><WriterBlogEditor /></DelayedContent>}</Route>
              <Route path="/writer/blogs/edit/:id">{() => <DelayedContent><WriterBlogEditor /></DelayedContent>}</Route>
              <Route path="/admin" component={AdminDashboard} />
              <Route path="/admin/projects">{() => <DelayedContent><ProjectsManagement /></DelayedContent>}</Route>
              <Route path="/admin/blogs">
                {() => {
                  let isPureAdmin = false;
                  try {
                    const u = JSON.parse(localStorage.getItem('user') || '{}');
                    isPureAdmin = Boolean(u.is_admin || u.role === 'admin');
                  } catch {}
                  return <DelayedContent><BlogsManagement isWriterMode={!isPureAdmin} /></DelayedContent>;
                }}
              </Route>
              <Route path="/admin/blogs/new">
                {() => {
                  let isPureAdmin = false;
                  try {
                    const u = JSON.parse(localStorage.getItem('user') || '{}');
                    isPureAdmin = Boolean(u.is_admin || u.role === 'admin');
                  } catch {}
                  return <DelayedContent>{isPureAdmin ? <BlogEditor isWriterMode={false} /> : <WriterBlogEditor />}</DelayedContent>;
                }}
              </Route>
              <Route path="/admin/blogs/edit/:id">
                {() => {
                  let isPureAdmin = false;
                  try {
                    const u = JSON.parse(localStorage.getItem('user') || '{}');
                    isPureAdmin = Boolean(u.is_admin || u.role === 'admin');
                  } catch {}
                  return <DelayedContent>{isPureAdmin ? <BlogEditor isWriterMode={false} /> : <WriterBlogEditor />}</DelayedContent>;
                }}
              </Route>
              <Route path="/admin/certifications">{() => <DelayedContent><CertificationsManagement /></DelayedContent>}</Route>
              <Route path="/admin/about">{() => <DelayedContent><AboutManagement /></DelayedContent>}</Route>
              <Route path="/admin/experience">{() => <DelayedContent><ExperienceManagement /></DelayedContent>}</Route>
              <Route path="/admin/technical-skills">{() => <DelayedContent><TechnicalSkillsManagement /></DelayedContent>}</Route>
              <Route path="/blog/:id">
                {(params) => {
                  if (isProdMainDomain) {
                    return <MainDomainPostRedirect id={params.id} />;
                  }
                  return <BlogPost />;
                }}
              </Route>
              <Route path="/blogs">
                {() => {
                  if (isSubdomain) {
                    return <SubdomainBlogsRedirect />;
                  }
                  if (isProdMainDomain) {
                    return <MainDomainBlogsRedirect />;
                  }
                  return <BlogHome />;
                }}
              </Route>
              <Route path="/">
                {() => {
                  if (isSubdomain) {
                    return <BlogHome />;
                  }
                  return <Portfolio />;
                }}
              </Route>
              <Route component={NotFound} />
            </Switch>
          </Suspense>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;