import { memo, useMemo, useState, useCallback, lazy, Suspense, useEffect } from 'react';

// 동적 import를 위한 lazy loading
const SyntaxHighlighter = lazy(() => 
  import('react-syntax-highlighter').then(module => ({
    default: module.Prism
  }))
);

interface JSONRendererProps {
  content: string;
}

interface JSONTreeNodeProps {
  data: unknown;
  keyPath: string;
}

type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
type JSONObject = { [key: string]: JSONValue };
type JSONArray = JSONValue[];

// 개별 노드 컴포넌트 분할로 성능 최적화
const JSONTreeNode = memo(({ data, keyPath }: JSONTreeNodeProps) => {
  const [collapsed, setCollapsed] = useState<boolean>(false);

  const toggleCollapse = useCallback(() => {
    setCollapsed(prev => !prev);
  }, []);

  // 재귀 함수의 메모이제이션 개선 - useMemo로 계산 결과 보존
  const renderedValue = useMemo(() => {
    const renderValue = (value: unknown, currentPath: string): JSX.Element => {
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
        return (
          <span>
            {value.length > 0 && (
              <button
                onClick={toggleCollapse}
                className="text-gray-600 hover:text-gray-800 mr-1 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                aria-expanded={!collapsed}
                aria-label={collapsed ? '배열 펼치기' : '배열 접기'}
              >
                <span aria-hidden="true">{collapsed ? '▶' : '▼'}</span>
                <span className="sr-only">{collapsed ? '배열 펼치기' : '배열 접기'}</span>
              </button>
            )}
            <span className="text-gray-600">[</span>
            {!collapsed && value.length > 0 && (
              <div className="ml-4">
                {value.map((item, index) => (
                  <div key={JSON.stringify([currentPath, 'array', index])}>
                    <span className="text-gray-400">{index}:</span>{' '}
                    <JSONTreeNode 
                      data={item} 
                      keyPath={JSON.stringify([currentPath, 'array', index])}
                    />
                    {index < value.length - 1 && <span className="text-gray-600">,</span>}
                  </div>
                ))}
              </div>
            )}
            {collapsed && value.length > 0 && <span className="text-gray-400">...({value.length}개 항목)</span>}
            <span className="text-gray-600">]</span>
          </span>
        );
      }

      if (typeof value === 'object' && value !== null) {
        const entries = Object.entries(value as JSONObject);
        return (
          <span>
            {entries.length > 0 && (
              <button
                onClick={toggleCollapse}
                className="text-gray-600 hover:text-gray-800 mr-1 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                aria-expanded={!collapsed}
                aria-label={collapsed ? '객체 펼치기' : '객체 접기'}
              >
                <span aria-hidden="true">{collapsed ? '▶' : '▼'}</span>
                <span className="sr-only">{collapsed ? '객체 펼치기' : '객체 접기'}</span>
              </button>
            )}
            <span className="text-gray-600">{'{'}</span>
            {!collapsed && entries.length > 0 && (
              <div className="ml-4">
                {entries.map(([k, v], index) => (
                  <div key={JSON.stringify([currentPath, 'object', k])}>
                    <span className="text-purple-600">"{k}"</span>
                    <span className="text-gray-600">: </span>
                    <JSONTreeNode 
                      data={v} 
                      keyPath={JSON.stringify([currentPath, 'object', k])}
                    />
                    {index < entries.length - 1 && <span className="text-gray-600">,</span>}
                  </div>
                ))}
              </div>
            )}
            {collapsed && entries.length > 0 && <span className="text-gray-400">...({entries.length}개 속성)</span>}
            <span className="text-gray-600">{'}'}</span>
          </span>
        );
      }

      return <span className="text-gray-700">{String(value)}</span>;
    };

    return renderValue(data, keyPath);
  }, [data, keyPath, collapsed]);

  return <>{renderedValue}</>;
});

JSONTreeNode.displayName = 'JSONTreeNode';

export const JSONRenderer = memo(({ content }: JSONRendererProps) => {
  const [viewMode, setViewMode] = useState<'tree' | 'raw'>('tree');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  // SyntaxHighlighter style 로딩 개선
  const [syntaxStyle, setSyntaxStyle] = useState<Record<string, React.CSSProperties> | null>(null);
  
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

  // 스타일 모듈을 lazy import 한 뒤 컴포넌트 레벨에서 상태 갱신
  useEffect(() => {
    const loadStyle = async () => {
      try {
        const { oneDark } = await import('react-syntax-highlighter/dist/esm/styles/prism');
        setSyntaxStyle(oneDark);
      } catch (error) {
        console.error('SyntaxHighlighter 스타일 로딩 실패:', error);
      }
    };

    if (viewMode === 'raw') {
      loadStyle();
    }
  }, [viewMode]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(parsedData, null, 2));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('클립보드 복사 실패:', err);
      // 폴백: 텍스트 선택 방식
      const textArea = document.createElement('textarea');
      textArea.value = JSON.stringify(parsedData, null, 2);
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }, [parsedData]);

  if (error) {
    return (
      <div className="json-content">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-red-600">JSON 파싱 오류</span>
          <span className="text-xs text-gray-500">({error})</span>
        </div>
        <pre className="bg-red-50 border border-red-200 p-3 rounded overflow-x-auto">
          <code className="text-sm text-red-800">{content}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className="json-content">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-600">JSON 데이터</span>
        <div className="flex gap-2" role="toolbar" aria-label="JSON 뷰어 도구">
          <button
            onClick={() => setViewMode('tree')}
            className={`px-2 py-1 text-xs rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              viewMode === 'tree' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            aria-pressed={viewMode === 'tree'}
          >
            트리 뷰
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={`px-2 py-1 text-xs rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              viewMode === 'raw' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            aria-pressed={viewMode === 'raw'}
          >
            원본
          </button>
          <button
            onClick={handleCopy}
            className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="JSON 데이터 클립보드에 복사"
          >
            {copySuccess ? '복사됨!' : '복사'}
          </button>
        </div>
      </div>
      
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {viewMode === 'tree' ? '트리 뷰로 표시 중' : '원본 뷰로 표시 중'}
      </div>
      
      {viewMode === 'tree' ? (
        <div className="bg-gray-50 p-3 rounded font-mono text-sm overflow-x-auto">
          <JSONTreeNode data={parsedData} keyPath="root" />
        </div>
      ) : (
        <Suspense fallback={<div className="bg-gray-100 p-3 rounded">로딩 중...</div>}>
          {syntaxStyle ? (
            <SyntaxHighlighter
              language="json"
              style={syntaxStyle}
              className="rounded"
            >
              {JSON.stringify(parsedData, null, 2)}
            </SyntaxHighlighter>
          ) : (
            <div className="bg-gray-100 p-3 rounded">스타일 로딩 중...</div>
          )}
        </Suspense>
      )}
    </div>
  );
});

JSONRenderer.displayName = 'JSONRenderer';