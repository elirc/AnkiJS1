import { useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { getAnswerPages } from "../teaching/answers";
import { MarkdownView } from "./MarkdownView";

export function AnswerExplorer({
  front,
  back,
}: {
  front: string;
  back: string;
}) {
  // The keyed inner reader resets when the question or edited answer changes.
  return (
    <AnswerReader key={`${front}\u0000${back}`} front={front} back={back} />
  );
}

function AnswerReader({ front, back }: { front: string; back: string }) {
  const { pages, credit } = useMemo(
    () => getAnswerPages(front, back),
    [front, back],
  );
  const [index, setIndex] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const page = pages[index];
  const multiple = pages.length > 1;
  function changePage(next: number, moveFocus = true) {
    setIndex(Math.max(0, Math.min(next, pages.length - 1)));
    if (!moveFocus) return;
    // Bring the new explanation into view after a long code example on a phone.
    requestAnimationFrame(() => {
      const element = heading.current;
      if (!element) return;
      element.focus({ preventScroll: true });
      const rect = element.getBoundingClientRect();
      if (rect.top < 0 || rect.top > window.innerHeight * 0.7)
        element.scrollIntoView({ block: "start" });
    });
  }
  return (
    <div className="answer-explorer">
      <div className="explanation-topline">
        <span>
          <BookOpen size={15} /> Answer
        </span>
        {multiple && (
          <span role="status">
            Explanation {index + 1} of {pages.length}
          </span>
        )}
      </div>
      {multiple && (
        <label className="explanation-select-label">
          Explore another way
          <select
            aria-label="Explanation style"
            value={index}
            onChange={(event) => changePage(Number(event.target.value), false)}
          >
            {pages.map((item, i) => (
              <option key={`${i}:${item.title}`} value={i}>
                {i + 1}. {item.title}
              </option>
            ))}
          </select>
        </label>
      )}
      <h2 className="explanation-heading" tabIndex={-1} ref={heading}>
        {page.title}
      </h2>
      <div className="explanation-body" aria-live="polite">
        <ExplanationBody key={`${index}:${page.body}`} body={page.body} />
      </div>
      {multiple && (
        <div
          className="explanation-navigation"
          aria-label="Answer explanations"
        >
          <button
            type="button"
            disabled={index === 0}
            onClick={() => changePage(index - 1)}
          >
            <ArrowLeft size={16} />
            Previous
          </button>
          <button
            type="button"
            className="explanation-next"
            onClick={() =>
              changePage(index === pages.length - 1 ? 0 : index + 1)
            }
          >
            {index === pages.length - 1
              ? "Back to first explanation"
              : "Next explanation"}
            <ArrowRight size={16} />
          </button>
        </div>
      )}
      {credit && (
        <MarkdownView source={credit} className="explanation-credit" />
      )}
    </div>
  );
}

function ExplanationBody({ body }: { body: string }) {
  const [checked, setChecked] = useState(false);
  const marker = "<!-- recall:solution -->";
  const boundary = body.indexOf(marker);
  if (boundary < 0)
    return <MarkdownView source={body} className="card-answer" />;
  return (
    <>
      <MarkdownView source={body.slice(0, boundary)} className="card-answer" />
      <button
        className="practice-reveal"
        type="button"
        aria-expanded={checked}
        onClick={() => setChecked(!checked)}
      >
        {checked ? "Hide practice solution" : "Check my answer"}
      </button>
      {checked && (
        <div className="practice-solution">
          <MarkdownView
            source={body.slice(boundary + marker.length)}
            className="card-answer"
          />
        </div>
      )}
    </>
  );
}
