import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Message, ChatState } from '@/types/chat';

interface ChatActions {
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  deleteMessage: (id: string) => void;
  clearMessages: () => void;
  setError: (error: string | null) => void;
  setStreamingId: (id: string | null) => void;
  appendToStreamingMessage: (id: string, content: string) => void;
  truncateMessagesFrom: (id: string) => void;
  editMessage: (id: string, newContent: string) => void;
  setAbortController: (controller: AbortController | null) => void;
  getAbortController: () => AbortController | null;
  setCurrentChatId: (chatId: string | null) => void;
  createNewChat: () => void;
  saveCurrentChat: () => void;
}

type ChatStore = ChatState & ChatActions & {
  abortController: AbortController | null;
  currentChatId: string | null;
};

const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useChatStore = create<ChatStore>()(
  devtools(
    persist(
      (set, get) => ({
        // State
        messages: [],
        error: null,
        currentStreamingId: null,
        abortController: null,
        currentChatId: null,

        // Actions
        addMessage: (message) => {
          const newMessage: Message = {
            ...message,
            id: generateId(),
            timestamp: new Date(),
            contentType: message.role === 'user' ? 'text' : message.contentType,
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

        setError: (error) => {
          set({ error });
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

        setAbortController: (controller) => {
          set({ abortController: controller });
        },

        getAbortController: () => {
          return get().abortController;
        },

        setCurrentChatId: (chatId) => {
          set({ currentChatId: chatId });
        },

        createNewChat: () => {
          const chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          set({ currentChatId: chatId, messages: [], error: null });
        },

        saveCurrentChat: () => {
          const state = get();
          if (!state.currentChatId || state.messages.length === 0) return;

          const title = state.messages[0].content.slice(0, 10) + '...';
          const chatData = {
            id: state.currentChatId,
            title,
            messages: state.messages.filter((msg) => !msg.isStreaming),
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // Load existing chats
          const existingChats = JSON.parse(localStorage.getItem('chatSessions') || '[]');
          
          // Update if exists, otherwise add new
          const chatIndex = existingChats.findIndex((chat: any) => chat.id === state.currentChatId);
          if (chatIndex !== -1) {
            existingChats[chatIndex] = { ...chatData, createdAt: existingChats[chatIndex].createdAt };
          } else {
            existingChats.unshift(chatData);
          }

          localStorage.setItem('chatSessions', JSON.stringify(existingChats));
        },
      }),
      {
        name: 'chat-storage',
        partialize: (state) => ({
          messages: state.messages.filter((msg) => !msg.isStreaming),
          currentChatId: state.currentChatId,
        }),
      }
    )
  )
);