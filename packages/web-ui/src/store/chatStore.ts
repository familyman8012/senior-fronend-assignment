import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Message, ChatState, ContentType } from '@/types/chat';

interface ChatActions {
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  deleteMessage: (id: string) => void;
  clearMessages: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setStreamingId: (id: string | null) => void;
  appendToStreamingMessage: (id: string, content: string) => void;
  truncateMessagesFrom: (id: string) => void;
  editMessage: (id: string, newContent: string) => void;
  editMessage: (id: string, newContent: string) => void;
  editMessage: (id: string, newContent: string) => void;
}

type ChatStore = ChatState & ChatActions;

const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const detectContentType = (content: string): ContentType => {
  const lowerContent = content.toLowerCase();
  if (lowerContent.includes('markdown') || lowerContent.includes('md')) return 'markdown';
  if (lowerContent.includes('html')) return 'html';
  if (lowerContent.includes('json')) return 'json';
  return 'text';
};

export const useChatStore = create<ChatStore>()(
  devtools(
    persist(
      (set, get) => ({
        // State
        messages: [],
        isLoading: false,
        error: null,
        currentStreamingId: null,

        // Actions
        addMessage: (message) => {
          const newMessage: Message = {
            ...message,
            id: generateId(),
            timestamp: new Date(),
            contentType: message.role === 'user' ? detectContentType(message.content) : message.contentType,
          };
          set((state) => ({
            messages: [...state.messages, newMessage],
          }));
        },

        updateMessage: (id, updates) => {
          set((state) => ({
            messages: state.messages.map((msg) =>
              msg.id === id ? { ...msg, ...updates } : msg
            ),
          }));
        },

        deleteMessage: (id) => {
          set((state) => ({
            messages: state.messages.filter((msg) => msg.id !== id),
          }));
        },

        clearMessages: () => {
          set({ messages: [], error: null, currentStreamingId: null });
        },

        setLoading: (isLoading) => {
          set({ isLoading });
        },

        setError: (error) => {
          set({ error, isLoading: false });
        },

        setStreamingId: (id) => {
          set({ currentStreamingId: id });
        },

        appendToStreamingMessage: (id, content) => {
          set((state) => ({
            messages: state.messages.map((msg) =>
              msg.id === id
                ? { ...msg, content: msg.content + content }
                : msg
            ),
          }));
        },

        truncateMessagesFrom: (id) => {
          const messageIndex = get().messages.findIndex((msg) => msg.id === id);
          if (messageIndex === -1) return;

          set((state) => ({
            messages: state.messages.slice(0, messageIndex),
          }));
        },

        editMessage: (id, newContent) => {
          set((state) => {
            const messageIndex = state.messages.findIndex((msg) => msg.id === id);
            if (messageIndex === -1 || state.messages[messageIndex].role !== 'user') {
              return state; // No change if message not found or not a user message
            }

            const updatedMessages = state.messages.slice(0, messageIndex + 1).map((msg, index) =>
              index === messageIndex ? { ...msg, content: newContent } : msg
            );

            return { messages: updatedMessages };
          });
        },
      }),
      {
        name: 'chat-storage',
        partialize: (state) => ({
          messages: state.messages.filter((msg) => !msg.isStreaming),
        }),
      }
    )
  )
);