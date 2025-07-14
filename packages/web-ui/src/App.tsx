import ChatContainer from './components/Chat/ChatContainer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ChatHistory } from './components/ChatHistory/ChatHistory';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SkipNavigation } from './components/SkipNavigation';

function App() {
  return (
    <ErrorBoundary>
      <div className="h-full flex flex-col bg-gray-50">
        <SkipNavigation />
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-xl font-semibold text-gray-900">AI Chat Interface</h1>
              <span className="text-sm text-gray-500">Senior Frontend Assignment</span>
            </div>
          </div>
        </header>
        <main id="main-content" className="flex-1 overflow-hidden">
          <ChatContainer />
          <ChatHistory />
          <OfflineIndicator />
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;