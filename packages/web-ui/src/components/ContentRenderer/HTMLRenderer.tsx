import { memo, useMemo } from 'react';
import DOMPurify from 'dompurify';

interface HTMLRendererProps {
  content: string;
  isStreaming?: boolean;
}

// Create a singleton DOMParser instance to avoid repeated instantiation
const domParser = new DOMParser();

export const HTMLRenderer = memo(({ content, isStreaming = false }: HTMLRendererProps) => {
  // Process content to handle incomplete tags during streaming
  const processedContent = useMemo(() => {
    if (!isStreaming) {
      return content;
    }

    // Find the last incomplete tag
    const lastOpenTagIndex = content.lastIndexOf('<');
    const lastCloseTagIndex = content.lastIndexOf('>');

    // If there's an unclosed tag, trim content before it
    if (lastOpenTagIndex > lastCloseTagIndex) {
      return content.substring(0, lastOpenTagIndex);
    }

    return content;
  }, [content, isStreaming]);

  // Sanitize HTML to prevent XSS attacks
  const sanitizedHTML = useMemo(() => {
    // Use DOMPurify with default settings
    const clean = DOMPurify.sanitize(processedContent);

    // Add target="_blank" and rel="noopener noreferrer" to all links
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
      className="html-content prose prose-sm max-w-none prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2"
      dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
    />
  );
});