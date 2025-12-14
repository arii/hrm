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
    - **Examples of Artifacts**:
      - An audit report (`.md` file) detailing findings from a codebase review.
      - A JSON file containing data fetched and processed from an external API.
      - A log file from a complex build or test run.

The key principle of this phase is **data capture**. The generated artifacts are committed to the repository (typically in the `docs/audits` or a similar directory) to provide a clear, historical record of the agent's findings at a specific point in time.

### Phase 2: Actioning the Artifacts

Once an artifact has been generated and committed, it serves as the source of truth for the second phase: turning analysis into action. This phase is typically human-driven, but can be assisted by other agents.

1.  **Triage**: A developer or project manager reviews the artifact. For example, after reviewing an audit report, they decide which findings are high-priority and which are out of scope.
2.  **Creation of Actionable Items**: The insights from the artifact are used to create concrete, actionable tasks.
    - **Primary Method**: Creating detailed GitHub Issues from the findings. For example, a single audit report might be broken down into 5-10 specific issues, each with a clear scope and acceptance criteria.
    - **Alternative Method**: Creating a new pull request that directly addresses one or more of the findings.
3.  **Implementation**: Developers work on the GitHub Issues or pull requests generated in the previous step.

## Why This Workflow?

This two-phase process provides several key advantages:

- **Decoupling Analysis from Implementation**: It separates the often complex and time-consuming task of analysis from the work of writing code. This allows us to run broad audits without immediately committing to fixing every finding.
- **Traceability and Version Control**: By committing the agent's raw output (the artifact), we have a version-controlled history of the repository's state and the agent's findings at that time. This is invaluable for tracking progress and understanding historical context.
- **Improved Project Management**: It allows for a more thoughtful and deliberate approach to addressing technical debt and improvements. We can triage the findings from an audit and prioritize them according to our current goals, rather than being forced to act on everything at once.
- **Scalability**: It provides a framework for scaling our engineering efforts. We can run multiple agents to analyze different aspects of the codebase in parallel, and then feed their outputs into our existing project management workflow (GitHub Issues).

## Specialized Workflows

### Abandoned Pull Request Analysis & Knowledge Recovery

This workflow captures valuable design insights from abandoned or closed PRs that contain extensive discussions but were never merged.

#### When to Use

- Periodic review of recently abandoned PRs (monthly/quarterly)
- Before starting work on similar features to avoid repeating design mistakes
- When encountering repeated patterns of PR abandonment
- To preserve institutional knowledge from detailed technical discussions

#### Process Steps

**Phase 1: Discovery & Analysis**

1. **Identify Abandoned PRs**:

   ```bash
   # Search for recently closed, unmerged PRs
   github-mcp-server-search_pull_requests \
     --query "repo:owner/repo is:closed is:unmerged updated:>YYYY-MM-DD" \
     --sort updated --order desc
   ```

2. **Extract PR Comments & Discussions**:

   ```bash
   # Get detailed comments for promising PRs
   github-mcp-server-pull_request_read \
     --method get_comments --pullNumber X
   ```

3. **Analyze Related Issues**:
   - Follow issue links from abandoned PRs
   - Extract original requirements and acceptance criteria
   - Identify gaps between intended vs actual implementation

4. **Categorize Insights**:
   - **Design System Compliance**: Spacing, theming, component patterns
   - **Accessibility Requirements**: ARIA labels, touch targets, keyboard navigation
   - **Architecture Patterns**: State management, error handling, API integration
   - **Quality Standards**: Testing approaches, scope management, edge case handling
   - **Implementation Lessons**: Common pitfalls, scope creep, technical debt

**Phase 2: Knowledge Preservation**

1. **Close Original Issues with Reference**:

   ```bash
   # Close original issue with reference to new enriched issue
   curl -X PATCH \
     -H "Authorization: Bearer $GITHUB_PAT" \
     https://api.github.com/repos/owner/repo/issues/ISSUE_NUMBER \
     -d '{"state": "closed"}'

   # Add closing comment referencing new issue
   curl -X POST \
     -H "Authorization: Bearer $GITHUB_PAT" \
     https://api.github.com/repos/owner/repo/issues/ISSUE_NUMBER/comments \
     -d '{"body": "Closing this issue in favor of #NEW_ISSUE which incorporates design insights from abandoned PR #XXX"}'
   ```

2. **Create New Enriched Issues**:

   ```bash
   # Create new issue with comprehensive implementation guidance
   curl -X POST \
     -H "Authorization: Bearer $GITHUB_PAT" \
     https://api.github.com/repos/owner/repo/issues \
     -d '{"title": "Enhanced: [Original Title] with Implementation Guidance",
          "body": "Enhanced version of #ORIGINAL_ISSUE incorporating insights from abandoned PR #XXX...",
          "labels": ["enhancement", "design-insights"]}'
   ```

3. **Enrich Issue Context**:
   - Add implementation requirements based on PR analysis
   - Include proven working patterns from partial implementations
   - Document edge cases and error scenarios discovered
   - Specify accessibility and design system compliance requirements
   - Reference original issue and abandoned PR for traceability

4. **Create Cross-References**:
   - Link related issues that share common design patterns
   - Reference successful implementations of similar features
   - Note dependencies between issues based on architectural insights

#### Deliverables

- **New Enhanced Issues**: Fresh issues with comprehensive implementation guidance from abandoned PR insights
- **Closed Original Issues**: Original issues closed with references to enhanced versions
- **Design Patterns**: Documented reusable patterns for future implementations
- **Lessons Learned**: Common pitfalls and best practices captured
- **Cross-References**: Issue relationships and dependencies clarified
- **Traceability Chain**: Clear links between original issue → abandoned PR → enhanced issue

#### Quality Indicators

- New issues contain specific, actionable implementation guidance
- Design system compliance requirements are explicitly documented
- Accessibility standards are clearly specified with examples
- Edge cases and error handling patterns are preserved
- Scope management lessons prevent future scope creep
- Original issues properly closed with references to enhanced versions

#### Example Applications

- **Toast Notification System**: Original Issue #1071 → Abandoned PR #1321 → New Enhanced Issue with React Context patterns, MUI compliance
- **Visual Testing Pipeline**: Original Issue #1023 → Abandoned PR #1326 → New Enhanced Issue with Storybook compatibility requirements
- **Spotify Controls**: Original Issue #1265 → Abandoned PR #1325 → New Enhanced Issue with accessibility standards, mobile-first design
- **Progress Components**: Original Issue #1330 → Abandoned PR #1337 → New Enhanced Issue with robustness requirements, edge case handling

This workflow ensures that valuable engineering discussions and design decisions are not lost when PRs are abandoned, turning failed attempts into institutional knowledge for future success.
