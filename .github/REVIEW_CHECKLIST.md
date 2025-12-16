# Code Review Checklist

Use this checklist to ensure comprehensive and consistent reviews.

## 1. Context & Purpose
- [ ] **Problem Understanding**: Do I understand *why* this change is needed?
- [ ] **Issue Linking**: Is the PR linked to a tracking issue?
- [ ] **Scope Check**: Does the PR address only what it claims to? (No scope creep)

## 2. Architecture & Design
- [ ] **Pattern Adherence**: Does it follow existing patterns (e.g., Service Layer, Event Sourcing)?
- [ ] **Separation of Concerns**: Is logic properly separated from UI?
- [ ] **Complexity**: Is the solution as simple as possible?
- [ ] **Scalability**: Will this scale with more users/data?

## 3. Code Quality
- [ ] **Readability**: Is the code easy to understand?
- [ ] **Naming**: do variable/function names clearly convey intent?
- [ ] **Type Safety**: Are `any` types avoided? Are interfaces defined?
- [ ] **Comments**: Are "why" comments present for complex logic? (Avoid "what" comments)
- [ ] **Constants**: Are magic numbers/strings extracted to constants?

## 4. Reliability & Error Handling
- [ ] **Error States**: Are success, failure, and loading states handled?
- [ ] **Edge Cases**: What happens with empty lists, null values, or network failures?
- [ ] **Recovery**: Can the system recover from a failure here?
- [ ] **Logging**: Is appropriate logging added for debugging?

## 5. Security (Critical)
- [ ] **Input Validation**: Is all user input validated (Zod schemas)?
- [ ] **Authorization**: Are permissions checked before sensitive actions?
- [ ] **Data Exposure**: Is sensitive data (tokens, PII) inadvertently exposed?
- [ ] **Dependencies**: Are new dependencies safe and necessary?

## 6. Testing
- [ ] **Unit Tests**: Are pure functions and logic tested?
- [ ] **Integration Tests**: Are key flows verified?
- [ ] **Visual Tests**: Are UI changes captured in visual regression tests?
- [ ] **Test Quality**: Do tests actually verify behavior (not just coverage)?

## 7. Performance
- [ ] **Render Cycles**: Are unnecessary re-renders avoided (React.memo, useMemo)?
- [ ] **Data Fetching**: Is data fetching optimized (caching, deduplication)?
- [ ] **Bundle Size**: Are large dependencies tree-shaken or lazy-loaded?

## 8. Documentation
- [ ] **Code Docs**: Are JSDoc comments updated?
- [ ] **Project Docs**: Are README/DEVELOPMENT.md updated if architecture changed?
- [ ] **Change Log**: Is the PR description accurate for the changelog?

---

## Reviewer Etiquette
- **Be Constructive**: "Have you considered..." instead of "You should..."
- **Be Specific**: Point to lines of code and explain *why*.
- **Praise Good Work**: Don't just look for bugs; acknowledge clever solutions.
- **Nitpicks**: Label minor issues as "nitpick" or "non-blocking".
