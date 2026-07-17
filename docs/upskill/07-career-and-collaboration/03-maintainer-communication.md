# Maintainer Communication

## Ask For Help Without Outsourcing Thinking

Good question shape:
1. What you tried.
2. What you expected.
3. What happened.
4. Files/lines inspected.
5. The smallest decision you need.

## Templates

### Question
```md
I am tracing [flow]. I read `path:lines` and think the invariant is [x]. I am unsure whether [decision]. Is the intended boundary [A] or [B]?
```

### Feature Proposal
```md
Problem:
User value:
Current anchors:
Smallest useful version:
Risks:
Tests:
```

### Bug Report
```md
Steps:
Expected:
Actual:
Environment:
Relevant anchors:
Regression test idea:
```

### Responding To Review
```md
Thanks, that makes sense. I changed [x] in `path:line` and added [test]. I left [y] unchanged because [reason]; happy to split it if you prefer.
```

Respectful disagreement: cite the invariant or risk, not personal preference.
