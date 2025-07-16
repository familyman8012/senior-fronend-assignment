import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import ChatContainer from './components/Chat/ChatContainer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Sidebar } from './components/Sidebar/Sidebar';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SkipNavigation } from './components/SkipNavigation';
import { queryClient } from './lib/queryClient';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <div className="min-h-screen flex bg-white">
          <SkipNavigation />
          
          {/* Desktop Sidebar */}
          <div className="hidden lg:block">
            <Sidebar isOpen={true} onClose={() => {}} />
          </div>

          {/* Mobile Sidebar */}
          <div className="lg:hidden">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <header className="sticky top-0 bg-white z-10">
              <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-14">
                  <div className="flex items-center">
                    {/* Mobile menu button */}
                    <button
                      onClick={() => setIsSidebarOpen(true)}
                      className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-500"
                      aria-label="Open sidebar"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                    <h1 className="ml-4 lg:ml-0 text-lg font-medium text-gray-700">WorkAI <span className="text-gray-400 text-sm">0.1</span></h1>
                  </div>
                  <div className="flex items-center space-x-4">
                    <button
                      className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-500"
                      aria-label="New chat"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </header>

            {/* Chat Container */}
            <main id="main-content" className="flex-1">
              <ChatContainer />
              <OfflineIndicator />
            </main>
          </div>
        </div>
      </ErrorBoundary>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;