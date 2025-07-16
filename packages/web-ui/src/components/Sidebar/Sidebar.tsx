import { useState, useCallback, memo } from 'react';
import { useChatStore } from '@/store/chatStore';
import { Message } from '@/types/chat';
import clsx from 'clsx';

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar = memo(({ isOpen, onClose }: SidebarProps) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { messages, clearMessages, addMessage, currentChatId, setCurrentChatId } = useChatStore();

  // Save current session (새 대화 시작)
  const saveCurrentSession = useCallback(() => {
    if (messages.length === 0) return;

    // Clear current messages and start new chat
    clearMessages();
    setCurrentChatId(null);
  }, [messages, clearMessages, setCurrentChatId]);

  // Load session
  const loadSession = useCallback((sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    // Clear current messages
    clearMessages();
    
    // Set current chat ID for continuity
    setCurrentChatId(sessionId);
    
    // Load session messages
    session.messages.forEach(msg => {
      addMessage({
        role: msg.role,
        content: msg.content,
        contentType: msg.contentType,
      });
    });

    setSelectedSessionId(sessionId);
    onClose(); // Close mobile sidebar after selection
  }, [sessions, clearMessages, addMessage, setCurrentChatId, onClose]);

  // Delete session
  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== sessionId);
      localStorage.setItem('chatSessions', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Export session
  const exportSession = useCallback((session: ChatSession, format: 'json' | 'markdown') => {
    let content: string;
    const filename = `chat_${session.id}_${new Date().toISOString()}`;

    if (format === 'json') {
      content = JSON.stringify(session, null, 2);
    } else {
      // Markdown format
      content = `# ${session.title}\n\n`;
      content += `Created: ${session.createdAt.toLocaleString()}\n\n`;
      content += '---\n\n';
      
      session.messages.forEach(msg => {
        content += `**${msg.role === 'user' ? '사용자' : 'AI'}**: ${msg.content}\n\n`;
      });
    }

    // Create blob and download
    const blob = new Blob([content], { 
      type: format === 'json' ? 'application/json' : 'text/markdown' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${format === 'json' ? 'json' : 'md'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Filter sessions by search query
  const filteredSessions = sessions.filter(session => 
    session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.messages.some(msg => 
      msg.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // Load sessions from localStorage on mount and sync with changes
  useState(() => {
    const loadSessions = () => {
      const stored = localStorage.getItem('chatSessions');
      if (stored) {
        try {
          const parsed = JSON.parse(stored, (key, value) => {
            if (key === 'createdAt' || key === 'updatedAt') {
              return new Date(value);
            }
            return value;
          }) as ChatSession[];
          setSessions(parsed);
        } catch (error) {
          console.error('Failed to load chat sessions:', error);
        }
      }
    };
    
    loadSessions();
    
    // Listen for storage changes to sync between tabs
    const handleStorageChange = () => {
      loadSessions();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Poll for changes every 2 seconds (to catch changes in the same tab)
    const interval = setInterval(loadSessions, 2000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  });

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={clsx(
          'fixed lg:relative inset-y-0 left-0 z-50 w-64 bg-gray-50 transform transition-transform duration-300 ease-in-out flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo and New Chat */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-xs text-gray-500">
                svg영역
              </div>
              <span className="text-gray-900 font-medium">채팅</span>
            </div>
            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="lg:hidden p-1 hover:bg-gray-200 rounded text-gray-600"
              aria-label="닫기"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <button
            onClick={saveCurrentSession}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-700 transition-colors"
          >
            <div className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center text-xs">
              svg영역
            </div>
            <span className="text-sm font-medium">New chat</span>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-4">
          <input
            type="text"
            placeholder="대화 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-white text-gray-900 placeholder-gray-400 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="space-y-2">
            {filteredSessions.length === 0 ? (
              <p className="text-gray-500 text-center py-8 text-sm">저장된 대화가 없습니다</p>
            ) : (
              filteredSessions.map(session => (
                <div
                  key={session.id}
                  className={clsx(
                    'group relative rounded-lg transition-colors cursor-pointer px-3 py-2',
                    currentChatId === session.id
                      ? 'bg-gray-200'
                      : selectedSessionId === session.id
                      ? 'bg-gray-200'
                      : 'hover:bg-gray-100'
                  )}
                  onClick={() => loadSession(session.id)}
                >
                  <div>
                    <h3 className="text-sm text-gray-900 truncate pr-8">{session.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(session.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportSession(session, 'json');
                      }}
                      className="p-1 hover:bg-gray-300 rounded text-gray-600 hover:text-gray-900"
                      aria-label="JSON으로 내보내기"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportSession(session, 'markdown');
                      }}
                      className="p-1 hover:bg-gray-300 rounded text-gray-600 hover:text-gray-900"
                      aria-label="Markdown으로 내보내기"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                      className="p-1 hover:bg-red-100 rounded text-red-600 hover:text-red-700"
                      aria-label="삭제"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
});