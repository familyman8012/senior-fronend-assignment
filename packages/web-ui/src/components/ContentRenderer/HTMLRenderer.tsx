import { memo, useMemo } from 'react';
import DOMPurify from 'dompurify';

interface HTMLRendererProps {
  content: string;
}

export const HTMLRenderer = memo(({ content }: HTMLRendererProps) => {
  // Sanitize HTML to prevent XSS attacks
  const sanitizedHTML = useMemo(() => {
    // Configure DOMPurify
    const config = {
      ALLOWED_TAGS: [
        'p', 'br', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'dl', 'dt', 'dd',
        'a', 'abbr', 'acronym', 'b', 'blockquote', 'cite', 'code', 'del',
        'em', 'i', 'ins', 'kbd', 'mark', 'pre', 'q', 's', 'samp', 'small',
        'strike', 'strong', 'sub', 'sup', 'time', 'u', 'var',
        'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
        'img', 'figure', 'figcaption',
        'button', 'input', 'label', 'select', 'option', 'textarea', 'form',
        'details', 'summary', 'hr'
      ],
      ALLOWED_ATTR: [
        'href', 'title', 'target', 'rel', 'class', 'id', 'style',
        'src', 'alt', 'width', 'height',
        'type', 'value', 'name', 'placeholder', 'disabled', 'checked',
        'colspan', 'rowspan', 'headers', 'scope',
        'datetime', 'cite', 'open'
      ],
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
      ADD_ATTR: ['target'],
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onkeypress', 'onkeydown', 'onkeyup'],
    };

    // Sanitize the HTML
    const clean = DOMPurify.sanitize(content, config);

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