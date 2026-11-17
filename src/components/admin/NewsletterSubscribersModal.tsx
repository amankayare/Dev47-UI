import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost } from '@/utils/api';
import {
  Users,
  Send,
  CheckCircle2,
  Clock,
  UserX,
  Mail,
  Loader2,
  Sparkles,
  RefreshCw,
  Eye,
  Code2,
} from 'lucide-react';

interface Subscriber {
  id: number;
  email: string;
  status: 'pending' | 'active' | 'unsubscribed';
  confirmed_at: string | null;
  created_at: string;
  source: string;
}

interface NewsletterSubscribersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewsletterSubscribersModal: React.FC<NewsletterSubscribersModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'subscribers' | 'broadcast'>('subscribers');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Broadcast state
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [targetGroup, setTargetGroup] = useState<'active' | 'all'>('active');
  const [confirmSend, setConfirmSend] = useState(false);
  const [broadcastViewMode, setBroadcastViewMode] = useState<'edit' | 'preview'>('edit');

  // Fetch subscribers list and statistics
  const { data, isLoading, refetch, isRefetching } = useQuery<{
    subscribers: Subscriber[];
    stats: { total: number; active: number; pending: number; unsubscribed: number };
  }>({
    queryKey: ['/api/admin/newsletter/subscribers', filterStatus],
    queryFn: async () => {
      const url =
        filterStatus === 'all'
          ? '/api/admin/newsletter/subscribers'
          : `/api/admin/newsletter/subscribers?status=${filterStatus}`;
      return await apiGet(url);
    },
    enabled: isOpen,
    staleTime: 10 * 1000,
  });

  // Broadcast mutation
  const broadcastMutation = useMutation({
    mutationFn: async (payload: {
      subject: string;
      title: string;
      contentHtml: string;
      target: 'active' | 'all';
    }) => {
      return await apiPost('/api/admin/newsletter/broadcast', payload);
    },
    onSuccess: (res: any) => {
      toast({
        title: 'Broadcast Dispatched! 🚀',
        description:
          res.message ||
          `Newsletter sent to ${res.sent || 0} recipient(s).`,
      });
      setSubject('');
      setTitle('');
      setContentHtml('');
      setConfirmSend(false);
      setActiveTab('subscribers');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/newsletter/subscribers'] });
    },
    onError: (err: any) => {
      toast({
        title: 'Broadcast Failed',
        description: err.message || 'Failed to dispatch newsletter broadcast.',
        variant: 'destructive',
      });
    },
  });

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !contentHtml.trim()) {
      toast({
        title: 'Incomplete Broadcast',
        description: 'Please provide both an email subject and content.',
        variant: 'destructive',
      });
      return;
    }
    if (!confirmSend) {
      setConfirmSend(true);
      return;
    }
    broadcastMutation.mutate({
      subject: subject.trim(),
      title: title.trim() || subject.trim(),
      contentHtml: contentHtml.trim(),
      target: targetGroup,
    });
  };

  const subscribers = (data?.subscribers || []).filter((s) =>
    searchQuery ? s.email.toLowerCase().includes(searchQuery.toLowerCase().trim()) : true
  );

  const stats = data?.stats || { total: 0, active: 0, pending: 0, unsubscribed: 0 };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border shadow-2xl p-0 rounded-2xl">
        <DialogHeader className="p-6 border-b border-border bg-gradient-to-r from-cyan-500/10 via-background to-blue-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                  Newsletter Audience & Broadcast
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Manage newsletter subscribers and send direct email broadcasts.
                </DialogDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching || isLoading}
              className="gap-1.5 h-8 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Quick Stats Badges */}
          <div className="grid grid-cols-4 gap-3 mt-4">
            <div className="bg-background/80 border border-border rounded-xl p-3 text-center">
              <div className="text-xs text-muted-foreground font-medium">Total</div>
              <div className="text-xl font-bold text-foreground mt-0.5">{stats.total}</div>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Active</div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.active}</div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
              <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">Pending</div>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">{stats.pending}</div>
            </div>
            <div className="bg-slate-500/10 border border-slate-500/20 rounded-xl p-3 text-center">
              <div className="text-xs text-muted-foreground font-medium">Unsubscribed</div>
              <div className="text-xl font-bold text-muted-foreground mt-0.5">{stats.unsubscribed}</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            <Button
              type="button"
              variant={activeTab === 'subscribers' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('subscribers')}
              className="gap-2 h-9 text-xs"
            >
              <Users className="w-4 h-4" />
              Subscribers ({stats.total})
            </Button>
            <Button
              type="button"
              variant={activeTab === 'broadcast' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setActiveTab('broadcast');
                setConfirmSend(false);
              }}
              className="gap-2 h-9 text-xs"
            >
              <Send className="w-4 h-4" />
              Send Broadcast
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6">
          {activeTab === 'subscribers' ? (
            <div className="space-y-4">
              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  {['all', 'active', 'pending', 'unsubscribed'].map((st) => (
                    <Button
                      key={st}
                      type="button"
                      variant={filterStatus === st ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() => setFilterStatus(st)}
                      className="text-xs capitalize h-8"
                    >
                      {st}
                    </Button>
                  ))}
                </div>
                <Input
                  placeholder="Search by email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 h-8 text-xs"
                />
              </div>

              {/* Table */}
              <div className="border border-border rounded-xl overflow-hidden bg-background">
                {isLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
                    <span className="text-xs">Loading subscribers...</span>
                  </div>
                ) : subscribers.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground text-xs">
                    No subscribers found matching your criteria.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                        <th className="py-3 px-4 font-semibold">Subscriber Email</th>
                        <th className="py-3 px-4 font-semibold">Status</th>
                        <th className="py-3 px-4 font-semibold">Confirmed</th>
                        <th className="py-3 px-4 font-semibold">Source</th>
                        <th className="py-3 px-4 font-semibold">Joined Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {subscribers.map((sub) => (
                        <tr key={sub.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4 font-medium text-foreground flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                            {sub.email}
                          </td>
                          <td className="py-3 px-4">
                            {sub.status === 'active' && (
                              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Active
                              </Badge>
                            )}
                            {sub.status === 'pending' && (
                              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] gap-1">
                                <Clock className="w-3 h-3" />
                                Pending Opt-in
                              </Badge>
                            )}
                            {sub.status === 'unsubscribed' && (
                              <Badge className="bg-slate-500/10 text-muted-foreground border border-slate-500/20 text-[10px] gap-1">
                                <UserX className="w-3 h-3" />
                                Unsubscribed
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {sub.confirmed_at
                              ? new Date(sub.confirmed_at).toLocaleDateString()
                              : '—'}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground capitalize">
                            {sub.source || 'blog_banner'}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {new Date(sub.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : (
            /* Broadcast Composer */
            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-foreground space-y-1">
                  <div className="font-semibold">Branded Newsletter Broadcast</div>
                  <div className="text-muted-foreground">
                    This message will be styled with your Dev47 email theme and sent with an automated, secure 1-click unsubscribe link in each recipient's footer.
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Target Audience
                  </label>
                  <select
                    value={targetGroup}
                    onChange={(e) => setTargetGroup(e.target.value as 'active' | 'all')}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="active">Active Confirmed Subscribers ({stats.active})</option>
                    <option value="all">All Non-Unsubscribed ({stats.active + stats.pending})</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Article / Newsletter Subheading (Optional)
                  </label>
                  <Input
                    placeholder="e.g., Deep Dive: Cloudflare D1 Architecture"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Email Subject Line <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Issue #14: Scalable Microservices with Workers & D1"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <span>Email Content (HTML or plain text) <span className="text-red-500">*</span></span>
                  </label>
                  <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border">
                    <button
                      type="button"
                      onClick={() => setBroadcastViewMode('edit')}
                      className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md transition-colors ${
                        broadcastViewMode === 'edit'
                          ? 'bg-background text-foreground font-semibold shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Code2 className="w-3 h-3" />
                      Editor
                    </button>
                    <button
                      type="button"
                      onClick={() => setBroadcastViewMode('preview')}
                      className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md transition-colors ${
                        broadcastViewMode === 'preview'
                          ? 'bg-background text-foreground font-semibold shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Eye className="w-3 h-3 text-cyan-500" />
                      Live Preview
                    </button>
                  </div>
                </div>

                {broadcastViewMode === 'edit' ? (
                  <>
                    <Textarea
                      placeholder="<p>Hey everyone,</p><p>Today we are diving into our latest production architecture release...</p>"
                      value={contentHtml}
                      onChange={(e) => setContentHtml(e.target.value)}
                      rows={8}
                      className="font-mono text-xs"
                      required
                    />
                    <div className="text-[11px] text-muted-foreground">
                      Tip: Supports HTML tags like &lt;p&gt;, &lt;h2&gt;, &lt;strong&gt;, &lt;ul&gt;, &lt;li&gt;, and &lt;a href="..."&gt;. Switch to <strong>Live Preview</strong> anytime to check formatting.
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-border overflow-hidden bg-[#0b0f19] p-4 text-left shadow-inner">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 mb-2 flex items-center justify-between border-b border-gray-800 pb-2">
                      <span>Live Branded Email Preview</span>
                      <span className="text-gray-500 font-mono">620px Boxed Email Template</span>
                    </div>

                    <div className="max-w-[560px] mx-auto bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden shadow-2xl">
                      {/* Top Gradient */}
                      <div className="h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500" />

                      {/* Branded Header */}
                      <div className="p-5 border-b border-[#1f2937] flex items-center justify-between">
                        <div>
                          <div className="text-base font-bold text-white tracking-tight">
                            Dev47 <span className="text-cyan-400">Insights</span>
                          </div>
                          <div className="text-[11px] text-gray-400">Future Insights Newsletter</div>
                        </div>
                      </div>

                      {/* Header Title / Subject */}
                      <div className="px-5 pt-4 pb-2">
                        <div className="text-lg font-bold text-white">
                          {title || subject || 'Newsletter Headline Here'}
                        </div>
                        {subject && title && (
                          <div className="text-xs text-gray-400 mt-0.5">Subject: {subject}</div>
                        )}
                      </div>

                      {/* Rendered HTML content */}
                      <div className="px-5 py-4 text-sm text-gray-200 leading-relaxed border-b border-[#1f2937]/50 min-h-[100px]">
                        {contentHtml.trim() ? (
                          <div
                            className="prose prose-invert prose-sm max-w-none space-y-2 [&_a]:text-cyan-400 [&_a]:underline [&_h2]:text-white [&_h2]:text-base [&_h2]:font-bold [&_p]:text-gray-300"
                            dangerouslySetInnerHTML={{ __html: contentHtml }}
                          />
                        ) : (
                          <div className="text-gray-500 italic text-xs py-4 text-center">
                            Write HTML or text in the editor to see your live email preview here...
                          </div>
                        )}
                      </div>

                      {/* Footer Preview */}
                      <div className="p-4 text-center bg-[#0d131f] text-[10px] text-gray-500 space-y-1">
                        <div>You're receiving this because you subscribed to Dev47 Future Insights.</div>
                        <div>
                          © {new Date().getFullYear()} Aman Kayare · Dev47 · <span className="text-gray-400 underline cursor-pointer">Unsubscribe</span> anytime with one click.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {confirmSend && (
                <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 space-y-2">
                  <div className="text-xs font-bold text-red-500 flex items-center gap-2">
                    ⚠️ Confirm Live Broadcast
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Are you sure you want to broadcast this email to <strong>{targetGroup === 'active' ? stats.active : stats.active + stats.pending} recipient(s)</strong>? This action cannot be undone.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                {confirmSend ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmSend(false)}
                      disabled={broadcastMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white gap-2 text-xs"
                      disabled={broadcastMutation.isPending}
                    >
                      {broadcastMutation.isPending ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Sending Broadcast...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          Yes, Send Broadcast Now
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-cyan-600 hover:bg-cyan-700 text-white gap-2 text-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Review & Send Broadcast
                  </Button>
                )}
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
