# Enhanced AI Code Review System

This document provides an overview of the enhanced AI-powered code review system in this repository. The system is designed to provide more focused, accurate, and actionable feedback to developers, helping to improve code quality and streamline the review process.

## Specialized Architectural Review Modes

To provide more relevant feedback, the AI review system now uses specialized review modes that are triggered based on the files changed in a pull request. These modes inject context-specific rules into the AI's prompt, allowing it to focus on the most important aspects of the code being reviewed.

The following specialized review modes are currently implemented:

-   **Real-Time & WebSocket Focus**: Triggered when changes are made to files related to the WebSocket server, real-time data handling, or the Tabata timer. This mode focuses on preventing memory leaks, race conditions, and connection management issues.
-   **Authentication & Session Focus**: Triggered when changes are made to files related to authentication, session management, or Spotify integration. This mode focuses on ensuring secure token handling, proper provider configuration, and secure storage of sensitive data.

The rules for these specialized review modes are defined in `docs/ai/specialized-rules.md`.

## Structured Review Artifacts

The AI review system now generates a structured JSON artifact called `review_result.json`. This artifact contains a detailed breakdown of the AI's findings, categorized by severity and type. The following categories are used:

-   **Security**: Potential security vulnerabilities.
-   **Performance**: Potential performance bottlenecks.
-   **Debt**: Areas of technical debt that should be addressed.
-   **Style**: Code style and formatting issues.
-   **Logic**: Errors in the code's logic.

This structured output is used to automate other parts of the development workflow, such as the creation of technical debt issues.

## Automated Issue Creation for Technical Debt

To ensure that technical debt is tracked and addressed, the CI workflow now includes a step that automatically creates GitHub issues for findings categorized as "Debt" or "Refactor" in the `review_result.json` artifact. This helps to ensure that technical debt is not overlooked and is addressed in a timely manner.

The issue creation process includes a deduplication mechanism to prevent the creation of duplicate issues for the same finding.
