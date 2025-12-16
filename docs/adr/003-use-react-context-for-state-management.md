# ADR-0003: Use React Context for State Management

- Status: Accepted
- Date: 2024-05-20
- Deciders: Ariel Anders
- Technical Story: #1251

## Context and Problem Statement

We need a consistent and predictable way to manage the global state of the application. The state management solution should be easy to use, performant, and well-integrated with our React and Next.js frontend.

## Decision Drivers

- The need for a simple and lightweight state management solution.
- The desire to avoid adding large, complex libraries if not necessary.
- The goal of leveraging built-in React features as much as possible.
- The need to share state between different components in the application.

## Alternatives Considered

- React Context API
- Zustand
- Redux Toolkit

## Decision Outcome

Chosen option: "React Context API", because it is a built-in feature of React and provides a simple and effective way to share state between components. For our current needs, the complexity of a library like Redux or Zustand is not justified.

### Positive Consequences

- No additional dependencies are required.
- The API is simple and easy to learn.
- It is well-integrated with the React ecosystem.

### Negative Consequences

- Can lead to performance issues if not used carefully, as any change to the context will cause all consumers to re-render.
- Not as feature-rich as dedicated state management libraries.

## Pros and Cons of the Options

### React Context API

- Pro: Built-in to React, no extra dependencies.
- Pro: Simple and easy to use.
- Con: Can have performance issues with frequent updates.
- Con: Lacks the advanced features of dedicated libraries.

### Zustand

- Pro: Simple and lightweight.
- Pro: Good performance.
- Con: Adds another dependency to the project.
- Con: Less widely used than Redux.

### Redux Toolkit

- Pro: Powerful and feature-rich.
- Pro: Excellent developer tools.
- Con: Can be complex and boilerplate-heavy.
- Con: Adds a significant dependency to the project.
