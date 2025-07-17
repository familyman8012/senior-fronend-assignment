import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import { ContentRenderer } from '../ContentRenderer';

// 개별 렌더러 모의
vi.mock('../MarkdownRenderer', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <div data-testid="markdown-renderer">{content}</div>
}));

vi.mock('../HTMLRenderer', () => ({
  HTMLRenderer: ({ content }: { content: string }) => <div data-testid="html-renderer">{content}</div>
}));

vi.mock('../JSONRenderer', () => ({
  JSONRenderer: ({ content }: { content: string }) => <div data-testid="json-renderer">{content}</div>
}));

vi.mock('../TextRenderer', () => ({
  TextRenderer: ({ content }: { content: string }) => <div data-testid="text-renderer">{content}</div>
}));

describe('ContentRenderer 컴포넌트', () => {
  it('마크다운 콘텐츠를 올바르게 렌더링해야 함', () => {
    const content = '# 제목\n\n본문 내용';
    render(<ContentRenderer content={content} contentType="markdown" />);
    
    expect(screen.getByTestId('markdown-renderer')).toBeInTheDocument();
    expect(screen.getByTestId('markdown-renderer')).toHaveTextContent(content);
  });

  it('HTML 콘텐츠를 올바르게 렌더링해야 함', () => {
    const content = '<div>HTML 콘텐츠</div>';
    render(<ContentRenderer content={content} contentType="html" />);
    
    expect(screen.getByTestId('html-renderer')).toBeInTheDocument();
    expect(screen.getByTestId('html-renderer')).toHaveTextContent(content);
  });

  it('JSON 콘텐츠를 올바르게 렌더링해야 함', () => {
    const content = '{"name": "테스트"}';
    render(<ContentRenderer content={content} contentType="json" />);
    
    expect(screen.getByTestId('json-renderer')).toBeInTheDocument();
    expect(screen.getByTestId('json-renderer')).toHaveTextContent(content);
  });

  it('텍스트 콘텐츠를 올바르게 렌더링해야 함', () => {
    const content = '일반 텍스트 메시지';
    render(<ContentRenderer content={content} contentType="text" />);
    
    expect(screen.getByTestId('text-renderer')).toBeInTheDocument();
    expect(screen.getByTestId('text-renderer')).toHaveTextContent(content);
  });

  it('알 수 없는 콘텐츠 타입은 텍스트로 렌더링해야 함', () => {
    const content = '알 수 없는 타입';
    render(<ContentRenderer content={content} contentType={'unknown' as any} />);
    
    expect(screen.getByTestId('text-renderer')).toBeInTheDocument();
  });

  it('스트리밍 중일 때 적절한 props를 전달해야 함', () => {
    const content = '스트리밍 중...';
    const { container } = render(
      <ContentRenderer content={content} contentType="markdown" isStreaming={true} />
    );
    
    expect(screen.getByTestId('markdown-renderer')).toBeInTheDocument();
    // 백그라운드 스타일이 적용되어야 함
    expect(container.firstChild).toHaveClass('bg-white/50');
  });

  it('markdown과 html 타입에만 배경 스타일을 적용해야 함', () => {
    const { rerender, container } = render(
      <ContentRenderer content="내용" contentType="markdown" />
    );
    expect(container.firstChild).toHaveClass('bg-white/50');

    rerender(<ContentRenderer content="내용" contentType="html" />);
    expect(container.firstChild).toHaveClass('bg-white/50');

    rerender(<ContentRenderer content="내용" contentType="json" />);
    expect(container.firstChild).not.toHaveClass('bg-white/50');

    rerender(<ContentRenderer content="내용" contentType="text" />);
    expect(container.firstChild).not.toHaveClass('bg-white/50');
  });
});