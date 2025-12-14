# Agent-Based Development Workflow

This document outlines the development philosophy for using specialized AI agents to automate and scale engineering tasks within this repository. The core concept is to separate the **execution** of a task from the **actioning** of its results.

This workflow is designed to leverage the analytical power of AI agents to produce high-quality, version-controlled artifacts, which are then used to inform a separate, human-driven implementation phase.

## The Two-Phase Process

Our methodology is divided into two distinct phases:

### Phase 1: Agent Execution & Artifact Generation

In this phase, a specialized AI agent is invoked to perform a specific, well-defined task. The agent's primary goal is to produce a comprehensive, raw output, which we refer to as an "artifact."

1.  **Definition**: Each agent is defined in a dedicated markdown file (see `docs/agents/AGENT_TEMPLATE.md`). This includes its role, methodology, and the specific, repeatable workflow it follows.
2.  **Execution**: The agent is run. This may involve analyzing the codebase, interacting with external APIs (like the GitHub CLI), or running tests.
3.  **Artifact Generation**: The agent's output is captured in a raw, version-controlled format. This is a critical step. The artifact is **not** a plan of action; it is a **log of work performed**.
    *   **Examples of Artifacts**:
        *   An audit report (`.md` file) detailing findings from a codebase review.
        *   A JSON file containing data fetched and processed from an external API.
        *   A log file from a complex build or test run.

The key principle of this phase is **data capture**. The generated artifacts are committed to the repository (typically in the `docs/audits` or a similar directory) to provide a clear, historical record of the agent's findings at a specific point in time.

### Phase 2: Actioning the Artifacts

Once an artifact has been generated and committed, it serves as the source of truth for the second phase: turning analysis into action. This phase is typically human-driven, but can be assisted by other agents.

1.  **Triage**: A developer or project manager reviews the artifact. For example, after reviewing an audit report, they decide which findings are high-priority and which are out of scope.
2.  **Creation of Actionable Items**: The insights from the artifact are used to create concrete, actionable tasks.
    *   **Primary Method**: Creating detailed GitHub Issues from the findings. For example, a single audit report might be broken down into 5-10 specific issues, each with a clear scope and acceptance criteria.
    *   **Alternative Method**: Creating a new pull request that directly addresses one or more of the findings.
3.  **Implementation**: Developers work on the GitHub Issues or pull requests generated in the previous step.

## Why This Workflow?

This two-phase process provides several key advantages:

*   **Decoupling Analysis from Implementation**: It separates the often complex and time-consuming task of analysis from the work of writing code. This allows us to run broad audits without immediately committing to fixing every finding.
*   **Traceability and Version Control**: By committing the agent's raw output (the artifact), we have a version-controlled history of the repository's state and the agent's findings at that time. This is invaluable for tracking progress and understanding historical context.
*   **Improved Project Management**: It allows for a more thoughtful and deliberate approach to addressing technical debt and improvements. We can triage the findings from an audit and prioritize them according to our current goals, rather than being forced to act on everything at once.
*   **Scalability**: It provides a framework for scaling our engineering efforts. We can run multiple agents to analyze different aspects of the codebase in parallel, and then feed their outputs into our existing project management workflow (GitHub Issues).
