import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/cn';

export function MarkdownView({ source, className }: { source: string; className?: string }) {
  return (
    <div
      className={cn(
        'prose prose-neutral max-w-none text-text prose-a:text-primary prose-code:rounded prose-code:bg-line prose-code:px-1 prose-code:py-0.5 prose-code:before:content-none prose-code:after:content-none dark:prose-invert',
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
        {source || ' '}
      </ReactMarkdown>
    </div>
  );
}
