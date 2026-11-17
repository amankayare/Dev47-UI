import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { apiPut } from '@/utils/api';
import {
  Mail,
  Sparkles,
  RotateCcw,
  Eye,
  Code,
  Image as ImageIcon,
  Move,
  ZoomIn,
  Link as LinkIcon,
  HelpCircle,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import {
  normalizeImageUrl,
  extractGoogleDriveFileId,
  getGoogleDriveFallbackUrl,
} from '@/utils/urlUtils';

export type BannerType = 'form' | 'html' | 'image';

export interface NewsletterBannerData {
  is_visible: boolean;
  banner_type: BannerType;
  title: string;
  badge: string;
  description: string;
  button_text?: string;
  placeholder?: string;
  html_content?: string;
  image_url?: string;
  image_link?: string;
  image_alt?: string;
  image_position_x?: number;
  image_position_y?: number;
  image_scale?: number;
}

interface NewsletterBannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: NewsletterBannerData | null;
}

const DEFAULT_BANNER: NewsletterBannerData = {
  is_visible: true,
  banner_type: 'form',
  title: 'Dev47 Future Insights',
  badge: 'Newsletter',
  description:
    'Stay ahead of the curve. Get high-signal, zero-noise articles on modern web architecture, advanced UI/UX, and AI integrations delivered straight to your inbox.',
  button_text: 'Subscribe',
  placeholder: 'name@example.com',
  html_content: `<div class="p-8 text-center bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-2xl shadow-lg">
  <h2 class="text-2xl sm:text-3xl font-extrabold mb-2">Exclusive Modern Web Architecture Guide</h2>
  <p class="text-sm sm:text-base opacity-90 max-w-xl mx-auto mb-4">Discover production-ready serverless patterns, edge compute, and high-performance UI systems.</p>
  <span class="inline-block px-4 py-2 bg-white text-indigo-700 font-bold rounded-xl text-sm shadow hover:bg-opacity-90">Read Now →</span>
</div>`,
  image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=80',
  image_link: '',
  image_alt: 'Dev47 Announcement Banner',
  image_position_x: 50,
  image_position_y: 50,
  image_scale: 1,
};

