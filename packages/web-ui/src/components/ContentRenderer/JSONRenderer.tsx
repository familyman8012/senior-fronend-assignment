import { memo, useMemo, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface JSONRendererProps {
  content: string;
}

interface JSONTreeProps {
  data: any;
  level?: number;
  isLast?: boolean;
}

const JSONTree = memo(({ data, level = 0, isLast = true }: JSONTreeProps) => {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCollapse = (key: string) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderValue = (value: any, key?: string): JSX.Element => {
    if (value === null) {
      return <span className="text-gray-500">null</span>;
    }

    if (value === undefined) {
      return <span className="text-gray-500">undefined</span>;
    }

    if (typeof value === 'boolean') {
      return <span className="text-blue-600">{value.toString()}</span>;
    }

    if (typeof value === 'number') {
      return <span className="text-green-600">{value}</span>;
    }

    if (typeof value === 'string') {
      return <span className="text-orange-600">"{value}"</span>;
    }

    if (Array.isArray(value)) {
      const isCollapsed = key && collapsed[key];
      return (
        <span>
          {key && (
            <button
              onClick={() => toggleCollapse(key)}
              className="text-gray-600 hover:text-gray-800 mr-1"
            >
              {isCollapsed ? '▶' : '▼'}
            </button>
          )}
          <span className="text-gray-600">[</span>
          {!isCollapsed && value.length > 0 && (
            <div className="ml-4">
              {value.map((item, index) => (
                <div key={index}>
                  <span className="text-gray-400">{index}:</span>{' '}
                  {renderValue(item, `${key}_${index}`)}
                  {index < value.length - 1 && ','}
                </div>
              ))}
            </div>
          )}
          {isCollapsed && <span className="text-gray-400">...</span>}
          <span className="text-gray-600">]</span>
        </span>
      );
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value);
      const isCollapsed = key && collapsed[key];
      return (
        <span>
          {key && (
            <button
              onClick={() => toggleCollapse(key)}
              className="text-gray-600 hover:text-gray-800 mr-1"
            >
              {isCollapsed ? '▶' : '▼'}
            </button>
          )}
          <span className="text-gray-600">{'{'}</span>
          {!isCollapsed && entries.length > 0 && (
            <div className="ml-4">
              {entries.map(([k, v], index) => (
                <div key={k}>
                  <span className="text-purple-600">"{k}"</span>
                  <span className="text-gray-600">: </span>
                  {renderValue(v, `${key}_${k}`)}
                  {index < entries.length - 1 && ','}
                </div>
              ))}
            </div>
          )}
          {isCollapsed && <span className="text-gray-400">...</span>}
          <span className="text-gray-600">{'}'}</span>
        </span>
      );
    }

    return <span>{String(value)}</span>;
  };

  return <>{renderValue(data)}</>;
});

export const JSONRenderer = memo(({ content }: JSONRendererProps) => {
  const [viewMode, setViewMode] = useState<'tree' | 'raw'>('tree');
  
  const { parsedData, error } = useMemo(() => {
    try {
      const parsed = JSON.parse(content);
      return { parsedData: parsed, error: null };
    } catch (e) {
      return { 
        parsedData: null, 
        error: e instanceof Error ? e.message : 'Invalid JSON' 
      };
    }
  }, [content]);

  if (error) {
    return (
      <div className="json-content">
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-2">
          <p className="text-sm text-red-700">JSON 파싱 오류: {error}</p>
        </div>
        <pre className="bg-gray-100 p-3 rounded overflow-x-auto">
          <code className="text-sm">{content}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className="json-content">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-600">JSON 데이터</span>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('tree')}
            className={`px-2 py-1 text-xs rounded ${
              viewMode === 'tree' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            트리 뷰
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={`px-2 py-1 text-xs rounded ${
              viewMode === 'raw' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            원본
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(parsedData, null, 2));
            }}
            className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            복사
          </button>
        </div>
      </div>
      
      {viewMode === 'tree' ? (
        <div className="bg-gray-50 p-3 rounded font-mono text-sm overflow-x-auto">
          <JSONTree data={parsedData} />
        </div>
      ) : (
        <SyntaxHighlighter
          language="json"
          style={oneDark}
          className="rounded"
        >
          {JSON.stringify(parsedData, null, 2)}
        </SyntaxHighlighter>
      )}
    </div>
  );
});