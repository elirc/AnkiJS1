import lessonData from "../data/teaching-lessons.json";

export interface TeachingLesson {
  key: string;
  title: string;
  aliases: string[];
  question: string;
  plain: string;
  analogy: string;
  example: string;
  mistake: string;
  check: string;
  answer: string;
}
export interface AnswerPage {
  title: string;
  body: string;
}
export const teachingMarker = "<!-- recall:teaching:v1 -->";
export const teachingLessons: TeachingLesson[] = lessonData;

// A portable Markdown convention keeps explanations editable, backed up, and synced
// together with the answer, without a second source of truth for card content.
export function parseAnswerPages(back: string): AnswerPage[] | null {
  if (!back.trimStart().startsWith(teachingMarker)) return null;
  const lines = back.trimStart().slice(teachingMarker.length).split("\n");
  const pages: AnswerPage[] = [];
  let current: AnswerPage = { title: "The answer", body: "" };
  let fence: string | null = null;
  for (const line of lines) {
    const code = line.match(/^\s*(`{3,}|~{3,})/);
    if (code) {
      if (!fence) fence = code[1];
      else if (code[1][0] === fence[0] && code[1].length >= fence.length)
        fence = null;
    }
    const heading = !fence && line.match(/^## (.+)$/);
    if (heading) {
      if (current.body.trim())
        pages.push({ ...current, body: current.body.trim() });
      current = { title: heading[1].trim(), body: "" };
    } else current.body += `${line}\n`;
  }
  if (current.body.trim())
    pages.push({ ...current, body: current.body.trim() });
  return pages.length ? pages : null;
}

export function addExplanation(back: string): string {
  const existing = back.trimStart().startsWith(teachingMarker)
    ? back.trimEnd()
    : `${teachingMarker}\n\n## The answer\n\n${back.trim()}`;
  return `${existing}\n\n## Another way to understand it\n\nWrite an example or explain the idea in your own words.\n`;
}

const caseSensitiveTerms = new Set([
  "Map",
  "Set",
  "SELECT",
  "WHERE",
  "JOIN",
  "COUNT",
  "SUM",
  "HAVING",
  "UNIQUE",
]);
const sqlLessons = new Set([
  "tables",
  "select",
  "joins",
  "aggregation",
  "sql-null",
  "indexes",
  "transactions",
  "constraints",
  "sql-parameters",
]);
const gitLessons = new Set([
  "git-status",
  "git-commit",
  "branches",
  "merge-conflicts",
  "remotes",
  "gitignore",
]);
// The beginner language lessons use JavaScript semantics. Python cards can
// reuse general web engineering lessons, but not JavaScript API behavior.
const languageIndependentLessons = new Set([
  "tests",
  "validation",
  "debugging",
  "logs",
  "paths",
  "terminal",
  "apis",
  "auth",
  "caching",
  "idempotency",
  "retries",
  "concurrency",
  "background-jobs",
]);

function hasPhrase(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // A method alias such as .map may follow an identifier: prices.map.
  const start = /^[a-z0-9]/i.test(term) ? "(?<![a-z0-9])" : "";
  return new RegExp(
    `${start}${escaped}(?![a-z0-9])`,
    caseSensitiveTerms.has(term) ? "" : "i",
  ).test(text);
}

export function findTeachingLesson(
  front: string,
  back: string,
): TeachingLesson | undefined {
  // Ignore source URLs; a repository/file name is not evidence about the question.
  const clean = (text: string) =>
    text.replace(/https?:\/\/\S+/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  const question = clean(front);
  const answer = clean(back);
  const text = `${question}\n${answer}`;
  const sqlContext =
    /\b(?:sql|database|postgresql|subquery|subqueries)\b/i.test(text);
  const gitContext = /\bgit\b/i.test(text);
  const pythonContext = /```(?:python|py)\b|\bPython\b/i.test(text);
  const otherLanguage =
    /```(?:js|javascript|ts|typescript|jsx|tsx|html|css|python|py)\b|\b(?:JavaScript|TypeScript|HTML|CSS|React|Python)\b/i.test(
      text,
    );
  let best: TeachingLesson | undefined;
  let bestScore = 0;
  for (const lesson of teachingLessons) {
    if (
      sqlLessons.has(lesson.key) &&
      !sqlContext &&
      (otherLanguage || gitContext)
    )
      continue;
    if (gitLessons.has(lesson.key) && otherLanguage && !gitContext) continue;
    if (lesson.key === "missing" && sqlContext) continue;
    if (
      pythonContext &&
      !sqlContext &&
      !gitContext &&
      !languageIndependentLessons.has(lesson.key)
    )
      continue;
    let score = 0;
    if (lesson.key === "sql-null" && sqlContext) {
      if (hasPhrase(question, "NULL")) score += 6;
      if (hasPhrase(answer, "NULL")) score += 1;
    }
    for (const alias of lesson.aliases) {
      const specificity = alias.includes(".") || alias.includes(" ") ? 3 : 1;
      if (hasPhrase(question, alias)) score += 6 * specificity;
      if (hasPhrase(answer, alias)) score += specificity;
    }
    if (score > bestScore) {
      best = lesson;
      bestScore = score;
    }
  }
  return best;
}

const vocabulary: [string, string][] = [
  [
    "callback",
    "a function you hand to another piece of code so it can call it when needed",
  ],
  ["predicate", "a yes-or-no test; a function that returns true or false"],
  ["iterate", "visit the items one at a time"],
  [
    "mutation",
    "changing an existing value or object instead of creating a separate one",
  ],
  ["immutable", "treated as something you do not change after creating it"],
  [
    "asynchronous",
    "work that can finish later, so the program needs a way to handle its eventual result",
  ],
  ["parameter", "the name for an input inside a function's definition"],
  ["argument", "the actual value supplied when calling a function"],
  ["return", "send a value back to the code that called the function"],
  ["accumulator", "the running result you carry from one step to the next"],
  [
    "index",
    "a way to locate data: an array index is a position (usually starting at zero); a database index is a separate lookup structure",
  ],
  ["boolean", "a value with two possibilities: true or false"],
  [
    "reference",
    "a way to refer to an object; copying it does not necessarily copy the object",
  ],
  [
    "serialize",
    "turn data into a format that can be stored or sent, such as JSON text",
  ],
  [
    "idempotent",
    "safe to repeat in the sense that repeating the same operation does not create an extra effect",
  ],
  ["invariant", "a rule that must remain true across valid changes"],
  ["latency", "the time an operation takes from the caller's point of view"],
  ["atomic", "treated as one indivisible operation at the relevant boundary"],
  ["scope", "the part of a program in which a name is available"],
];

export function getAnswerPages(
  front: string,
  back: string,
): { pages: AnswerPage[]; credit: string } {
  const creditAt = back.lastIndexOf("\n\n---\nAdapted from ");
  const credit = creditAt >= 0 ? back.slice(creditAt + 6).trim() : "";
  const answer = (creditAt >= 0 ? back.slice(0, creditAt) : back).trim();
  const explicit = parseAnswerPages(answer);
  if (explicit) return { pages: explicit, credit };
  const guide = findTeachingLesson(front, answer);
  const codeBlocks = [...answer.matchAll(/```[^\n]*\n[\s\S]*?```/g)].map(
    (match) => match[0],
  );
  const prose = answer
    .replace(/```[^\n]*\n[\s\S]*?```/g, "")
    .replace(/^One solution:\s*/i, "")
    .trim();
  const introductory = prose
    .split(/\n\s*\n/)
    .filter(Boolean)
    .slice(0, 2)
    .join("\n\n");
  const pages: AnswerPage[] = [];
  const completion = /^One solution:/i.test(answer);
  const direct =
    completion && codeBlocks[0]
      ? `One working answer is:\n\n${codeBlocks[0]}\n\n${introductory}`
      : introductory || answer;
  pages.push({
    title: guide ? "Answer in plain English" : "The answer",
    body: guide
      ? `${direct}\n\n### The background idea: ${guide.title}\n\n${guide.plain}`
      : direct,
  });
  if (guide) {
    pages.push({
      title: "A worked example",
      body: `A smaller example of **${guide.title.toLowerCase()}**:\n\n${guide.example}`,
    });
    pages.push({ title: "Picture it another way", body: guide.analogy });
    pages.push({ title: "A common mistake", body: guide.mistake });
    pages.push({
      title: "Try a small exercise",
      body: `${guide.check}\n\n<!-- recall:solution -->\n\n${guide.answer}`,
    });
  }
  if (codeBlocks.length)
    pages.push({
      title: "The code in this card",
      body: `${introductory}\n\n${codeBlocks.join("\n\n")}\n\n**Read it slowly:** start with the input values. Follow one item or one function call at a time. Keep track of what changes, then compare the returned value with the example.`,
    });
  const terms = vocabulary
    .filter(([term]) => hasPhrase(`${front} ${answer}`, term))
    .slice(0, 7);
  if (terms.length)
    pages.push({
      title: "Translate the jargon",
      body: terms
        .map(([term, meaning]) => `- **${term}:** ${meaning}.`)
        .join("\n"),
    });
  // Preserve the complete source, including assumptions and examples not in the first paragraphs.
  if (pages.length > 1 || direct !== answer)
    pages.push({ title: "Full original answer", body: answer });
  return { pages, credit };
}
