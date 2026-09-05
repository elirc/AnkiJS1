import expandedCatalog from "./expanded-catalog.json";

export type Track =
  "Start here" | "Foundations" | "Frontend" | "Backend" | "Practice";
export interface StarterDeck {
  id: string;
  name: string;
  description: string;
  track: Track;
  icon:
    | "braces"
    | "tree"
    | "react"
    | "network"
    | "database"
    | "globe"
    | "bug"
    | "git";
  color: string;
  topics: string[];
  resource: { label: string; url: string };
  cards: [front: string, back: string][];
}

const deckId = (n: number) =>
  `a0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

// Original, bite-sized prompts: explain, predict, debug, and choose a tradeoff.
// IDs and card order are permanent so installing a curriculum never resets a review.
export const originalCurriculum: StarterDeck[] = [
  {
    id: deckId(1),
    name: "Data structures & algorithms",
    track: "Foundations",
    icon: "tree",
    color: "violet",
    description: "Recognize the pattern. Find a better solution.",
    topics: ["Big O", "Patterns", "Data structures"],
    resource: {
      label: "MIT · Introduction to algorithms",
      url: "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/",
    },
    cards: [
      [
        "An array has n items. What is the time complexity of checking every pair?",
        "**O(n²)** time. There are n(n − 1)/2 distinct pairs.\n\nAsk whether a hash map or sorting can avoid repeated work.",
      ],
      [
        "When would you choose a hash map over an array?",
        "When the main operation is lookup by a key rather than by position. Typical hash tables offer expected **O(1)** lookup and insertion, using extra memory. Worst-case lookup can be O(n).",
      ],
      [
        "Explain binary search’s most important precondition.",
        "The search space must have a **monotonic decision boundary** (a sorted array is one example). Each comparison must safely discard half the remaining candidates.\n\nTime: O(log n).",
      ],
      [
        "Two Sum: how can you avoid a nested loop?",
        "Scan once while storing previously seen numbers in a map. For each x, check whether target − x is already present, then store x.\n\nExpected **O(n) time, O(n) space**. Check before inserting so you cannot reuse the same item.",
      ],
      [
        "Which structure finds a shortest path in an unweighted graph: a stack or a queue?",
        "A **queue**, using breadth-first search. BFS explores by distance in edges. Mark vertices visited when enqueuing to avoid duplicates.\n\nO(V + E) with adjacency lists.",
      ],
      [
        "What two properties make a problem a good candidate for dynamic programming?",
        "**Overlapping subproblems** and **optimal substructure**. Define the state and transition, then memoize or tabulate results.\n\nStart by writing what each table entry means.",
      ],
      [
        "Find the bug:\n```ts\nwhile (low < high) {\n  const mid = Math.floor((low + high) / 2);\n  if (items[mid] < target) low = mid;\n  else high = mid;\n}\n```",
        "When high = low + 1, mid equals low, so low = mid makes no progress. For a lower-bound search on [low, high), use **low = mid + 1** when items[mid] < target.",
      ],
      [
        "When does a sliding window help?",
        "When a contiguous range can be expanded and shrunk while maintaining a useful invariant, such as unique characters.\n\nNot every range problem fits: negative numbers can break the monotonicity of a sum-based window.",
      ],
      [
        "What does “amortized O(1) append” mean for a dynamic array?",
        "An occasional resize costs O(n), but geometric growth spreads that cost over many appends. A sequence of n appends takes O(n) total time.\n\nIt does **not** mean every append is constant time.",
      ],
      [
        "How do you detect a cycle in a linked list using O(1) extra space?",
        "Use slow and fast pointers. Move slow one node and fast two nodes. If they meet, there is a cycle; if fast reaches the end, there is none.\n\nO(n) time, O(1) extra space.",
      ],
      [
        "A service needs the 10 largest values from a huge stream. Which structure fits?",
        "Keep a **min-heap of size 10**. Replace its minimum whenever a larger value arrives.\n\nFor general k: O(n log k) time, O(k) memory.",
      ],
      [
        "DFS recursion crashes on a very deep graph. How can you keep the traversal?",
        "Use an explicit stack and a visited set. Recursion consumes the call stack; an explicit stack avoids the runtime’s recursion depth limit.\n\nThe worst-case auxiliary space is still O(V).",
      ],
      [
        "What invariant makes two pointers work for pair-sum in a sorted array?",
        "If the sum is too small, moving the left pointer right can increase it. If too large, moving the right pointer left can decrease it.\n\nThe sorted order makes each discarded candidate safe.",
      ],
      [
        "What does topological sorting tell you about a dependency graph?",
        "It orders a **directed acyclic graph** so each prerequisite appears before its dependent. If Kahn’s algorithm processes fewer than V vertices, a directed cycle exists.",
      ],
      [
        "Before optimizing an interview solution, what should you establish?",
        "Clarify inputs and constraints, work a small example, state a correct baseline, and estimate its time and space. Then improve the bottleneck and check edge cases.",
      ],
      [
        "How do you check whether two strings are anagrams without sorting?",
        "Count character frequencies and compare counts, or increment for one string and decrement for the other.\n\nO(n + m) time. Agree on case, whitespace, and Unicode handling first.",
      ],
    ],
  },
  {
    id: deckId(2),
    name: "JavaScript & TypeScript",
    track: "Frontend",
    icon: "braces",
    color: "amber",
    description: "Know what your code actually does.",
    topics: ["Async", "Types", "Closures"],
    resource: {
      label: "MDN · JavaScript guide",
      url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide",
    },
    cards: [
      [
        'Predict the output:\n```js\nconsole.log("A");\nsetTimeout(() => console.log("B"), 0);\nPromise.resolve().then(() => console.log("C"));\nconsole.log("D");\n```',
        "**A, D, C, B.** Synchronous work runs first, then promise microtasks, then the timer task. A zero-delay timer does not run immediately.",
      ],
      [
        "What does a closure remember?",
        "A function retains access to its lexical environment, including variables from an enclosing scope. It captures access to bindings, not necessarily a frozen snapshot of values.",
      ],
      [
        "What is the difference between `unknown` and `any`?",
        "**unknown** requires narrowing before operations. **any** opts out of type checking and lets unsafe assumptions propagate. Use unknown for untrusted inputs, then validate.",
      ],
      [
        "Predict the output:\n```js\nconst a = { nested: { count: 1 } };\nconst b = { ...a };\nb.nested.count = 2;\nconsole.log(a.nested.count);\n```",
        "**2.** Object spread makes a shallow copy. Both objects still reference the same nested object. Copy each changed layer or use an appropriate deep-cloning operation.",
      ],
      [
        "Does a TypeScript interface validate JSON from an API?",
        "**No.** Types are erased at runtime. Parse external data with runtime validation before treating it as a trusted domain object. A type assertion does not perform validation.",
      ],
      [
        "When should you use `Promise.all` versus `Promise.allSettled`?",
        "**all** resolves with ordered results when all succeed and rejects on the first rejection. **allSettled** waits for every outcome.\n\nNeither automatically cancels the underlying operations.",
      ],
      [
        "What does `value ?? fallback` preserve that `value || fallback` does not?",
        "**0, false, and an empty string.** Nullish coalescing falls back only for null or undefined. Use it when those other falsy values are meaningful.",
      ],
      [
        "Why can `array.forEach(async item => ...)` surprise you?",
        "forEach ignores returned promises. The outer function does not wait for the callbacks.\n\nUse for...of with await for sequential work, or Promise.all(array.map(...)) for concurrent work.",
      ],
      [
        "How does a discriminated union prevent impossible states?",
        'Give each variant a literal discriminator and only its valid fields.\n```ts\ntype Result =\n  | { status: "ok"; data: string }\n  | { status: "error"; message: string };\n```\nChecking status narrows the available fields.',
      ],
      [
        "What is a practical use for `never`?",
        "Exhaustiveness checks. Assigning an unhandled union variant to never causes a compile error when a new case is added. It also describes functions that cannot return normally.",
      ],
      [
        "How would you cancel a fetch when a screen is no longer relevant?",
        "Create an AbortController, pass its signal to fetch, and abort during cleanup. Treat an expected abort separately from a network failure. Ignore stale responses as appropriate.",
      ],
      [
        "Debounce versus throttle: which fits search-as-you-type?",
        "**Debounce**: wait until input has been quiet for a period, then search. **Throttle**: cap how frequently an action runs during continuous events, such as scrolling.",
      ],
      [
        "What does `const` guarantee for an object?",
        "The binding cannot be reassigned. Its object can still be mutated. Object.freeze is shallow; TypeScript readonly is a compile-time restriction. Neither is a general deep-immutability solution.",
      ],
      [
        "Why is a generic function often safer than one using `any`?",
        "A generic preserves relationships between input and output types.\n```ts\nfunction first<T>(items: T[]): T | undefined {\n  return items[0];\n}\n```\nThe return type reflects the item type and the empty case.",
      ],
      [
        "What does `await` do to the JavaScript thread?",
        "It suspends the current async function until the awaited value settles. It does **not** block the whole thread. Other queued work can run while the function is suspended.",
      ],
      [
        "A UI receives responses for searches “rea” and “react” out of order. What bug can occur?",
        "An older response can overwrite the newer results. Abort obsolete requests or compare request IDs before applying results. Debouncing alone does not prevent this race.",
      ],
    ],
  },
  {
    id: deckId(3),
    name: "React & frontend",
    track: "Frontend",
    icon: "react",
    color: "blue",
    description: "Build interfaces that stay predictable.",
    topics: ["State", "Effects", "Accessibility"],
    resource: { label: "React · Learn", url: "https://react.dev/learn" },
    cards: [
      [
        "Why can three calls to `setCount(count + 1)` increment only once?",
        "They all read the same render’s count snapshot. Use updater functions when the next state depends on previous state:\n```tsx\nsetCount(c => c + 1);\n```\nThree such calls apply three increments.",
      ],
      [
        "When should a calculation be in render instead of an Effect?",
        "When it can be derived purely from current props and state, such as filtering a list. Storing derived state in an Effect adds a render and risks inconsistent values.",
      ],
      [
        "Why are array indices risky as keys for a reorderable list?",
        "React associates state with element identity. An index can now point to a different item after reordering, causing input values or component state to follow the wrong item. Use stable item IDs.",
      ],
      [
        "What should an Effect’s cleanup undo?",
        "The resources its setup acquired: subscriptions, timers, listeners, or requests. Cleanup runs before a changed Effect is set up again and on unmount.",
      ],
      [
        "Why does mutating an array in React state cause problems?",
        "React updates rely on state identity, and mutation also changes previous snapshots. Create a new array and copy changed objects.\n```tsx\nsetItems(items => items.map(item =>\n  item.id === id ? { ...item, done: true } : item\n));\n```",
      ],
      [
        "When would you use a ref instead of state?",
        "For values that must persist between renders but do not determine the rendered UI, such as a DOM node, timer ID, or synchronous in-flight guard. Updating a ref does not trigger a render.",
      ],
      [
        "An Effect reads `query` but has `[]` dependencies. What is the risk?",
        "The Effect keeps the initial query and does not rerun when it changes. Include reactive dependencies or redesign the Effect. Suppressing the dependency warning can hide stale closures.",
      ],
      [
        "What is a controlled input?",
        "Its value is driven by React state and updated through an event handler. Keep its value defined (for example, an empty string) to avoid switching between controlled and uncontrolled modes.",
      ],
      [
        "Why might a memoized child still rerender?",
        "A prop can have a new identity, such as an inline object or callback. Its own state or consumed context can also change. Measure before adding memoization.",
      ],
      [
        "What does lifting state up solve?",
        "It gives related components one source of truth in their closest common owner. Share the value and update callbacks rather than synchronizing independent copies.",
      ],
      [
        "What should happen to focus when a modal opens and closes?",
        "Move focus into it, keep keyboard focus inside while open, support Escape when appropriate, and return focus to the trigger on close. Give the dialog an accessible name.",
      ],
      [
        "A button contains only a trash icon. What is missing?",
        'An accessible name, such as aria-label="Delete card". The decorative icon should be hidden from assistive technology. Keep the tap target comfortably large.',
      ],
      [
        "Why use a native `<button>` instead of a clickable `<div>`?",
        "A button provides keyboard activation, focus behavior, semantics, and disabled support. A div requires these to be reimplemented correctly.",
      ],
      [
        "How do you choose between local state and global state?",
        "Keep state close to its consumers. Share it when multiple distant consumers need the same source of truth. Server caches, form drafts, and transient UI state have different lifetimes.",
      ],
      [
        "What problem does an Error Boundary solve, and what does it miss?",
        "It can render fallback UI when descendants throw during rendering and relevant lifecycle work. It does not generally catch event-handler errors or arbitrary async failures; handle those explicitly.",
      ],
      [
        "A page works at 1440px but overflows on a phone. Name three things to inspect.",
        "Fixed widths, flex/grid children without min-width: 0, and long unbroken content such as code. Use responsive tracks, wrapping text, and horizontally scrollable code blocks.",
      ],
    ],
  },
  {
    id: deckId(4),
    name: "System design",
    track: "Backend",
    icon: "network",
    color: "mint",
    description: "Think in tradeoffs, boundaries, and scale.",
    topics: ["Caching", "Reliability", "Distribution"],
    resource: {
      label: "AWS · Builders’ Library",
      url: "https://aws.amazon.com/builders-library/",
    },
    cards: [
      [
        "Before drawing a system-design architecture, what do you clarify?",
        "Users and core operations, expected traffic and data size, latency and availability goals, consistency needs, and scope. State assumptions so tradeoffs can be evaluated.",
      ],
      [
        "Horizontal versus vertical scaling: what changes?",
        "**Vertical** scaling gives one machine more resources. **Horizontal** scaling adds machines and requires distributing work and often state. More machines introduce coordination and failure modes.",
      ],
      [
        "What is a cache-aside read flow?",
        "Look up the cache; on a miss, read the source of truth and populate the cache. Decide how stale data is tolerated and how writes invalidate or refresh cached entries.",
      ],
      [
        "What is a cache stampede, and one way to reduce it?",
        "Many requests rebuild the same expired cache entry at once. Coalesce refreshes, use a refresh lock, or serve stale data while refreshing. Jittered expirations reduce synchronized misses.",
      ],
      [
        "Why does a payment retry need an idempotency key?",
        "The first request may have succeeded even if its response was lost. A stable key lets the server return the original outcome instead of creating another charge. Persist the key and result atomically with the operation.",
      ],
      [
        "What does eventual consistency promise?",
        "If updates stop and replication succeeds, replicas eventually converge. Reads can temporarily return stale data. It does not by itself promise a fixed convergence time or read-your-writes behavior.",
      ],
      [
        "What tradeoff does CAP describe during a network partition?",
        "A distributed system cannot guarantee both linearizable consistency and availability for every request across the partition. It must sometimes reject/delay requests or serve potentially inconsistent data.",
      ],
      [
        "Why might a message consumer see the same event twice?",
        "With at-least-once delivery, an acknowledgement can be lost after processing. Make consumers idempotent, commonly by recording processed event IDs with the resulting side effect.",
      ],
      [
        "What does the transactional outbox pattern prevent?",
        "It avoids a database update succeeding while its corresponding event is never queued. Write domain changes and an outbox record in one transaction; a worker retries delivery. Consumers still need duplicate handling.",
      ],
      [
        "Why are retries with no backoff dangerous?",
        "They can amplify overload. Use capped exponential backoff, jitter, a retry limit or deadline, and retry only suitable failures. Keep non-idempotent operations safe.",
      ],
      [
        "What is a circuit breaker?",
        "A guard that temporarily stops calling a failing dependency after a threshold. It can allow limited probes later. This reduces repeated wasted work while exposing a clear fallback or error.",
      ],
      [
        "Replication versus sharding: which increases data distribution?",
        "**Sharding** divides different data across nodes. **Replication** keeps copies of data on multiple nodes. They can be combined; sharding complicates cross-shard queries and rebalancing.",
      ],
      [
        "Why are p95/p99 latency useful alongside the average?",
        "They show how slow the tail of requests is. A reasonable average can hide a poor experience for some users, especially when a request depends on many downstream calls.",
      ],
      [
        "How does a token bucket rate limiter allow bursts?",
        "Tokens refill at a set rate up to a capacity. Each request consumes tokens. The capacity permits a bounded burst while the refill rate limits long-term throughput.",
      ],
      [
        "What should a useful service-level objective specify?",
        "A user-relevant indicator, a target, and a measurement window, such as the fraction of successful requests within a latency threshold over 30 days. It should guide operational choices.",
      ],
      [
        "How would you roll out a risky behavior change safely?",
        "Use a reversible flag or canary, observe meaningful metrics, expand gradually, and define rollback criteria before rollout. Verify schema changes remain compatible with old and new code.",
      ],
    ],
  },
  {
    id: deckId(5),
    name: "Databases & SQL",
    track: "Backend",
    icon: "database",
    color: "rose",
    description: "Ask better questions of your data.",
    topics: ["Queries", "Indexes", "Transactions"],
    resource: {
      label: "PostgreSQL · Tutorial",
      url: "https://www.postgresql.org/docs/current/tutorial.html",
    },
    cards: [
      [
        "What do the four ACID properties stand for?",
        "**Atomicity:** all or none. **Consistency:** preserve defined invariants. **Isolation:** control interference between concurrent transactions. **Durability:** committed data survives failures within the system’s guarantees.",
      ],
      [
        "A LEFT JOIN is followed by `WHERE right.active = true`. What can go wrong?",
        "Unmatched rows have NULL on the right, so the WHERE clause removes them. If all left rows should remain, put the right-side condition in the JOIN’s ON clause.",
      ],
      [
        "Why not index every column?",
        "Indexes consume storage and add write/maintenance cost. Choose them based on query predicates, joins, ordering, selectivity, and real execution plans.",
      ],
      [
        "What is the N+1 query problem?",
        "One query fetches N records, followed by one extra query for each record. Use a join, eager loading, or a batched lookup to reduce round trips.",
      ],
      [
        "Write a query to find duplicate emails in a users table.",
        "```sql\nSELECT email, COUNT(*)\nFROM users\nGROUP BY email\nHAVING COUNT(*) > 1;\n```\nWHERE filters input rows; HAVING filters groups.",
      ],
      [
        "What does a composite B-tree index on `(user_id, created_at)` suit?",
        "Queries that filter by user_id and then filter or order by created_at. Column order matters; queries on created_at alone may not benefit equally. Confirm with an execution plan.",
      ],
      [
        "How can two concurrent read-modify-write operations lose an increment?",
        "Both read the same old value and write the same incremented value. Use an atomic update, an appropriate lock, or optimistic concurrency with a version check.",
      ],
      [
        "What is keyset pagination?",
        "Fetch rows after the last seen ordered key instead of skipping an offset. Use a unique tie-breaker, for example `(created_at, id)`, so equal timestamps do not skip records.",
      ],
      [
        "Why can OFFSET pagination become expensive on later pages?",
        "The database may still have to scan and discard the preceding rows. Inserts and deletes can also shift offsets, causing duplicates or gaps. Keyset pagination helps for sequential traversal.",
      ],
      [
        "What is a transaction’s atomicity boundary?",
        "All operations in that transaction commit together or roll back together. An external HTTP call is generally outside that database transaction and needs separate coordination.",
      ],
      [
        "What does `NULL = NULL` return in SQL?",
        "**Unknown**, not true. Use IS NULL to test for null. SQL’s three-valued logic affects filtering and comparisons.",
      ],
      [
        "How does normalization help with data integrity?",
        "It reduces duplicated facts and update anomalies by representing relationships explicitly. Denormalize deliberately for measured read needs, with a plan to keep copies consistent.",
      ],
      [
        "When should a uniqueness rule live in the database?",
        "When it must hold under concurrency, such as a unique username. A pre-insert application check alone has a race. Use a unique constraint and handle the resulting conflict.",
      ],
      [
        "What do you inspect first in a slow query’s execution plan?",
        "Actual versus estimated row counts, large scans, expensive joins/sorts, and repeated loops. Check whether filters and indexes match the workload. EXPLAIN ANALYZE actually executes the query.",
      ],
      [
        "How do you safely add a required column to a large live table?",
        "Plan a compatible staged migration: add a nullable/defaulted field as appropriate, deploy compatible readers/writers, backfill safely, validate, then enforce the constraint. Locking costs depend on the database and operation.",
      ],
      [
        "Why should backup restoration be tested?",
        "A backup is useful only if it can be restored within required recovery time and data-loss limits. Verify schema compatibility, completeness, and application behavior after restoration.",
      ],
    ],
  },
  {
    id: deckId(6),
    name: "APIs & networking",
    track: "Backend",
    icon: "globe",
    color: "blue",
    description: "Understand the request behind the response.",
    topics: ["HTTP", "Security", "Web platform"],
    resource: {
      label: "MDN · HTTP",
      url: "https://developer.mozilla.org/en-US/docs/Web/HTTP",
    },
    cards: [
      [
        "What happens, broadly, when you open an HTTPS URL?",
        "Resolve the hostname, establish a transport connection and secure session as needed, send an HTTP request, receive a response, and render it. Caches and reused connections can skip work; HTTP/3 uses QUIC.",
      ],
      [
        "401 versus 403: what is the useful distinction?",
        "**401:** valid authentication is missing or required. **403:** the server understands the request but refuses it, often because authorization is insufficient.",
      ],
      [
        "What does HTTP method idempotency mean?",
        "Repeating the same request has the same intended server effect as making it once. It does not require identical responses. GET, PUT, and DELETE are defined as idempotent; POST generally is not.",
      ],
      [
        "Why is CORS not API authentication?",
        "CORS controls what browser scripts may read across origins. Non-browser clients are not restricted by it. The server still needs authentication and authorization for protected data.",
      ],
      [
        "What is the difference between authentication and authorization?",
        "**Authentication:** who is making the request? **Authorization:** may that identity perform this operation on this resource? Enforce authorization on the server for every protected action.",
      ],
      [
        "How does SQL parameterization prevent a common injection attack?",
        "It keeps SQL structure separate from data values, so input is not interpreted as query syntax. Do not build SQL by concatenating user text. Dynamic identifiers require separate validation.",
      ],
      [
        "What is an ETag useful for?",
        "A client can send If-None-Match to validate a cached representation and receive 304 when unchanged. If-Match can support conditional writes that prevent overwriting a changed resource.",
      ],
      [
        "When is a 429 response useful?",
        "When a caller exceeds a rate limit. Clients should respect Retry-After when provided and avoid immediate retry loops. The API should explain a sensible retry policy.",
      ],
      [
        "What does TLS protect, and what does it not protect?",
        "It provides transport encryption, integrity, and peer authentication when validated correctly. It does not prevent application authorization bugs, compromised endpoints, or unsafe handling after decryption.",
      ],
      [
        "A fetch resolves successfully for a 500 response. Why?",
        "fetch rejects for transport failures, not ordinary HTTP error statuses. Check response.ok or response.status before treating the body as a successful result.",
      ],
      [
        "What is CSRF, and when does it matter?",
        "An attacker tricks a browser into making an unwanted authenticated request, often using automatically attached cookies. Use appropriate SameSite cookies, CSRF defenses, and origin checks for relevant state changes.",
      ],
      [
        "What is stored XSS?",
        "Malicious script is persisted and later rendered unsafely for other users. Use context-appropriate output encoding, avoid unsafe HTML injection, sanitize when HTML is required, and add defense-in-depth such as CSP.",
      ],
      [
        "Why should a frontend bundle never contain a service-role secret?",
        "Browser assets are downloadable. Any bundled secret is available to users. Privileged credentials belong on a trusted server; public client keys require server-enforced access rules.",
      ],
      [
        "Why set a timeout or deadline on a network request?",
        "A dependency can hang and consume resources indefinitely. Bound waiting, cancel work when possible, and distinguish retryable failures from operations whose outcome is unknown.",
      ],
      [
        "What enables a web app to reopen without a network connection?",
        "A service worker can cache the application shell; local storage such as IndexedDB holds user data. It must be installed and assets cached beforehand. Service workers require a secure context outside localhost.",
      ],
      [
        "When would you choose server-sent events over WebSockets?",
        "For one-way server-to-client updates over HTTP, SSE can be simpler and offers reconnection behavior. WebSockets fit bidirectional message flows. Consider infrastructure and connection limits.",
      ],
    ],
  },
  {
    id: deckId(7),
    name: "Testing & debugging",
    track: "Practice",
    icon: "bug",
    color: "amber",
    description: "Find the cause. Ship with confidence.",
    topics: ["Test design", "Debugging", "Reliability"],
    resource: {
      label: "Testing Library · Guiding principles",
      url: "https://testing-library.com/docs/guiding-principles/",
    },
    cards: [
      [
        "A bug report says “sometimes my progress disappears.” What do you do first?",
        "Gather a concrete reproduction: steps, expected and observed behavior, device/browser, timing, and network state. Find the smallest repeatable failure before changing code.",
      ],
      [
        "What makes a regression test valuable?",
        "It fails for the original bug and passes for the intended behavior. Assert a meaningful user or domain outcome, not merely that a helper was called.",
      ],
      [
        "Unit versus integration tests: where is the boundary?",
        "A unit test isolates a small piece of logic. An integration test verifies that collaborating parts work across a real boundary, such as repository and database. Use both where their failure signals are useful.",
      ],
      [
        "What is the arrange–act–assert pattern?",
        "**Arrange** data and dependencies. **Act** on the behavior once. **Assert** the observable outcome. Keeping these distinct makes test intent and failures easier to read.",
      ],
      [
        "A test passes alone but fails in the suite. What should you suspect?",
        "Shared state, leaked mocks, clocks, event listeners, database records, or ordering assumptions. Reset owned state and clean up resources; do not rely on execution order.",
      ],
      [
        "Why can mocking every dependency make a test misleading?",
        "The test can verify an invented world where interfaces or behavior do not match production. Keep a few meaningful integration tests through real boundaries and mock only what the test needs to control.",
      ],
      [
        "What would you test for a daily new-card limit?",
        "Zero limit, exact exhaustion, partially used limit, another deck’s reviews, local midnight boundaries, suspended/deleted cards, and a new card reviewed more than once.",
      ],
      [
        "How can you test asynchronous UI without fixed sleeps?",
        "Wait for the observable state, such as a visible answer or persisted record, using bounded async assertions. Fixed sleeps are either slow or flaky and do not describe the expected behavior.",
      ],
      [
        "What is property-based testing good at?",
        "Generating many inputs to check invariants, such as sorting preserving elements and producing ordered output. It complements specific examples and can expose cases you did not anticipate.",
      ],
      [
        "How do you distinguish a cause from a correlated log message?",
        "Form a falsifiable hypothesis, change one relevant variable, and reproduce the result. Trace the data and control flow. The last log before a crash may be an innocent bystander.",
      ],
      [
        "What is a useful minimal reproduction?",
        "The smallest setup, input, and sequence that still demonstrates the failure. Remove unrelated layers until you can name the violated assumption.",
      ],
      [
        "Why is code coverage alone not proof of correctness?",
        "Executed code can have weak or missing assertions. A test may touch a branch without checking the right outcome. Prioritize invariants and realistic failure cases.",
      ],
      [
        "A save button is tapped twice before the database responds. What do you test?",
        "Only one mutation is committed, controls show an in-progress state, and failures allow retry. A synchronous guard prevents duplicate events before a disabled-state rerender.",
      ],
      [
        "What belongs in an actionable error message?",
        "What failed, whether data was saved, and the next useful step. Keep sensitive values out of logs and UI. Preserve diagnostic context for investigation.",
      ],
      [
        "What would you measure before optimizing a slow screen?",
        "A representative workload, end-to-end latency, render/CPU cost, database calls, and network time. Identify the largest contributor, change it, then compare using the same workload.",
      ],
      [
        "Which test is stronger: “calls save” or “reopening shows the edited card”?",
        "The second checks a durable user outcome across a boundary. A call assertion can still pass when saving the wrong data or failing to persist. Choose the scope appropriate to the risk.",
      ],
    ],
  },
  {
    id: deckId(8),
    name: "Engineering craft",
    track: "Practice",
    icon: "git",
    color: "violet",
    description: "Read code, review changes, own the outcome.",
    topics: ["Git", "Code review", "Architecture"],
    resource: {
      label: "Pro Git · The book",
      url: "https://git-scm.com/book/en/v2",
    },
    cards: [
      [
        "You have 10 minutes to understand an unfamiliar feature. Where do you start?",
        "Trace one user action from entry point through domain logic and persistence to the visible outcome. Identify the source of truth, side effects, and failure handling before reading every file.",
      ],
      [
        "What should a useful pull request description explain?",
        "The concrete problem, resulting behavior, why this approach fits, relevant validation, and material risks. Give a before/after example when it makes the change easier to review.",
      ],
      [
        "What is the difference between `git revert` and `git reset`?",
        "**revert** creates a commit that undoes another commit. **reset** moves a branch reference and may also change the index and working tree depending on mode. Revert is often suitable for shared history.",
      ],
      [
        "What makes a code review comment actionable?",
        "Name the specific behavior or risk, explain why it matters, and suggest a concrete alternative or ask a focused question. Separate required fixes from optional preferences.",
      ],
      [
        "What is an invariant? Give an example from a flashcard app.",
        "A property that must remain true across valid operations. Example: a committed card review updates the scheduling state and records its review log together. Partial success would violate that invariant.",
      ],
      [
        "Why separate pure scheduling logic from database code?",
        "Pure logic is deterministic for given inputs and easier to test. The repository owns persistence and transaction boundaries. Each layer has fewer reasons to change.",
      ],
      [
        "A helper name says `getUser`, but it also deletes stale sessions. What is the issue?",
        "The name hides a consequential side effect. Make the operation explicit or separate querying from cleanup so callers can reason about its behavior.",
      ],
      [
        "How can you disagree constructively about architecture?",
        "Agree on goals and constraints, compare concrete alternatives, make tradeoffs explicit, and use a small experiment when evidence is missing. Record the decision and what would trigger revisiting it.",
      ],
      [
        "What is a good first step before refactoring unfamiliar code?",
        "Capture its observable behavior and contracts with focused tests or examples. Identify callers and edge cases, then make a small behavior-preserving change.",
      ],
      [
        "Why are smaller, coherent commits useful?",
        "They are easier to review, explain, revert, and bisect. Each should represent a logical change that keeps the project in a useful state.",
      ],
      [
        "How does `git bisect` help locate a regression?",
        "It performs a binary search over commits between known good and bad revisions. A reproducible check classifies each midpoint until the introducing commit is isolated.",
      ],
      [
        "What belongs in a lightweight architecture decision record?",
        "Context and constraints, the decision, alternatives considered, and consequences. Include enough reasoning that a later engineer can tell whether the original assumptions still hold.",
      ],
      [
        "Why is “add retries” an incomplete fix for a failing write?",
        "A timed-out request may already have committed. Establish idempotency, classify retryable failures, and bound retries with backoff and deadlines. Otherwise a reliability fix can duplicate effects.",
      ],
      [
        "You find an unrelated bug while implementing a feature. What should you do?",
        "Assess whether it blocks the feature or threatens correctness. Fix a directly related issue with clear validation; record an independent issue separately so the change remains reviewable.",
      ],
      [
        "What distinguishes a useful abstraction from premature generalization?",
        "A useful abstraction captures a stable concept or repeated responsibility and makes its users simpler. Avoid parameters and extension points for hypothetical needs with no clear consumer.",
      ],
      [
        "How should you structure an interview story about a difficult bug?",
        "Explain the impact and constraints, your hypotheses and investigation, the evidence that isolated the cause, the fix and validation, and what changed to prevent recurrence. Be clear about your contribution.",
      ],
    ],
  },
];

export type DeckInfo = Omit<StarterDeck, "cards"> & { cardCount: number };
export const curriculum: DeckInfo[] = [
  ...originalCurriculum.map(({ cards, ...info }) => ({
    ...info,
    cardCount: cards.length,
  })),
  ...(expandedCatalog as DeckInfo[]),
];
const deckInfoById = new Map(curriculum.map((deck) => [deck.id, deck]));
export function getDeckInfo(id: string) {
  return deckInfoById.get(id);
}
export const starterCardCount = curriculum.reduce(
  (total, deck) => total + deck.cardCount,
  0,
);

export interface StarterCard {
  id: string;
  front: string;
  back: string;
}
export async function loadStarterCards(): Promise<Map<string, StarterCard[]>> {
  // Keep the expanded content out of the application shell; load it only for installation.
  const expanded = (await import("./expanded-cards.json")).default;
  const entries: [string, StarterCard[]][] = originalCurriculum.map(
    (deck, deckIndex) => [
      deck.id,
      deck.cards.map(([front, back], index) => ({
        id: `b0000000-0000-4000-8000-${String((deckIndex + 1) * 1000 + index + 1).padStart(12, "0")}`,
        front,
        back,
      })),
    ],
  );
  return new Map([
    ...entries,
    ...expanded.map((deck) => [deck.id, deck.cards] as [string, StarterCard[]]),
  ]);
}
