import { memo } from 'react';
import { ContentType } from '@/types/chat';
import { MarkdownRenderer } from './MarkdownRenderer';
import { HTMLRenderer } from './HTMLRenderer';
import { JSONRenderer } from './JSONRenderer';
import { TextRenderer } from './TextRenderer';

const contentRenderers = {
  markdown: MarkdownRenderer,
  html: HTMLRenderer,
  json: JSONRenderer,
  text: TextRenderer
} as const;

interface ContentRendererProps {
  content: string;
  contentType: ContentType;
  isStreaming?: boolean;
}

export const ContentRenderer = memo(({ content, contentType, isStreaming }: ContentRendererProps) => {
  const Renderer = contentRenderers[contentType] || contentRenderers.text;
  
  const needsBackground = contentType === 'markdown' || contentType === 'html';
  
  return (
    <div className={needsBackground ? 'bg-white/50 rounded-lg p-4 -mx-2' : ''}>
      <Renderer content={content} isStreaming={isStreaming} />
    </div>
  );
});