import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Components } from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
}

// ReactMarkdown의 컴포넌트들을 외부 상수로 분리하여 재사용성 향상
const markdownComponents: Components = {
  code({ inline, className, children, ...props }: {
    inline?: boolean;
    className?: string;
    children?: React.ReactNode;
  }) {
    const match = /language-(\w+)/.exec(className || '');
    
    if (!inline && match) {
      return (
        <SyntaxHighlighter
          style={oneDark as { [key: string]: React.CSSProperties }}
          language={match[1]}
          PreTag="pre"
          className="rounded-md"
          customStyle={{
            fontSize: '0.875rem',
            lineHeight: '1.5',
            padding: '1rem'
          }}
          {...props}
        >
          {children !== undefined ? String(children).replace(/\n$/, '') : ""}
        </SyntaxHighlighter>
      );
    }
    
    return (
      <code className="bg-gray-200 px-1 py-0.5 rounded text-base" {...props}>
        {children}
      </code>
    );
  },
  // Custom table rendering for better styling
  table({ children }) {
    return (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full divide-y divide-gray-200">
          {children}
        </table>
      </div>
    );
  },
  thead({ children }) {
    return <thead className="bg-gray-50">{children}</thead>;
  },
  th({ children }) {
    return (
      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-white">
        {children}
      </th>
    );
  },
  td({ children }) {
    return (
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 bg-white">
        {children}
      </td>
    );
  },
  // Custom link rendering for security
  a({ href, children }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 underline"
      >
        {children}
      </a>
    );
  },
  // Custom list rendering
  ul({ children }) {
    return <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>;
  },
  // Custom heading rendering - prose 클래스와의 충돌 방지
  h1({ children }) {
    return <h1 className="text-2xl font-bold mt-4 mb-2 prose-h1:text-2xl">{children}</h1>;
  },
  h2({ children }) {
    return <h2 className="text-xl font-bold mt-3 mb-2 prose-h2:text-xl">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="text-lg font-semibold mt-2 mb-1 prose-h3:text-lg">{children}</h3>;
  },
  // Custom blockquote
  blockquote({ children }) {
    return (
      <blockquote className="border-l-4 border-gray-300 pl-4 py-2 my-2 italic text-gray-700">
        {children}
      </blockquote>
    );
  },
  // Custom emphasis rendering
  em({ children }) {
    return <em className="italic">{children}</em>;
  },
};

export const MarkdownRenderer = memo(({ content }: MarkdownRendererProps) => {
  return (
    <div className="markdown-content prose prose-sm max-w-none prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-ol:my-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});