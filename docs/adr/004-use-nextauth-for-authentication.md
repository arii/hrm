# ADR-0004: Use NextAuth for Authentication

- Status: Accepted
- Date: 2024-05-20
- Deciders: Ariel Anders
- Technical Story: #1251, #1385

## Context and Problem Statement

We need a secure and flexible authentication solution for the HRM application. The solution should support OAuth providers, handle session management, and be well-integrated with our Next.js frontend.

## Decision Drivers

- The need for a secure and battle-tested authentication library.
- The desire to support multiple OAuth providers (e.g., Spotify, Strava).
- The need for a solution that handles session management and token handling.
- The goal of having a solution that is easy to integrate with Next.js.

## Alternatives Considered

- NextAuth.js
- Auth0
- Roll our own authentication

## Decision Outcome

Chosen option: "NextAuth.js", because it is a full-featured, open-source authentication solution for Next.js applications. It provides built-in support for many OAuth providers, handles session management, and is highly customizable.

### Positive Consequences

- Secure and well-maintained.
- Easy to integrate with Next.js.
- Supports a wide range of OAuth providers.
- Handles session management and token rotation.

### Negative Consequences

- Can be complex to configure for more advanced use cases.
- The library is still evolving, so there can be breaking changes between versions.

## Pros and Cons of the Options

### NextAuth.js

- Pro: Full-featured and open-source.
- Pro: Excellent integration with Next.js.
- Pro: Strong community and good documentation.
- Con: Configuration can be complex.

### Auth0

- Pro: A powerful and flexible identity platform.
- Pro: Excellent security and support.
- Con: Can be expensive for a small project.
- Con: Adds a dependency on a third-party service.

### Roll our own authentication

- Pro: Complete control over the implementation.
- Con: Very difficult to get right and secure.
- Con: High development and maintenance overhead.
- Con: Generally not recommended unless you have a very specific need.
