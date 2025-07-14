import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContentRenderer } from '@/components/ContentRenderer/ContentRenderer';
import { MarkdownRenderer } from '@/components/ContentRenderer/MarkdownRenderer';
import { HTMLRenderer } from '@/components/ContentRenderer/HTMLRenderer';
import { JSONRenderer } from '@/components/ContentRenderer/JSONRenderer';
import { TextRenderer } from '@/components/ContentRenderer/TextRenderer';

describe('ContentRenderer', () => {
  it('should render markdown content', () => {
    render(<ContentRenderer content="# Hello" contentType="markdown" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hello');
  });

  it('should render HTML content', () => {
    render(<ContentRenderer content="<p>Hello HTML</p>" contentType="html" />);
    expect(screen.getByText('Hello HTML')).toBeInTheDocument();
  });

  it('should render JSON content', () => {
    render(<ContentRenderer content='{"key": "value"}' contentType="json" />);
    expect(screen.getByText('JSON 데이터')).toBeInTheDocument();
  });

  it('should render text content', () => {
    render(<ContentRenderer content="Plain text" contentType="text" />);
    expect(screen.getByText('Plain text')).toBeInTheDocument();
  });
});

describe('MarkdownRenderer', () => {
  it('should render headings', () => {
    const content = `
# Heading 1
## Heading 2
### Heading 3
    `;
    render(<MarkdownRenderer content={content} />);
    
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Heading 1');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Heading 2');
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Heading 3');
  });

  it('should render lists', () => {
    const content = `
- Item 1
- Item 2

1. Numbered 1
2. Numbered 2
    `;
    render(<MarkdownRenderer content={content} />);
    
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Numbered 1')).toBeInTheDocument();
    expect(screen.getByText('Numbered 2')).toBeInTheDocument();
  });

  it('should render code blocks', () => {
    const content = '```javascript\nconst x = 1;\n```';
    render(<MarkdownRenderer content={content} />);
    
    expect(screen.getByText('const x = 1;')).toBeInTheDocument();
  });

  it('should render links with security attributes', () => {
    const content = '[Link](https://example.com)';
    render(<MarkdownRenderer content={content} />);
    
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should render tables', () => {
    const content = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
    `;
    render(<MarkdownRenderer content={content} />);
    
    expect(screen.getByText('Header 1')).toBeInTheDocument();
    expect(screen.getByText('Cell 1')).toBeInTheDocument();
  });
});

describe('HTMLRenderer', () => {
  it('should sanitize dangerous HTML', () => {
    const dangerous = `
      <p>Safe content</p>
      <script>alert('XSS')</script>
      <img src="x" onerror="alert('XSS')">
    `;
    render(<HTMLRenderer content={dangerous} />);
    
    expect(screen.getByText('Safe content')).toBeInTheDocument();
    expect(screen.queryByText("alert('XSS')")).not.toBeInTheDocument();
  });

  it('should preserve allowed HTML tags', () => {
    const content = `
      <h1>Heading</h1>
      <p>Paragraph with <strong>bold</strong> and <em>italic</em></p>
      <ul>
        <li>List item</li>
      </ul>
    `;
    render(<HTMLRenderer content={content} />);
    
    expect(screen.getByRole('heading')).toHaveTextContent('Heading');
    expect(screen.getByText('bold')).toBeInTheDocument();
    expect(screen.getByText('italic')).toBeInTheDocument();
    expect(screen.getByText('List item')).toBeInTheDocument();
  });

  it('should add security attributes to links', () => {
    const content = '<a href="https://example.com">Link</a>';
    render(<HTMLRenderer content={content} />);
    
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});

describe('JSONRenderer', () => {
  it('should render valid JSON', () => {
    const json = JSON.stringify({ name: 'Test', value: 123 });
    render(<JSONRenderer content={json} />);
    
    expect(screen.getByText('JSON 데이터')).toBeInTheDocument();
    expect(screen.getByText('"name"')).toBeInTheDocument();
    expect(screen.getByText('"Test"')).toBeInTheDocument();
    expect(screen.getByText('123')).toBeInTheDocument();
  });

  it('should show error for invalid JSON', () => {
    render(<JSONRenderer content="{invalid json}" />);
    
    expect(screen.getByText(/JSON 파싱 오류/)).toBeInTheDocument();
  });

  it('should render arrays', () => {
    const json = JSON.stringify(['item1', 'item2', 'item3']);
    render(<JSONRenderer content={json} />);
    
    expect(screen.getByText('"item1"')).toBeInTheDocument();
    expect(screen.getByText('"item2"')).toBeInTheDocument();
    expect(screen.getByText('"item3"')).toBeInTheDocument();
  });

  it('should render nested objects', () => {
    const json = JSON.stringify({
      outer: {
        inner: {
          value: 'nested'
        }
      }
    });
    render(<JSONRenderer content={json} />);
    
    expect(screen.getByText('"outer"')).toBeInTheDocument();
    expect(screen.getByText('"inner"')).toBeInTheDocument();
    expect(screen.getByText('"nested"')).toBeInTheDocument();
  });
});

describe('TextRenderer', () => {
  it('should render plain text', () => {
    render(<TextRenderer content="Simple text" />);
    expect(screen.getByText('Simple text')).toBeInTheDocument();
  });

  it('should preserve line breaks', () => {
    const content = 'Line 1\nLine 2\nLine 3';
    render(<TextRenderer content={content} />);
    
    expect(screen.getByText('Line 1')).toBeInTheDocument();
    expect(screen.getByText('Line 2')).toBeInTheDocument();
    expect(screen.getByText('Line 3')).toBeInTheDocument();
  });

  it('should convert URLs to links', () => {
    const content = 'Check out https://example.com for more info';
    render(<TextRenderer content={content} />);
    
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});