import { memo, useMemo } from 'react';

interface TextRendererProps {
  content: string;
}

export const TextRenderer = memo(({ content }: TextRendererProps) => {
  // Convert URLs to clickable links
  const renderTextWithLinks = useMemo(() => (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  }, []);

  // Preserve line breaks and whitespace
  const lines = useMemo(() => content.split('\n'), [content]);

  return (
    <div className="text-content">
      {lines.map((line, index) => (
        <div key={index}>
          {line ? (
            <span>{renderTextWithLinks(line)}</span>
          ) : (
            <br />
          )}
        </div>
      ))}
    </div>
  );
});