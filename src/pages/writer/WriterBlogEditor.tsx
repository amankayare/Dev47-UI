import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useParams } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Save,
  Eye,
  Columns,
  PenTool,
  Clock,
  BookOpen,
  Send,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  FileCode,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Minus,
  Info,
  Undo,
  Redo,
  Eraser,
  X,
  Plus,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import WriterLayout from '@/components/writer/WriterLayout';
import { CategoryDropdown, Category } from '@/components/ui/CategoryDropdown';
import ImageInput from '@/components/ui/ImageInput';
import { apiGet, apiPost, apiPut, apiUrl } from '@/utils/api';
import { useBlogContentStyles } from '@/hooks/useBlogStyles';

interface QuickLink {
  title: string;
  url: string;
}

const COMMON_TAGS = [
  'React',
  'TypeScript',
  'JavaScript',
  'Cloudflare',
  'Next.js',
  'Web Development',
  'Architecture',
  'Security',
  'CSS',
  'Backend',
  'DevOps',
  'Performance'
];

export default function WriterBlogEditor() {
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const blogStyles = useBlogContentStyles();

  // Current logged in writer
  const [currentUser] = useState<any>(() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });

  // Editor states
  const [viewMode, setViewMode] = useState<'write' | 'split' | 'preview'>('write');
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [contentHtml, setContentHtml] = useState('<p>Start crafting your story here...</p>');
  const [coverImage, setCoverImage] = useState('');
  const [categoryId, setCategoryId] = useState<number | string | ''>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [manualReadingTime, setManualReadingTime] = useState<string>('');
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSourceMode, setIsSourceMode] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch(apiUrl('/api/blog-categories'));
        if (res.ok) {
          const data = await res.json();
          setCategories(Array.isArray(data) ? data : []);
          if (Array.isArray(data) && data.length > 0 && !categoryId) {
            setCategoryId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    }
    fetchCategories();
  }, []);

  // Fetch blog data if editing
  const { data: blog, isLoading: isLoadingBlog } = useQuery({
    queryKey: ['/api/blogs', id],
    queryFn: () => apiGet(`/api/blogs/${id}`),
    enabled: isEditing,
  });

  // Load existing blog data and verify ownership
  useEffect(() => {
    if (blog && isEditing) {
      const isAdmin = Boolean(currentUser?.is_admin || currentUser?.role === 'admin');
      if (!isAdmin && blog.user_id && currentUser?.id && blog.user_id !== currentUser.id) {
        toast({
          title: 'Access Denied',
          description: 'You can only edit your own articles.',
          variant: 'destructive',
        });
        setLocation('/writer/blogs');
        return;
      }

      setTitle(blog.title || '');
      setExcerpt(blog.excerpt || '');
      let rawContent = blog.content || '<p></p>';
      if (/&lt;(?:h[1-6]|p|div|ul|ol|li|table|blockquote|pre|figure|section|span|strong|em|hr|code|a|del)[\s&gt;]/i.test(rawContent)) {
        rawContent = rawContent
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, '&');
      }
      setContentHtml(rawContent);
      if (editorRef.current) {
        editorRef.current.innerHTML = rawContent;
      }
      setCoverImage(blog.cover_image || '');
      if (blog.category?.id) {
        setCategoryId(blog.category.id);
      }
      setTags(Array.isArray(blog.tags) ? blog.tags.map((t: any) => t.name) : []);
      setIsVisible(Boolean(blog.is_visible));
      setFeatured(Boolean(blog.featured));
      if (blog.reading_time) {
        setManualReadingTime(blog.reading_time.toString());
      }
      setQuickLinks(Array.isArray(blog.quick_links) ? blog.quick_links : []);
    }
  }, [blog, isEditing, currentUser, setLocation, toast]);

  // Sync editor innerHTML on first mount if not editing
  useEffect(() => {
    if (!isEditing && editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = contentHtml;
    }
  }, [isEditing]);

  // Realtime Word Count & Computed Reading Time
  const stats = useMemo(() => {
    const text = contentHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = text ? text.split(' ').filter(Boolean).length : 0;
    const chars = text.length;
    const estimatedMinutes = Math.max(1, Math.ceil(words / 200));
    return { words, chars, estimatedMinutes };
  }, [contentHtml]);

  // Normalized content for preview (auto-decodes escaped HTML if needed)
  const normalizedContent = useMemo(() => {
    if (!contentHtml) return '';
    let content = contentHtml;
    if (/&lt;(?:h[1-6]|p|div|ul|ol|li|table|blockquote|pre|figure|section|span|strong|em|hr|code|a|del)[\s&gt;]/i.test(content)) {
      content = content
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&');
    }
    return content;
  }, [contentHtml]);

  // Handle rich text input changes
  const handleEditorInput = () => {
    if (editorRef.current) {
      setContentHtml(editorRef.current.innerHTML);
    }
  };

  // Execute traditional rich text commands
  const execCmd = (command: string, value: string | undefined = undefined) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    setContentHtml(editorRef.current.innerHTML);
  };

  // Custom block insertions
  const insertCustomHtml = (htmlSnippet: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand('insertHTML', false, htmlSnippet);
    setContentHtml(editorRef.current.innerHTML);
  };

  const handleInsertLink = () => {
    const selectedText = window.getSelection()?.toString() || '';
    const url = prompt('Enter destination URL (e.g., https://example.com):');
    if (!url) return;

    if (selectedText) {
      execCmd('createLink', url);
    } else {
      const linkText = prompt('Enter link text:', url) || url;
      insertCustomHtml(`<a href="${url}" target="_blank" rel="noopener noreferrer">${linkText}</a>&nbsp;`);
    }
  };

  const handleInsertImage = () => {
    const url = prompt('Enter Image URL:');
    if (!url) return;
    const alt = prompt('Enter Image Alt / Caption (optional):') || 'Article illustration';
    insertCustomHtml(`
      <figure class="my-6">
        <img src="${url}" alt="${alt}" class="w-full rounded-2xl border border-border shadow-md object-cover" />
        <figcaption class="text-center text-xs text-muted-foreground mt-2 italic">${alt}</figcaption>
      </figure>
      <p><br></p>
    `);
  };

  const handleInsertCodeBlock = () => {
    insertCustomHtml(`
      <pre class="bg-slate-950 text-slate-100 p-4 rounded-xl border border-white/10 my-4 overflow-x-auto font-mono text-sm"><code>// Write your code here...</code></pre>
      <p><br></p>
    `);
  };

  const handleInsertCallout = () => {
    insertCustomHtml(`
      <div class="my-5 p-4 rounded-xl border border-cornflower-500/30 bg-cornflower-500/10 text-foreground dark:text-cornflower-100">
        <strong class="text-cornflower-700 dark:text-cornflower-400 font-bold block mb-1">💡 Writer's Note:</strong>
        Highlight important takeaways, advice, or caveats here.
      </div>
      <p><br></p>
    `);
  };

  const handleInsertTable = () => {
    insertCustomHtml(`
      <table class="w-full border-collapse border border-border/60 my-6 text-sm">
        <thead>
          <tr class="bg-muted/60 text-foreground font-semibold">
            <th class="border border-border/60 p-2 text-left">Header 1</th>
            <th class="border border-border/60 p-2 text-left">Header 2</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border border-border/60 p-2">Item 1</td>
            <td class="border border-border/60 p-2">Description 1</td>
          </tr>
          <tr>
            <td class="border border-border/60 p-2">Item 2</td>
            <td class="border border-border/60 p-2">Description 2</td>
          </tr>
        </tbody>
      </table>
      <p><br></p>
    `);
  };

  // Keyboard shortcuts (Ctrl+B, Ctrl+I, Ctrl+U, Tab)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        execCmd('bold');
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        execCmd('italic');
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        execCmd('underline');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      execCmd('insertHTML', '&nbsp;&nbsp;&nbsp;&nbsp;');
    }
  };

  // Smart paste: if pasting raw HTML markup, insert as real HTML elements
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const textData = e.clipboardData.getData('text/plain');

    if (/<(?:h[1-6]|p|div|ul|ol|li|table|blockquote|pre|figure|section|header|hr|code|a|strong|em)[\s>]/i.test(textData)) {
      e.preventDefault();
      document.execCommand('insertHTML', false, textData);
      if (editorRef.current) {
        setContentHtml(editorRef.current.innerHTML);
      }
      return;
    }
  };

  // Tag management
  const handleAddTag = (rawTag: string) => {
    const clean = rawTag.trim().replace(/^#/, '');
    if (!clean) return;
    if (!tags.includes(clean)) {
      setTags(prev => [...prev, clean]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  };

  // Quick Links management
  const handleAddQuickLink = () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please provide both a link title and valid URL.',
        variant: 'destructive',
      });
      return;
    }
    setQuickLinks(prev => [...prev, { title: newLinkTitle.trim(), url: newLinkUrl.trim() }]);
    setNewLinkTitle('');
    setNewLinkUrl('');
  };

  const handleRemoveQuickLink = (index: number) => {
    setQuickLinks(prev => prev.filter((_, i) => i !== index));
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiPost('/api/blogs', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blogs/admin'] });
      toast({
        title: 'Article Published',
        description: isVisible ? 'Your article is now live!' : 'Draft saved successfully.',
      });
      setLocation('/writer/blogs');
    },
    onError: (err: any) => {
      toast({
        title: 'Publish Failed',
        description: err.message || 'Could not save article. Please check your fields.',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiPut(`/api/blogs/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blogs/admin'] });
      toast({
        title: 'Article Updated',
        description: 'Your changes have been saved.',
      });
      setLocation('/writer/blogs');
    },
    onError: (err: any) => {
      toast({
        title: 'Update Failed',
        description: err.message || 'Could not update article.',
        variant: 'destructive',
      });
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Save handler
  const handleSave = (publishState: boolean) => {
    if (!title.trim()) {
      toast({
        title: 'Title Required',
        description: 'Please enter a title for your article.',
        variant: 'destructive',
      });
      return;
    }

    if (!categoryId) {
      toast({
        title: 'Category Required',
        description: 'Please select a category for your article.',
        variant: 'destructive',
      });
      return;
    }

    const readingTimeValue = manualReadingTime ? parseInt(manualReadingTime, 10) : stats.estimatedMinutes;

    let finalContent = contentHtml;
    // Auto-decode if the content was somehow saved with escaped HTML tags
    if (/&lt;(?:h[1-6]|p|div|ul|ol|li|table|blockquote|pre|figure|section|span|strong|em|hr|code|a|del)[\s&gt;]/i.test(finalContent)) {
      finalContent = finalContent
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&');
    }

    const payload = {
      title: title.trim(),
      excerpt: excerpt.trim() || title.trim().slice(0, 160),
      content: finalContent,
      cover_image: coverImage || '',
      category_id: Number(categoryId),
      tags: tags,
      author: { name: currentUser?.username || 'Writer' },
      reading_time: readingTimeValue || 1,
      featured: featured,
      is_visible: publishState,
      quick_links: quickLinks,
    };

    if (isEditing && id) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };


  const renderFullPreview = () => (
              <div className="bg-card border border-border/60 rounded-3xl p-6 sm:p-10 shadow-xl space-y-8">
                {/* Preview Header */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-cornflower-500/20 text-cornflower-400 border border-cornflower-500/30 uppercase text-[10px] tracking-widest font-black">
                      {categories.find(c => c.id.toString() === categoryId.toString())?.name || 'Uncategorized'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      ~{manualReadingTime || stats.estimatedMinutes} min read
                    </span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight leading-tight">
                    {title || 'Untitled Article'}
                  </h1>
                  {excerpt && (
                    <p className="text-lg text-muted-foreground leading-relaxed italic border-l-2 border-cornflower-500/40 pl-4 py-1">
                      {excerpt}
                    </p>
                  )}
                  <div className="flex items-center gap-3 pt-2 text-xs text-muted-foreground">
                    <div className="w-8 h-8 rounded-full bg-cornflower-500/20 text-cornflower-400 flex items-center justify-center font-bold">
                      {(currentUser?.username || 'W').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{currentUser?.username || 'Writer'}</div>
                      <div>Published Today</div>
                    </div>
                  </div>
                </div>

                {/* Preview Cover Image */}
                {coverImage && (
                  <div className="rounded-2xl overflow-hidden border border-border shadow-lg max-h-[420px]">
                    <img src={coverImage} alt={title} className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Preview Body Content */}
                <div className={blogStyles.prose}>
                  <div dangerouslySetInnerHTML={{ __html: normalizedContent }} />
                </div>

                {/* Preview Tags */}
                {tags.length > 0 && (
                  <div className="pt-6 border-t border-border/50 flex flex-wrap gap-2 items-center">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mr-2">Tags:</span>
                    {tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs rounded-full px-3 py-1">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Preview Quick Links */}
                {quickLinks.length > 0 && (
                  <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 space-y-2">
                    <div className="text-xs font-bold text-foreground uppercase tracking-wider">Reference Links</div>
                    <ul className="space-y-1">
                      {quickLinks.map((link, idx) => (
                        <li key={idx}>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-cornflower-500 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {link.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
  );

  const renderWritingCanvas = () => (
              <div className="space-y-4">
                {/* Title & Summary Input Card */}
                <div className="bg-card border border-border/60 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                  {/* Article Title */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="article-title" className="text-sm font-extrabold uppercase tracking-wider text-cornflower-950 dark:text-cornflower-100 flex items-center gap-2">
                        <PenTool className="w-4 h-4 text-cornflower-500" />
                        Article Title <span className="text-red-500">*</span>
                      </Label>
                      <span className="text-xs text-muted-foreground font-mono">{title.length} characters</span>
                    </div>
                    <Input
                      id="article-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter a captivating article title..."
                      className="h-14 px-4 text-xl sm:text-2xl font-bold rounded-2xl border-2 border-border/70 focus-visible:border-cornflower-500 focus-visible:ring-2 focus-visible:ring-cornflower-500/20 bg-background/50 placeholder:text-muted-foreground/40 transition-all text-foreground"
                    />
                  </div>

                  {/* Article Summary / Excerpt */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="article-summary" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Article Summary / Excerpt (Optional)
                      </Label>
                      <span className="text-xs text-muted-foreground font-mono">{excerpt.length} characters</span>
                    </div>
                    <Textarea
                      id="article-summary"
                      value={excerpt}
                      onChange={(e) => setExcerpt(e.target.value)}
                      placeholder="Write a brief summary (1-2 sentences) to appear on article cards and search results..."
                      className="text-sm rounded-xl border border-border/60 bg-background/40 resize-none min-h-[72px] leading-relaxed p-3 focus-visible:border-cornflower-500 text-foreground"
                    />
                  </div>
                </div>

                {/* Traditional Rich Writing Canvas Card */}
                <div className="bg-card border border-border/60 rounded-3xl overflow-hidden shadow-sm flex flex-col">
                  {/* Rich Formatting Toolbar */}
                  <div className="p-3 bg-muted/80 dark:bg-muted/40 border-b border-border/70 flex flex-wrap items-center gap-1.5 relative z-10 w-full">
                    {/* Headings */}
                    <div className="flex items-center gap-0.5 pr-1 border-r border-border/60">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => execCmd('formatBlock', '<h1>')}
                        className="h-8 w-8 p-0 rounded-lg hover:bg-background"
                        title="Heading 1"
                      >
                        <Heading1 className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => execCmd('formatBlock', '<h2>')}
                        className="h-8 w-8 p-0 rounded-lg hover:bg-background"
                        title="Heading 2"
                      >
                        <Heading2 className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => execCmd('formatBlock', '<h3>')}
                        className="h-8 w-8 p-0 rounded-lg hover:bg-background"
                        title="Heading 3"
                      >
                        <Heading3 className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => execCmd('formatBlock', '<p>')}
                        className="h-8 px-2 text-xs font-bold rounded-lg hover:bg-background"
                        title="Paragraph"
                      >
                        P
                      </Button>
                    </div>

                    {/* Inline Formatting */}
                    <div className="flex items-center gap-0.5 px-1 border-r border-border/60">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => execCmd('bold')}
                        className="h-8 w-8 p-0 rounded-lg hover:bg-background"
                        title="Bold (Ctrl+B)"
                      >
                        <Bold className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => execCmd('italic')}
                        className="h-8 w-8 p-0 rounded-lg hover:bg-background"
                        title="Italic (Ctrl+I)"
                      >
                        <Italic className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => execCmd('underline')}
                        className="h-8 w-8 p-0 rounded-lg hover:bg-background"
                        title="Underline (Ctrl+U)"
                      >
                        <Underline className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => execCmd('strikeThrough')}
                        className="h-8 w-8 p-0 rounded-lg hover:bg-background"
                        title="Strikethrough"
                      >
                        <Strikethrough className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Lists & Quotes */}
                    <div className="flex items-center gap-0.5 px-1 border-r border-border/60">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => execCmd('insertUnorderedList')}
                        className="h-8 w-8 p-0 rounded-lg hover:bg-background"
                        title="Bulleted List"
                      >
                        <List className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => execCmd('insertOrderedList')}
                        className="h-8 w-8 p-0 rounded-lg hover:bg-background"
                        title="Numbered List"
                      >
                        <ListOrdered className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => execCmd('formatBlock', '<blockquote>')}
                        className="h-8 w-8 p-0 rounded-lg hover:bg-background"
                        title="Blockquote"
                      >
                        <Quote className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => execCmd('insertHorizontalRule')}
                        className="h-8 w-8 p-0 rounded-lg hover:bg-background"
                        title="Horizontal Divider"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Rich Elements: Link, Image, Code Block, Table, Callout */}
                    <div className="flex items-center gap-0.5 px-1 border-r border-border/60">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleInsertLink}
                        className="h-8 w-8 p-0 rounded-lg hover:bg-background text-cornflower-500"
                        title="Insert Hyperlink"
                      >
                        <LinkIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleInsertImage}
                        className="h-8 w-8 p-0 rounded-lg hover:bg-background text-emerald-500"
                        title="Insert Image into Content"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleInsertCodeBlock}
                        className="h-8 w-8 p-0 rounded-lg hover:bg-background text-indigo-400"
                        title="Insert Code Block"
                      >
                        <FileCode className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleInsertTable}
                        className="h-8 w-8 p-0 rounded-lg hover:bg-background"
                        title="Insert Table"
                      >
                        <TableIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleInsertCallout}
                        className="h-8 w-8 p-0 rounded-lg hover:bg-background text-amber-500"
                        title="Insert Note Box"
                      >
                        <Info className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* History & Clear */}
                    <div className="flex items-center gap-0.5 pl-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => execCmd('undo')}
                        className="h-8 w-8 p-0 rounded-lg hover:bg-background"
                        title="Undo (Ctrl+Z)"
                      >
                        <Undo className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => execCmd('redo')}
                        className="h-8 w-8 p-0 rounded-lg hover:bg-background"
                        title="Redo (Ctrl+Y)"
                      >
                        <Redo className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => execCmd('removeFormat')}
                        className="h-8 w-8 p-0 rounded-lg hover:bg-background text-muted-foreground"
                        title="Clear Formatting"
                      >
                        <Eraser className="w-4 h-4" />
                      </Button>
                      <div className="h-4 w-px bg-border/60 mx-1" />
                      <Button
                        type="button"
                        variant={isSourceMode ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => {
                          if (isSourceMode) {
                            if (editorRef.current) {
                              editorRef.current.innerHTML = contentHtml;
                            }
                          }
                          setIsSourceMode(!isSourceMode);
                        }}
                        className={`h-8 px-2.5 gap-1.5 text-xs font-mono rounded-lg transition-colors ${
                          isSourceMode
                            ? 'bg-cornflower-500/20 text-cornflower-400 border border-cornflower-500/30'
                            : 'hover:bg-background text-cornflower-500'
                        }`}
                        title="Toggle HTML Source Code"
                      >
                        <Code className="w-4 h-4" />
                        <span>{isSourceMode ? 'Visual Mode' : 'HTML Code'}</span>
                      </Button>
                    </div>
                  </div>

                  {/* Visual ContentEditable Canvas or HTML Source Mode */}
                  {isSourceMode ? (
                    <Textarea
                      value={contentHtml}
                      onChange={(e) => setContentHtml(e.target.value)}
                      className="p-6 sm:p-8 min-h-[520px] font-mono text-sm leading-relaxed border-none focus-visible:ring-0 bg-slate-950 text-slate-100 resize-y rounded-none"
                      placeholder="<p>Write or paste your raw HTML code here...</p>"
                    />
                  ) : (
                    <div
                      ref={editorRef}
                      contentEditable
                      onInput={handleEditorInput}
                      onKeyDown={handleKeyDown}
                      onPaste={handlePaste}
                      className="p-6 sm:p-10 min-h-[520px] w-full focus:outline-none focus:ring-0 leading-relaxed font-sans text-[16px] text-foreground prose dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-foreground prose-a:underline prose-a:underline-offset-4 prose-a:decoration-primary/60 hover:prose-a:text-primary prose-code:before:content-none prose-code:after:content-none prose-blockquote:border-l-4 prose-blockquote:border-cornflower-500 prose-blockquote:pl-4 prose-pre:bg-slate-950 prose-pre:rounded-xl prose-pre:p-4 bg-background/20"
                      suppressContentEditableWarning={true}
                    />
                  )}

                  {/* Footer Word Count Bar */}
                  <div className="px-6 py-3 bg-muted/20 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground font-mono">
                    <div className="flex items-center gap-4">
                      <span>{stats.words} words</span>
                      <span>{stats.chars} characters</span>
                      <span>Estimated {stats.estimatedMinutes} min read</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground/60 hidden sm:block">
                      Shortcuts: Ctrl+B (Bold) • Ctrl+I (Italic) • Ctrl+U (Underline)
                    </div>
                  </div>
                </div>
              </div>
  );

  const renderLivePreviewCard = () => (
            <div className="bg-card border border-border/60 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 max-h-[850px] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-cornflower-400" />
                  <span className="font-bold text-xs uppercase tracking-wider text-foreground">Live Reader Preview</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">Auto-Syncing</Badge>
              </div>

              {coverImage && (
                <div className="rounded-xl overflow-hidden border border-border shadow-sm max-h-[240px]">
                  <img src={coverImage} alt={title} className="w-full h-full object-cover" />
                </div>
              )}

              <div>
                <h2 className="text-2xl font-black text-foreground">{title || 'Untitled Article'}</h2>
                {excerpt && <p className="text-sm text-muted-foreground italic mt-2">{excerpt}</p>}
              </div>

              <div className={blogStyles.prose}>
                <div dangerouslySetInnerHTML={{ __html: normalizedContent }} />
              </div>
            </div>
  );

  const renderPublicationSettings = () => (
              <div className="bg-card border border-border/60 rounded-3xl p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-border/50 pb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-cornflower-500" />
                    <span className="font-bold text-sm text-foreground">Publication Settings</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={isVisible ? 'text-emerald-500 border-emerald-500/30' : 'text-yellow-500 border-yellow-500/30'}
                  >
                    {isVisible ? 'Live' : 'Draft'}
                  </Badge>
                </div>

                {/* Visibility Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-semibold">Public Status</Label>
                    <p className="text-xs text-muted-foreground">Make this post visible to readers</p>
                  </div>
                  <Switch
                    checked={isVisible}
                    onCheckedChange={setIsVisible}
                    aria-label="Toggle public visibility"
                  />
                </div>

                {/* Category Selection */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category *</Label>
                  <CategoryDropdown
                    categories={categories}
                    selectedId={categoryId}
                    onSelect={(id) => setCategoryId(id)}
                    placeholder="Select article category..."
                  />
                </div>

                {/* Estimated Reading Time Override */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Reading Time (Minutes)
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={manualReadingTime}
                    onChange={(e) => setManualReadingTime(e.target.value)}
                    placeholder={`Auto: ${stats.estimatedMinutes} min`}
                    className="rounded-xl border-border/60 text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Leave blank to use auto-computed time (~{stats.estimatedMinutes} min based on {stats.words} words).
                  </p>
                </div>
              </div>
  );

  const renderCoverImage = () => (
              <div className="bg-card border border-border/60 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                  <ImageIcon className="w-4 h-4 text-indigo-500" />
                  <span className="font-bold text-sm text-foreground">Cover Image</span>
                </div>

                <ImageInput
                  label="Featured Cover"
                  uploadType="cover"
                  currentUrl={coverImage}
                  onUrlChange={setCoverImage}
                  onUploadSuccess={setCoverImage}
                  onDelete={() => setCoverImage('')}
                  placeholder="https://example.com/cover.jpg or upload..."
                />
              </div>
  );

  const renderTags = () => (
              <div className="bg-card border border-border/60 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border/50 pb-3">
                  <span className="font-bold text-sm text-foreground">Tags & Keywords</span>
                  <Badge variant="outline" className="text-xs">{tags.length} selected</Badge>
                </div>

                {/* Tag Input */}
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        handleAddTag(tagInput);
                      }
                    }}
                    placeholder="Type tag & press Enter..."
                    className="rounded-xl border-border/60 text-sm"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddTag(tagInput)}
                    className="rounded-xl shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Active Tag Chips */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="rounded-full px-2.5 py-1 text-xs bg-cornflower-500/10 text-cornflower-400 border border-cornflower-500/20 flex items-center gap-1 group"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-red-400 ml-0.5"
                          title="Remove tag"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Suggested Tags */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60 block">Suggestions:</span>
                  <div className="flex flex-wrap gap-1">
                    {COMMON_TAGS.filter(t => !tags.includes(t)).slice(0, 6).map((suggested) => (
                      <button
                        key={suggested}
                        type="button"
                        onClick={() => handleAddTag(suggested)}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border/40 transition-colors"
                      >
                        +{suggested}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
  );

  const renderQuickLinks = () => (
              <div className="bg-card border border-border/60 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border/50 pb-3">
                  <span className="font-bold text-sm text-foreground">Reference Links</span>
                  <Badge variant="outline" className="text-xs">{quickLinks.length}</Badge>
                </div>

                <div className="space-y-2">
                  <Input
                    value={newLinkTitle}
                    onChange={(e) => setNewLinkTitle(e.target.value)}
                    placeholder="Link Title (e.g. Documentation)"
                    className="rounded-xl border-border/60 text-xs"
                  />
                  <div className="flex gap-2">
                    <Input
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      placeholder="https://..."
                      className="rounded-xl border-border/60 text-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAddQuickLink}
                      className="rounded-xl shrink-0 text-xs"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add
                    </Button>
                  </div>
                </div>

                {quickLinks.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {quickLinks.map((link, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border/40 text-xs"
                      >
                        <div className="truncate pr-2">
                          <span className="font-semibold text-foreground block truncate">{link.title}</span>
                          <span className="text-muted-foreground text-[10px] block truncate">{link.url}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuickLink(idx)}
                          className="text-muted-foreground hover:text-red-400 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
  );

  return (
    <WriterLayout title={isEditing ? 'Edit Article' : 'New Article'} backTo="/writer/blogs">
      <div className="max-w-7xl mx-auto space-y-6 pb-20">
        {/* Top Control Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-cornflower-200/50 dark:border-cornflower-500/20 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/writer/blogs')}
              className="rounded-full gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              My Articles
            </Button>
            <div className="h-4 w-px bg-border/60" />
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`font-mono text-xs px-2.5 py-1 rounded-full uppercase tracking-wider ${
                  isVisible
                    ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                    : 'border-yellow-500/30 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10'
                }`}
              >
                {isVisible ? 'Live / Public' : 'Draft / Private'}
              </Badge>
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground font-mono bg-muted/50 px-3 py-1 rounded-full border border-border/40">
                <Clock className="w-3.5 h-3.5 text-cornflower-400" />
                <span>{stats.words} words</span>
                <span>•</span>
                <span>~{manualReadingTime || stats.estimatedMinutes} min read</span>
              </div>
            </div>
          </div>

          {/* View Mode & Publish Actions */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            {/* View Mode Switcher */}
            <div className="bg-muted/60 p-1 rounded-xl flex items-center border border-border/50 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('write')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  viewMode === 'write'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                Write
              </button>
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  viewMode === 'split'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                Split
              </button>
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  viewMode === 'preview'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Preview
              </button>
            </div>

            {/* Save as Draft */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSaving}
              onClick={() => handleSave(false)}
              className="rounded-xl border-border hover:bg-muted font-medium text-xs h-9 px-3 gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              Save Draft
            </Button>

            {/* Publish Article */}
            <Button
              type="button"
              size="sm"
              disabled={isSaving}
              onClick={() => handleSave(true)}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-md h-9 px-4 gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {isEditing ? 'Update & Publish' : 'Publish Article'}
            </Button>
          </div>
        </div>


        {/* Main Editor Body based on View Mode */}
        {viewMode === 'preview' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {renderFullPreview()}
          </div>
        )}

        {viewMode === 'split' && (
          <div className="space-y-8">
            {/* Top: 2-Column Side-by-Side Studio */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Left Column: Writing Canvas */}
              <div className="space-y-4">
                {renderWritingCanvas()}
              </div>

              {/* Right Column: Live Reader Preview */}
              {renderLivePreviewCard()}
            </div>

            {/* Bottom: Article Settings & Metadata Section */}
            <div className="pt-8 border-t border-border/60 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-cornflower-500" />
                  <h3 className="font-bold text-base text-foreground">Article Configuration & Settings</h3>
                </div>
                <Badge variant="outline" className="text-xs font-mono">Publication & Metadata</Badge>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-6">
                  {renderPublicationSettings()}
                  {renderCoverImage()}
                </div>
                <div className="space-y-6">
                  {renderTags()}
                  {renderQuickLinks()}
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'write' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Writing Canvas (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              {renderWritingCanvas()}
            </div>

            {/* Right: Settings Sidebar (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              {renderPublicationSettings()}
              {renderCoverImage()}
              {renderTags()}
              {renderQuickLinks()}
            </div>
          </div>
        )}

      </div>
    </WriterLayout>
  );
}
