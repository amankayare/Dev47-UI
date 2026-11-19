import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiGet, apiPost, apiDelete } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';

export interface BookmarkedBlog {
  id: number;
  title: string;
  excerpt?: string;
  content?: string;
  cover_image?: string;
  date: string;
  reading_time?: number;
  featured?: boolean;
  category?: { id: number; name: string };
  author?: { id: number; name: string };
  tags?: Array<{ id: number; name: string }>;
}

export function useBookmarks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const isAuthenticated = Boolean(token);

  // Fetch all bookmarked blogs (for Profile Dashboard)
  const {
    data: bookmarks = [],
    isLoading: isLoadingBookmarks,
    refetch: refetchBookmarks,
  } = useQuery<BookmarkedBlog[]>({
    queryKey: ['/api/user/bookmarks'],
    queryFn: async () => {
      if (!isAuthenticated) return [];
      try {
        const data = await apiGet('/api/user/bookmarks');
        return Array.isArray(data) ? data : [];
      } catch (err) {
        return [];
      }
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch list of bookmarked IDs (for fast badge/icon lookup on cards)
  const {
    data: bookmarkIdsData,
    isLoading: isLoadingIds,
  } = useQuery<{ bookmark_ids: number[] }>({
    queryKey: ['/api/user/bookmarks/ids'],
    queryFn: async () => {
      if (!isAuthenticated) return { bookmark_ids: [] };
      try {
        const data = await apiGet('/api/user/bookmarks/ids');
        return data || { bookmark_ids: [] };
      } catch (err) {
        return { bookmark_ids: [] };
      }
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });

  const bookmarkIds = bookmarkIdsData?.bookmark_ids || [];

  const isBookmarked = (blogId: number): boolean => {
    return bookmarkIds.includes(blogId);
  };

  // Toggle bookmark mutation with optimistic update
  const toggleMutation = useMutation({
    mutationFn: async ({ blogId, currentlyBookmarked }: { blogId: number; currentlyBookmarked: boolean }) => {
      if (currentlyBookmarked) {
        return apiDelete(`/api/user/bookmarks/${blogId}`);
      } else {
        return apiPost('/api/user/bookmarks', { blog_id: blogId });
      }
    },
    onMutate: async ({ blogId, currentlyBookmarked }) => {
      // Cancel queries
      await queryClient.cancelQueries({ queryKey: ['/api/user/bookmarks/ids'] });
      await queryClient.cancelQueries({ queryKey: ['/api/user/bookmarks'] });

      // Snapshot previous state
      const prevIdsData = queryClient.getQueryData<{ bookmark_ids: number[] }>(['/api/user/bookmarks/ids']);
      const prevBookmarks = queryClient.getQueryData<BookmarkedBlog[]>(['/api/user/bookmarks']);

      // Optimistically update IDs
      queryClient.setQueryData<{ bookmark_ids: number[] }>(['/api/user/bookmarks/ids'], (old) => {
        const currentList = old?.bookmark_ids || [];
        return {
          bookmark_ids: currentlyBookmarked
            ? currentList.filter((id) => id !== blogId)
            : [...currentList, blogId],
        };
      });

      // Optimistically update bookmarks list if removing
      if (currentlyBookmarked) {
        queryClient.setQueryData<BookmarkedBlog[]>(['/api/user/bookmarks'], (old) => {
          return (old || []).filter((b) => b.id !== blogId);
        });
      }

      return { prevIdsData, prevBookmarks };
    },
    onError: (_err, _vars, context) => {
      // Revert on error
      if (context?.prevIdsData) {
        queryClient.setQueryData(['/api/user/bookmarks/ids'], context.prevIdsData);
      }
      if (context?.prevBookmarks) {
        queryClient.setQueryData(['/api/user/bookmarks'], context.prevBookmarks);
      }
      toast({
        title: 'Error',
        description: 'Failed to update bookmark. Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/bookmarks/ids'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/bookmarks'] });
    },
  });

  const toggleBookmark = (blog: { id: number; title: string }) => {
    if (!isAuthenticated) {
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname + window.location.search + window.location.hash;
        localStorage.setItem('returnUrl', currentPath);
        localStorage.setItem(
          'authToast',
          JSON.stringify({
            title: 'Sign In Required',
            description: 'Please sign in to save articles to your Read Later list.',
          })
        );
      }
      setLocation('/login');
      return;
    }

    const currentlyBookmarked = isBookmarked(blog.id);
    toggleMutation.mutate({ blogId: blog.id, currentlyBookmarked });

    if (currentlyBookmarked) {
      toast({
        title: 'Removed from Read Later',
        description: `"${blog.title}" was removed from your saved list.`,
      });
    } else {
      toast({
        title: 'Saved to Read Later',
        description: `"${blog.title}" was added to your reading queue.`,
      });
    }
  };

  return {
    bookmarks,
    bookmarkIds,
    isLoading: isLoadingBookmarks || isLoadingIds,
    isBookmarked,
    toggleBookmark,
    refetchBookmarks,
    count: bookmarks.length,
  };
}
