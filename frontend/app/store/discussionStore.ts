import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PostData, CommentData } from '../data/discussionMockData';
import { apiClient } from '../api/apiClient';
import { sanitizeText } from '../utils/security';
import SocketManager from '../services/SocketManager';

interface DiscussionState {
  posts: PostData[];
  comments: Record<string, CommentData[]>;
  isLoading: boolean;
  fetchPosts: () => Promise<void>;
  getPostById: (id: string) => PostData | undefined;
  getCommentsByPostId: (postId: string) => CommentData[];
  addPost: (
    post: Omit<
      PostData,
      'id' | 'timestamp' | 'upvotes' | 'downvotes' | 'commentCount' | 'votedUsers'
    >
  ) => Promise<void>;
  addComment: (
    postId: string,
    userId: string,
    userName: string,
    content: string
  ) => Promise<void>;
  fetchComments: (postId: string) => Promise<CommentData[]>;
  votePost: (postId: string, type: 'up' | 'down') => Promise<void>;
  clearAllDiscussions: () => Promise<void>;
  joinPost: (postId: string) => void;
  leavePost: (postId: string) => void;
  handleIncomingComment: (postId: string, comment: CommentData) => void;
  handleVoteUpdate: (data: any) => void;
}

export const useDiscussionStore = create<DiscussionState>()(
  persist(
    (set, get) => ({
      posts: [],
      comments: {},
      isLoading: false,

      joinPost: (postId: string) => {
        SocketManager.emit('join_post', { postId });
      },

      leavePost: (postId: string) => {
        SocketManager.emit('leave_post', { postId });
      },

      handleIncomingComment: (postId: string, comment: CommentData) => {
        const currentComments = get().comments[postId] || [];
        
        // 1. Check if this exact comment (by ID) already exists to avoid duplicates
        if (currentComments.some(c => c.id === comment.id)) return;

        // 2. Look for an optimistic (temporary) comment from the same user with same content
        // This prevents the "double message" bug for the sender
        const tempCommentIndex = currentComments.findIndex(
          c => c.id.startsWith('temp-') && 
               c.authorId === comment.authorId && 
               c.content === comment.content
        );

        set(state => {
          let newComments = [...(state.comments[postId] || [])];
          let countIncrement = 1;

          if (tempCommentIndex !== -1) {
            // Replace the temporary comment with the real one from the server
            newComments[tempCommentIndex] = comment;
            countIncrement = 0; // Already incremented when the temp comment was added
          } else {
            // If no temp comment found, add it as a new one
            newComments.push(comment);
          }

          return {
            comments: {
              ...state.comments,
              [postId]: newComments,
            },
            posts: state.posts.map(p =>
              p.id === postId ? { ...p, commentCount: p.commentCount + countIncrement } : p
            ),
          };
        });
      },

      handleVoteUpdate: (data: any) => {
        set(state => ({
          posts: state.posts.map(p =>
            p.id === data.postId
              ? {
                  ...p,
                  upvotes: data.upvotes,
                  downvotes: data.downvotes,
                  votedUsers: data.votedUsers,
                }
              : p
          ),
        }));
      },

      fetchPosts: async () => {
        try {
          set({ isLoading: true });
          const data = await apiClient('posts', { method: 'GET' });
          set({ posts: data as PostData[], isLoading: false });
        } catch (e: any) {
          set({ isLoading: false });
        }
      },

      getPostById: id => get().posts.find(p => p.id === id),
      getCommentsByPostId: postId => get().comments[postId] || [],

      addPost: async data => {
        await apiClient('posts', {
          method: 'POST',
          body: JSON.stringify({ ...data, content: sanitizeText(data.content) }),
        });
        await get().fetchPosts();
      },

      // Optimistic: immediately add the comment, then send via API
      addComment: async (postId, userId, userName, content) => {
        const tempComment: CommentData = {
          id: `temp-${Date.now()}`,
          postId,
          authorId: userId,
          authorName: userName,
          content: sanitizeText(content.trim()),
          timestamp: new Date().toISOString(),
          parentId: undefined,
          depth: 0,
          upvotes: 0,
          downvotes: 0,
        };

        // Optimistically add
        set(state => ({
          comments: {
            ...state.comments,
            [postId]: [...(state.comments[postId] || []), tempComment],
          },
          posts: state.posts.map(p =>
            p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p
          ),
        }));

        try {
          await apiClient(`posts/${postId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ content: sanitizeText(content.trim()) }),
          });
        } catch (e: any) {
          // Revert optimistic update on error
          set(state => ({
            comments: {
              ...state.comments,
              [postId]: (state.comments[postId] || []).filter(c => c.id !== tempComment.id),
            },
            posts: state.posts.map(p =>
              p.id === postId ? { ...p, commentCount: Math.max(0, p.commentCount - 1) } : p
            ),
          }));
          console.error('Failed to add comment', e);
        }
      },

      fetchComments: async postId => {
        try {
          const data = await apiClient(`posts/${postId}/comments`, { method: 'GET' }) as CommentData[];
          set(state => ({ comments: { ...state.comments, [postId]: data } }));
          return data;
        } catch (e: any) {
          return [];
        }
      },

      votePost: async (postId, type) => {
        try {
          await apiClient(`posts/${postId}/vote`, {
            method: 'POST',
            body: JSON.stringify({ type }),
          });
        } catch (e: any) {}
      },

      clearAllDiscussions: async () => {
        set({ posts: [], comments: {} });
      },
    }),
    {
      name: 'discussion-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({ posts: state.posts, comments: state.comments }),
    }
  )
);
