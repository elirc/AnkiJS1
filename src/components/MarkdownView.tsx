import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "../lib/cn";

export function MarkdownView({
  source,
  className,
}: {
  source: string;
  className?: string;
}) {
  return (
    <div className={cn("markdown max-w-none text-text", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
        {source || " "}
      </ReactMarkdown>
    </div>
  );
}
