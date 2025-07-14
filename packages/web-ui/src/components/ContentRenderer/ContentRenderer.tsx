import { memo } from 'react';
import { ContentType } from '@/types/chat';
import { MarkdownRenderer } from './MarkdownRenderer';
import { HTMLRenderer } from './HTMLRenderer';
import { JSONRenderer } from './JSONRenderer';
import { TextRenderer } from './TextRenderer';

interface ContentRendererProps {
  content: string;
  contentType: ContentType;
}

export const ContentRenderer = memo(({ content, contentType }: ContentRendererProps) => {
  switch (contentType) {
    case 'markdown':
      return <MarkdownRenderer content={content} />;
    case 'html':
      return <HTMLRenderer content={content} />;
    case 'json':
      return <JSONRenderer content={content} />;
    case 'text':
    default:
      return <TextRenderer content={content} />;
  }
});