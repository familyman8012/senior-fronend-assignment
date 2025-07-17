import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import { HTMLRenderer } from '../HTMLRenderer';

// DOMPurify 모의
vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((html: string) => {
      // 간단한 XSS 방지 시뮬레이션
      return html
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/on\w+="[^"]*"/gi, '');
    }),
  },
}));

describe('HTMLRenderer 컴포넌트', () => {
  it('안전한 HTML을 올바르게 렌더링해야 함', () => {
    const content = '<div><h3>제목</h3><p>본문 <strong>강조</strong></p></div>';
    const { container } = render(<HTMLRenderer content={content} />);
    
    expect(container.querySelector('h3')).toHaveTextContent('제목');
    expect(container.querySelector('p')).toHaveTextContent('본문 강조');
    expect(container.querySelector('strong')).toHaveTextContent('강조');
  });

  it('XSS 공격을 방지해야 함', () => {
    const maliciousContent = `
      <div>
        <script>alert('XSS')</script>
        <img src="x" onerror="alert('XSS')">
        <a href="javascript:alert('XSS')">링크</a>
      </div>
    `;
    const { container } = render(<HTMLRenderer content={maliciousContent} />);
    
    // script 태그가 제거되어야 함
    expect(container.querySelector('script')).not.toBeInTheDocument();
    
    // 이벤트 핸들러가 제거되어야 함
    const img = container.querySelector('img');
    expect(img?.getAttribute('onerror')).toBeNull();
  });

  it('링크에 target="_blank"와 rel="noopener noreferrer"를 추가해야 함', () => {
    const content = '<a href="https://example.com">외부 링크</a>';
    render(<HTMLRenderer content={content} />);
    
    const link = screen.getByRole('link', { name: '외부 링크' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('스트리밍 중 불완전한 태그를 처리해야 함', () => {
    const incompleteContent = '<div>완전한 내용</div><p>불완전한';
    const { container } = render(<HTMLRenderer content={incompleteContent} isStreaming={true} />);
    
    // 불완전한 태그 앞까지만 렌더링되어야 함
    expect(container.textContent).toContain('완전한 내용');
    expect(container.textContent).not.toContain('불완전한');
  });

  it('스트리밍이 아닐 때는 전체 콘텐츠를 렌더링해야 함', () => {
    const content = '<div>전체 콘텐츠</div>';
    const { container } = render(<HTMLRenderer content={content} isStreaming={false} />);
    
    expect(container.textContent).toContain('전체 콘텐츠');
  });

  it('중첩된 HTML 구조를 올바르게 렌더링해야 함', () => {
    const content = `
      <div>
        <ul>
          <li>항목 1</li>
          <li>항목 2</li>
        </ul>
        <form>
          <input type="text" placeholder="입력">
          <button>제출</button>
        </form>
      </div>
    `;
    const { container } = render(<HTMLRenderer content={content} />);
    
    const list = container.querySelector('ul');
    expect(list?.children).toHaveLength(2);
    
    const input = container.querySelector('input');
    expect(input).toHaveAttribute('placeholder', '입력');
    
    const button = container.querySelector('button');
    expect(button).toHaveTextContent('제출');
  });

  it('인라인 스타일을 유지해야 함', () => {
    const content = '<div style="color: red; font-weight: bold;">스타일 텍스트</div>';
    const { container } = render(<HTMLRenderer content={content} />);
    
    const styledDiv = container.querySelector('div[style]');
    expect(styledDiv).toHaveStyle({ color: 'red', fontWeight: 'bold' });
  });

  it('빈 콘텐츠를 처리해야 함', () => {
    const { container } = render(<HTMLRenderer content="" />);
    expect(container.querySelector('.html-content')).toBeInTheDocument();
    expect(container.textContent).toBe('');
  });
});