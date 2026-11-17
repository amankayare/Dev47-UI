import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiPut } from '@/utils/api';
import { Mail, Sparkles, RotateCcw, Check, Eye } from 'lucide-react';

export interface NewsletterBannerData {
  is_visible: boolean;
  title: string;
  badge: string;
  description: string;
  button_text?: string;
  placeholder?: string;
}

interface NewsletterBannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: NewsletterBannerData | null;
}

const DEFAULT_BANNER: NewsletterBannerData = {
  is_visible: true,
  title: 'Dev47 Future Insights',
  badge: 'Newsletter',
  description:
    'Stay ahead of the curve. Get high-signal, zero-noise articles on modern web architecture, advanced UI/UX, and AI integrations delivered straight to your inbox.',
  button_text: 'Subscribe',
  placeholder: 'name@example.com',
};

export function NewsletterBannerModal({
  isOpen,
  onClose,
  initialData,
}: NewsletterBannerModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<NewsletterBannerData>(DEFAULT_BANNER);

  useEffect(() => {
    if (initialData) {
      setFormData({
        is_visible: initialData.is_visible ?? true,
        title: initialData.title || DEFAULT_BANNER.title,
        badge: initialData.badge || DEFAULT_BANNER.badge,
        description: initialData.description || DEFAULT_BANNER.description,
        button_text: initialData.button_text || DEFAULT_BANNER.button_text || 'Subscribe',
        placeholder: initialData.placeholder || DEFAULT_BANNER.placeholder || 'name@example.com',
      });
    }
  }, [initialData, isOpen]);

  const updateMutation = useMutation({
    mutationFn: async (data: NewsletterBannerData) => {
      return apiPut('/api/admin/settings/newsletter-banner', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings/newsletter-banner'] });
      queryClient.invalidateQueries({ queryKey: ['newsletter-banner-settings'] });
      toast({
        title: 'Settings Saved',
        description: 'Dev47 Future Insights banner content updated successfully.',
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to save newsletter banner settings.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleResetDefaults = () => {
    setFormData(DEFAULT_BANNER);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8 bg-card dark:bg-cornflower-950/95 border border-cornflower-200/50 dark:border-cornflower-500/20 backdrop-blur-2xl shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-500 rounded-xl border border-cyan-500/20">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black text-cornflower-950 dark:text-cornflower-50">
                Edit Newsletter Banner
              </DialogTitle>
              <DialogDescription className="text-xs text-cornflower-700/70 dark:text-cornflower-300/70 font-medium">
                Customize the copy, badge, buttons, and visibility of the banner displayed on /blogs
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Live Preview Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-cyan-500" /> Live Preview
              </Label>
              <Badge
                variant="secondary"
                className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 ${
                  formData.is_visible
                    ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                    : 'bg-muted text-muted-foreground border border-border'
                }`}
              >
                {formData.is_visible ? '● Visible on /blogs' : '○ Hidden from Public'}
              </Badge>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-background border border-border/60 p-5 shadow-inner">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />
              <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex gap-3 items-start max-w-md">
                  <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 mt-0.5 shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">
                        {formData.title || 'Dev47 Future Insights'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 text-[8px] font-bold uppercase tracking-widest">
                        {formData.badge || 'Newsletter'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {formData.description || 'Stay ahead of the curve...'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                  <div className="h-8 px-3 rounded-lg bg-background/50 border border-border text-xs text-muted-foreground flex items-center">
                    {formData.placeholder || 'name@example.com'}
                  </div>
                  <div className="h-8 px-3 rounded-lg bg-foreground text-background text-xs font-semibold flex items-center">
                    {formData.button_text || 'Subscribe'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Visibility Toggle Switch */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-cornflower-500/5 dark:bg-black/30 border border-cornflower-200/50 dark:border-cornflower-500/15">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold text-foreground">Banner Visibility</Label>
              <p className="text-xs text-muted-foreground">
                When enabled, visitors see this banner on the blog home page.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-black uppercase tracking-wider text-cornflower-900 dark:text-cornflower-100">
                {formData.is_visible ? 'Visible' : 'Hidden'}
              </span>
              <Switch
                checked={formData.is_visible}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_visible: checked }))}
                aria-label="Toggle banner visibility"
              />
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="banner-title" className="text-xs font-bold uppercase tracking-wider text-foreground">
                Banner Title
              </Label>
              <Input
                id="banner-title"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Dev47 Future Insights"
                className="h-11 rounded-xl bg-background/70 border-border"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="banner-badge" className="text-xs font-bold uppercase tracking-wider text-foreground">
                Badge Label
              </Label>
              <Input
                id="banner-badge"
                value={formData.badge}
                onChange={(e) => setFormData((prev) => ({ ...prev, badge: e.target.value }))}
                placeholder="e.g. Newsletter, Announcement"
                className="h-11 rounded-xl bg-background/70 border-border"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="banner-desc" className="text-xs font-bold uppercase tracking-wider text-foreground">
              Description Copy
            </Label>
            <Textarea
              id="banner-desc"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Enter the banner description message..."
              className="rounded-xl bg-background/70 border-border text-sm leading-relaxed"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="banner-button" className="text-xs font-bold uppercase tracking-wider text-foreground">
                Button Text
              </Label>
              <Input
                id="banner-button"
                value={formData.button_text}
                onChange={(e) => setFormData((prev) => ({ ...prev, button_text: e.target.value }))}
                placeholder="e.g. Subscribe, Join Now"
                className="h-11 rounded-xl bg-background/70 border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="banner-placeholder" className="text-xs font-bold uppercase tracking-wider text-foreground">
                Input Placeholder
              </Label>
              <Input
                id="banner-placeholder"
                value={formData.placeholder}
                onChange={(e) => setFormData((prev) => ({ ...prev, placeholder: e.target.value }))}
                placeholder="e.g. name@example.com"
                className="h-11 rounded-xl bg-background/70 border-border"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-cornflower-200/50 dark:border-cornflower-500/15">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetDefaults}
              className="text-xs text-muted-foreground hover:text-foreground rounded-full"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset to Defaults
            </Button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="rounded-full flex-1 sm:flex-none border-cornflower-200 dark:border-cornflower-500/20"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="rounded-full flex-1 sm:flex-none bg-cyan-600 hover:bg-cyan-700 text-white font-bold shadow-lg shadow-cyan-500/20 px-6"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
