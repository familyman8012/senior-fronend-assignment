import { memo, useMemo } from 'react';
import DOMPurify from 'dompurify';

interface HTMLRendererProps {
  content: string;
}

export const HTMLRenderer = memo(({ content }: HTMLRendererProps) => {
  // Sanitize HTML to prevent XSS attacks
  const sanitizedHTML = useMemo(() => {
    // Use DOMPurify with default settings
    const clean = DOMPurify.sanitize(content);

    // Add target="_blank" and rel="noopener noreferrer" to all links
    const parser = new DOMParser();
    const doc = parser.parseFromString(clean, 'text/html');
    const links = doc.querySelectorAll('a');
    links.forEach(link => {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    });

    return doc.body.innerHTML;
  }, [content]);

  return (
    <div 
      className="html-content prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
    />
  );
});