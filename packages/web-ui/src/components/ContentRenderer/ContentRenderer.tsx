import { lazy, Suspense, memo } from 'react';
import { ContentType } from '@/types/chat';

const contentRenderers = {
  markdown: lazy(() => import('./MarkdownRenderer').then(m => ({ default: m.MarkdownRenderer }))),
  html: lazy(() => import('./HTMLRenderer').then(m => ({ default: m.HTMLRenderer }))),
  json: lazy(() => import('./JSONRenderer').then(m => ({ default: m.JSONRenderer }))),
  text: lazy(() => import('./TextRenderer').then(m => ({ default: m.TextRenderer })))
} as const;

interface ContentRendererProps {
  content: string;
  contentType: ContentType;
}

export const ContentRenderer = memo(({ content, contentType }: ContentRendererProps) => {
  const Renderer = contentRenderers[contentType] || contentRenderers.text;
  
  return (
    <Suspense fallback={<div className="animate-pulse text-gray-400">Loading...</div>}>
      <Renderer content={content} />
    </Suspense>
  );
});