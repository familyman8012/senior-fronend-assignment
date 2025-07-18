import { memo, useMemo } from 'react';
import DOMPurify from 'dompurify';

interface HTMLRendererProps {
  content: string;
  isStreaming?: boolean;
}

// 반복적인 인스턴스화를 피하기 위해 싱글톤 DOMParser 인스턴스 생성
const domParser = new DOMParser();

export const HTMLRenderer = memo(({ content, isStreaming = false }: HTMLRendererProps) => {
  // 스트리밍 중 불완전한 태그를 처리하기 위해 콘텐츠 처리
  const processedContent = useMemo(() => {
    if (!isStreaming) {
      return content;
    }

    // 마지막 불완전한 태그 찾기
    const lastOpenTagIndex = content.lastIndexOf('<');
    const lastCloseTagIndex = content.lastIndexOf('>');

    // 닫히지 않은 태그가 있으면 그 앞부분까지 콘텐츠를 자름
    if (lastOpenTagIndex > lastCloseTagIndex) {
      return content.substring(0, lastOpenTagIndex);
    }

    return content;
  }, [content, isStreaming]);

  // XSS 공격을 방지하기 위해 HTML 살균
  const sanitizedHTML = useMemo(() => {
    // 기본 설정으로 DOMPurify 사용
    const clean = DOMPurify.sanitize(processedContent);

    // 모든 링크에 target="_blank" 및 rel="noopener noreferrer" 추가
    const doc = domParser.parseFromString(clean, 'text/html');
    const links = doc.querySelectorAll('a');
    links.forEach(link => {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    });

    return doc.body.innerHTML;
  }, [processedContent]);

  return (
    <div 
      className="html-content prose prose-sm dark:prose-invert max-w-none prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2"
      dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
    />
  );
});