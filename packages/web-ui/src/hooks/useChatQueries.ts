import { useQuery } from '@tanstack/react-query';
import { Message } from '@/types/chat';

// Keys for React Query
export const chatQueryKeys = {
  all: ['chats'] as const,
  sessions: () => [...chatQueryKeys.all, 'sessions'] as const,
  session: (id: string) => [...chatQueryKeys.all, 'session', id] as const,
  messages: (chatId: string) => [...chatQueryKeys.session(chatId), 'messages'] as const,
};

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

// Get all chat sessions
export function useChatSessions() {
  return useQuery({
    queryKey: chatQueryKeys.sessions(),
    queryFn: async (): Promise<ChatSession[]> => {
      const sessionsStr = localStorage.getItem('chatSessions');
      if (!sessionsStr) return [];
      
      try {
        const sessions = JSON.parse(sessionsStr);
        return sessions.map((session: ChatSession) => ({
          ...session,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
        }));
      } catch (error) {
        console.error('Failed to parse chat sessions:', error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes (was cacheTime)
  });
}

// Get a specific chat session
export function useChatSession(chatId: string | null) {
  return useQuery({
    queryKey: chatQueryKeys.session(chatId || ''),
    queryFn: async (): Promise<ChatSession | null> => {
      if (!chatId) return null;
      
      const sessionsStr = localStorage.getItem('chatSessions');
      if (!sessionsStr) return null;
      
      try {
        const sessions = JSON.parse(sessionsStr);
        const session = sessions.find((s: { id: string; }) => s.id === chatId);
        
        if (!session) return null;
        
        return {
          ...session,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
        };
      } catch (error) {
        console.error('Failed to parse chat session:', error);
        return null;
      }
    },
    enabled: !!chatId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Search chat sessions
export function useSearchChatSessions(searchQuery: string) {
  const { data: sessions = [] } = useChatSessions();
  
  return useQuery({
    queryKey: [...chatQueryKeys.sessions(), 'search', searchQuery] as const,
    queryFn: async (): Promise<ChatSession[]> => {
      if (!searchQuery.trim()) return sessions;
      
      const lowerQuery = searchQuery.toLowerCase();
      return sessions.filter(session => 
        session.title.toLowerCase().includes(lowerQuery) ||
        session.messages.some(msg => 
          msg.content.toLowerCase().includes(lowerQuery)
        )
      );
    },
    enabled: !!searchQuery,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Get messages for a specific chat
export function useChatMessages(chatId: string | null) {
  return useQuery({
    queryKey: chatQueryKeys.messages(chatId || ''),
    queryFn: async (): Promise<Message[]> => {
      if (!chatId) return [];
      
      const sessionsStr = localStorage.getItem('chatSessions');
      if (!sessionsStr) return [];
      
      try {
        const sessions = JSON.parse(sessionsStr);
        const session = sessions.find((s: { id: string; }) => s.id === chatId);
        return session?.messages || [];
      } catch (error) {
        console.error('Failed to parse chat messages:', error);
        return [];
      }
    },
    enabled: !!chatId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}