export function NewsletterBannerModal({
  isOpen,
  onClose,
  initialData,
}: NewsletterBannerModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<NewsletterBannerData>(DEFAULT_BANNER);

  // Image load error & fallback tracking (especially for Google Drive photos)
  const [imgError, setImgError] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  // Compute normalized Google Drive / direct image URL
  const normalizedUrl = normalizeImageUrl(formData.image_url || '');
  const isGoogleDrive = Boolean(extractGoogleDriveFileId(formData.image_url || ''));
  const fallbackUrl = getGoogleDriveFallbackUrl(formData.image_url || '');
  const activeImageUrl = usingFallback && fallbackUrl ? fallbackUrl : normalizedUrl;

  // Snip-style Image Pan State
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; startX: number; startY: number } | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setImgError(false);
    setUsingFallback(false);
  }, [formData.image_url]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        is_visible: initialData.is_visible ?? true,
        banner_type: initialData.banner_type || 'form',
        title: initialData.title || DEFAULT_BANNER.title,
        badge: initialData.badge || DEFAULT_BANNER.badge,
        description: initialData.description || DEFAULT_BANNER.description,
        button_text: initialData.button_text || DEFAULT_BANNER.button_text || 'Subscribe',
        placeholder: initialData.placeholder || DEFAULT_BANNER.placeholder || 'name@example.com',
        html_content: initialData.html_content || DEFAULT_BANNER.html_content || '',
        image_url: initialData.image_url || DEFAULT_BANNER.image_url || '',
        image_link: initialData.image_link || '',
        image_alt: initialData.image_alt || DEFAULT_BANNER.image_alt || 'Dev47 Banner',
        image_position_x: typeof initialData.image_position_x === 'number' ? initialData.image_position_x : 50,
        image_position_y: typeof initialData.image_position_y === 'number' ? initialData.image_position_y : 50,
        image_scale: typeof initialData.image_scale === 'number' ? initialData.image_scale : 1,
      });
    }
  }, [initialData, isOpen]);

  // Snip-style Drag Handlers for Image Banner
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (formData.banner_type !== 'image' || !formData.image_url) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startX: formData.image_position_x ?? 50,
      startY: formData.image_position_y ?? 50,
    };
  }, [formData.banner_type, formData.image_url, formData.image_position_x, formData.image_position_y]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragStartRef.current || !previewContainerRef.current) return;
    const rect = previewContainerRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragStartRef.current.clientX;
    const deltaY = e.clientY - dragStartRef.current.clientY;

    // Invert delta so dragging image to the left pans right
    const sensitivity = 100 / (formData.image_scale || 1);
    const percentDeltaX = (deltaX / rect.width) * sensitivity;
    const percentDeltaY = (deltaY / rect.height) * sensitivity;

    const newX = Math.max(0, Math.min(100, Math.round(dragStartRef.current.startX - percentDeltaX)));
    const newY = Math.max(0, Math.min(100, Math.round(dragStartRef.current.startY - percentDeltaY)));

    setFormData((prev) => ({
      ...prev,
      image_position_x: newX,
      image_position_y: newY,
    }));
  }, [isDragging, formData.image_scale]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  // Touch drag support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (formData.banner_type !== 'image' || !formData.image_url || e.touches.length === 0) return;
    const touch = e.touches[0];
    setIsDragging(true);
    dragStartRef.current = {
      clientX: touch.clientX,
      clientY: touch.clientY,
      startX: formData.image_position_x ?? 50,
      startY: formData.image_position_y ?? 50,
    };
  }, [formData.banner_type, formData.image_url, formData.image_position_x, formData.image_position_y]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !dragStartRef.current || !previewContainerRef.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = previewContainerRef.current.getBoundingClientRect();
    const deltaX = touch.clientX - dragStartRef.current.clientX;
    const deltaY = touch.clientY - dragStartRef.current.clientY;

    const sensitivity = 100 / (formData.image_scale || 1);
    const percentDeltaX = (deltaX / rect.width) * sensitivity;
    const percentDeltaY = (deltaY / rect.height) * sensitivity;

    const newX = Math.max(0, Math.min(100, Math.round(dragStartRef.current.startX - percentDeltaX)));
    const newY = Math.max(0, Math.min(100, Math.round(dragStartRef.current.startY - percentDeltaY)));

    setFormData((prev) => ({
      ...prev,
      image_position_x: newX,
      image_position_y: newY,
    }));
  }, [isDragging, formData.image_scale]);

  const updateMutation = useMutation({
    mutationFn: async (data: NewsletterBannerData) => {
      return apiPut('/api/admin/settings/newsletter-banner', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings/newsletter-banner'] });
      queryClient.invalidateQueries({ queryKey: ['newsletter-banner-settings'] });
      toast({
        title: 'Settings Saved',
        description: 'Banner settings updated successfully.',
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

  const handleResetImagePosition = () => {
    setFormData((prev) => ({
      ...prev,
      image_position_x: 50,
      image_position_y: 50,
      image_scale: 1,
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl p-6 sm:p-8 bg-card dark:bg-cornflower-950/95 border border-cornflower-200/50 dark:border-cornflower-500/20 backdrop-blur-2xl shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-500 rounded-xl border border-cyan-500/20">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black text-cornflower-950 dark:text-cornflower-50">
                Manage Promotional Banner
              </DialogTitle>
              <DialogDescription className="text-xs text-cornflower-700/70 dark:text-cornflower-300/70 font-medium">
                Choose between a dynamic Newsletter Form, Custom HTML block, or Snip-positioned Image banner for /blogs
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ── Option Selector: Form / HTML / Image ── */}
        <div className="mt-2 space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Select Banner Mode
          </Label>
          <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-muted/60 dark:bg-black/30 border border-border/80">
            {/* Option 1: Form */}
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, banner_type: 'form' }))}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                formData.banner_type === 'form'
                  ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20 scale-[1.02]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>Newsletter Form</span>
            </button>

            {/* Option 2: HTML */}
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, banner_type: 'html' }))}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                formData.banner_type === 'html'
                  ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20 scale-[1.02]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              <Code className="w-4 h-4" />
              <span>Custom HTML</span>
            </button>

            {/* Option 3: Image */}
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, banner_type: 'image' }))}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                formData.banner_type === 'image'
                  ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20 scale-[1.02]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Image Banner</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* ── Live Preview Box ── */}
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

            {/* Preview Container — Adapts to Selected Mode */}
            {formData.banner_type === 'form' && (
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
            )}

            {formData.banner_type === 'html' && (
              <div className="relative overflow-hidden rounded-2xl bg-background border border-border/60 shadow-inner">
                <div className="p-1 border-b border-border/40 bg-muted/40 px-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Code className="w-3.5 h-3.5 text-cyan-500" /> HTML Output View
                  </span>
                  <span className="text-[10px] opacity-70">Sandbox Render</span>
                </div>
                <div
                  className="p-4 sm:p-6 overflow-x-auto min-h-[120px] flex items-center justify-center"
                  dangerouslySetInnerHTML={{
                    __html: formData.html_content || '<p class="text-sm text-muted-foreground text-center">Empty HTML content. Enter markup below.</p>',
                  }}
                />
              </div>
            )}

            {formData.banner_type === 'image' && (
              <div className="space-y-2">
                <div
                  ref={previewContainerRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleMouseUp}
                  className={`relative h-44 sm:h-52 w-full overflow-hidden rounded-2xl bg-black/80 border border-cyan-500/40 shadow-inner select-none transition-shadow ${
                    isDragging ? 'cursor-grabbing ring-2 ring-cyan-500' : 'cursor-grab'
                  }`}
                >
                  {formData.image_url ? (
                    <>
                      <img
                        key={activeImageUrl}
                        src={activeImageUrl}
                        alt={formData.image_alt || 'Banner Preview'}
                        draggable={false}
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        onError={() => {
                          if (!usingFallback && fallbackUrl && fallbackUrl !== activeImageUrl) {
                            setUsingFallback(true);
                          } else {
                            setImgError(true);
                          }
                        }}
                        className="w-full h-full object-cover pointer-events-none transition-transform duration-75"
                        style={{
                          objectPosition: `${formData.image_position_x ?? 50}% ${formData.image_position_y ?? 50}%`,
                          transform: `scale(${formData.image_scale || 1})`,
                          transformOrigin: `${formData.image_position_x ?? 50}% ${formData.image_position_y ?? 50}%`,
                        }}
                      />

                      {/* Snip Frame Overlay with Crosshair Guides */}
                      <div className="absolute inset-0 border-2 border-dashed border-cyan-400/40 pointer-events-none rounded-2xl m-1 flex items-center justify-center">
                        <div className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                          <Move className="w-3 h-3" /> Drag to Fit Image
                        </div>
                        <div className="absolute bottom-2 right-2 text-[10px] font-mono bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-white/80 border border-white/10">
                          X: {formData.image_position_x}% · Y: {formData.image_position_y}% · {Math.round((formData.image_scale || 1) * 100)}%
                        </div>
                      </div>

                      {/* Error Overlay for Private/Restricted Drive Photos */}
                      {imgError && (
                        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-2.5 z-20">
                          <div className="p-2.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            <AlertTriangle className="w-6 h-6" />
                          </div>
                          <div className="space-y-1 max-w-md">
                            <p className="text-xs font-bold text-white">Photo Could Not Load</p>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              If using Google Drive, make sure the file's General Access is set to <strong>"Anyone with the link"</strong> (Viewer).
                              In Google Drive: Right-click image → <strong>Share</strong> → change from <em>Restricted</em> to <em>Anyone with the link</em>.
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-6 text-center space-y-2">
                      <ImageIcon className="w-8 h-8 text-muted-foreground/60" />
                      <p className="text-xs font-medium">Please enter an image link below to enable the drag-to-fit preview</p>
                    </div>
                  )}
                </div>

                {/* Snip Controls Toolbar */}
                {formData.image_url && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-background/50 border border-border text-xs">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <span className="font-bold flex items-center gap-1 text-muted-foreground whitespace-nowrap">
                        <ZoomIn className="w-3.5 h-3.5 text-cyan-500" /> Zoom
                      </span>
                      <Slider
                        value={[formData.image_scale || 1]}
                        min={1}
                        max={3}
                        step={0.05}
                        onValueChange={(val) => setFormData((prev) => ({ ...prev, image_scale: Number(val[0].toFixed(2)) }))}
                        className="w-32 sm:w-40"
                      />
                      <span className="font-mono text-[11px] text-muted-foreground w-12 text-right">
                        {Math.round((formData.image_scale || 1) * 100)}%
                      </span>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleResetImagePosition}
                      className="h-7 px-2.5 text-[11px] text-muted-foreground hover:text-foreground rounded-lg"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" /> Reset Crop Position
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Visibility Toggle Switch ── */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-cornflower-500/5 dark:bg-black/30 border border-cornflower-200/50 dark:border-cornflower-500/15">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold text-foreground">Banner Visibility</Label>
              <p className="text-xs text-muted-foreground">
                When enabled, visitors see this banner on the blog home page (/blogs).
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

          {/* ── Option 1 Fields: Form Mode ── */}
          {formData.banner_type === 'form' && (
            <div className="space-y-4 pt-2 border-t border-border/40">
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
            </div>
          )}

          {/* ── Option 2 Fields: Custom HTML Mode ── */}
          {formData.banner_type === 'html' && (
            <div className="space-y-4 pt-2 border-t border-border/40">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="banner-html" className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-cyan-500" /> HTML & Tailwind Markup
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        html_content: DEFAULT_BANNER.html_content,
                      }))
                    }
                    className="text-[11px] text-cyan-500 hover:text-cyan-400 h-6 px-2"
                  >
                    Insert Example Template
                  </Button>
                </div>
                <Textarea
                  id="banner-html"
                  rows={8}
                  value={formData.html_content}
                  onChange={(e) => setFormData((prev) => ({ ...prev, html_content: e.target.value }))}
                  placeholder="<div class='p-6 text-center bg-card text-foreground rounded-2xl'>...</div>"
                  className="rounded-xl bg-background/80 border-border font-mono text-xs leading-relaxed"
                  required
                />
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <HelpCircle className="w-3 h-3 text-cyan-500 shrink-0" />
                  Supports HTML tags, SVG icons, and Tailwind utility classes for instant styling.
                </p>
              </div>
            </div>
          )}

          {/* ── Option 3 Fields: Image Banner Mode ── */}
          {formData.banner_type === 'image' && (
            <div className="space-y-4 pt-2 border-t border-border/40">
              <div className="space-y-2">
                <Label htmlFor="banner-image-url" className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-cyan-500" /> Image Link / URL
                </Label>
                <Input
                  id="banner-image-url"
                  value={formData.image_url}
                  onChange={(e) => {
                    const val = e.target.value;
                    const normalized = normalizeImageUrl(val);
                    setFormData((prev) => ({ ...prev, image_url: normalized }));
                  }}
                  placeholder="https://drive.google.com/file/d/... or any image URL"
                  className="h-11 rounded-xl bg-background/70 border-border"
                  required
                />
                {isGoogleDrive ? (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-cyan-300">
                    <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-bold text-cyan-200">Google Drive share link detected!</span>
                      <p className="text-cyan-400/90 leading-relaxed">
                        Automatically converted to Google's direct CDN image stream (lh3.googleusercontent.com).
                        Ensure the file's General Access is set to <strong>"Anyone with the link"</strong> (Viewer) in Google Drive.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Paste any image URL or <strong>Google Drive photo share link</strong>. Use the preview box above to drag and fit the image.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="banner-image-link" className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-cyan-500" /> Click Destination Link (Optional)
                  </Label>
                  <Input
                    id="banner-image-link"
                    value={formData.image_link}
                    onChange={(e) => setFormData((prev) => ({ ...prev, image_link: e.target.value }))}
                    placeholder="https://amankayare.com/projects"
                    className="h-11 rounded-xl bg-background/70 border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="banner-image-alt" className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Image Alt Description
                  </Label>
                  <Input
                    id="banner-image-alt"
                    value={formData.image_alt}
                    onChange={(e) => setFormData((prev) => ({ ...prev, image_alt: e.target.value }))}
                    placeholder="e.g. Special Product Announcement"
                    className="h-11 rounded-xl bg-background/70 border-border"
                  />
                </div>
              </div>
            </div>
          )}

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
