# ADR-0002: Use Next.js for Frontend Framework

- Status: Accepted
- Date: 2024-05-20
- Deciders: Ariel Anders
- Technical Story: #1251

## Context and Problem Statement

We need a modern, robust, and scalable framework for building the user interface of the HRM application. The framework should provide a good developer experience, be performant, and have a strong ecosystem.

## Decision Drivers

- The need for a React-based framework to leverage existing team skills.
- The desire for features like server-side rendering (SSR) and static site generation (SSG) for performance and SEO.
- The need for a framework with a strong community and good documentation.
- The goal of having an integrated routing and data-fetching solution.

## Alternatives Considered

- Next.js
- Create React App (CRA)
- Gatsby

## Decision Outcome

Chosen option: "Next.js", because it provides a comprehensive set of features out of the box, including server-side rendering, static site generation, and a file-system-based router. Its focus on performance and developer experience makes it a great choice for this project.

### Positive Consequences

- Excellent performance due to SSR and SSG.
- Great developer experience with features like fast refresh.
- A strong and growing ecosystem of tools and libraries.
- Simplified routing and data fetching.

### Negative Consequences

- Can be more complex to set up and configure than simpler solutions like CRA.
- The custom server in `server.ts` adds some complexity to the standard Next.js architecture.

## Pros and Cons of the Options

### Next.js

- Pro: Rich feature set (SSR, SSG, routing, etc.).
- Pro: Excellent performance and developer experience.
- Pro: Strong community and ecosystem.
- Con: Can be complex for simple applications.

### Create React App (CRA)

- Pro: Simple to get started with.
- Pro: Good for client-side rendered applications.
- Con: Lacks built-in SSR and SSG.
- Con: Requires more configuration for advanced features like routing.

### Gatsby

- Pro: Excellent for static sites and blogs.
- Pro: Great performance for content-heavy sites.
- Con: Can be overkill for a dynamic application like this one.
- Con: The data layer with GraphQL can be complex.
