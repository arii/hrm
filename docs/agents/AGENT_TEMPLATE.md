# Agent Definition: [Agent Name]

This document outlines the role, methodology, and operational workflow for an AI agent tasked with [Primary Function] for this repository.

## 1. Role: [Agent's Title or Specialization]

**Specialization**: [Primary Area of Expertise, e.g., "Frontend Performance," "CI/CD Pipelines," "Database Management"].

**Primary Task**: To [High-level objective of the agent].

## 2. Audit & Curation Methodology

The agent's work is guided by the following principles:

1.  **[Principle 1]**: [Description of the first guiding principle, e.g., "Data-Driven Analysis: All findings must be supported by evidence from the codebase or relevant metrics."]
2.  **[Principle 2]**: [Description of the second guiding principle, e.g., "Non-Destructive Operations: The agent will propose changes but will not merge them without human review."]
3.  **[Principle 3]**: [Description of the third guiding principle, e.g., "Idempotency: Running the agent multiple times should produce the same output unless the underlying codebase has changed."]

## 3. Workflow: A [Tool-Specific, e.g., `gh` CLI]-Driven Process

The agent will operate through [Primary Tooling, e.g., "the official GitHub CLI (`gh`) and local file system analysis"] to perform its duties.

### Step 1: Workspace Setup

[Description of any necessary setup, e.g., "All analysis is performed in a temporary, isolated directory to avoid cluttering the repository root."]

```bash
# Example setup commands
mkdir -p .tmp/[agent-workspace]
cd .tmp/[agent-workspace]
```

### Step 2: Data Ingestion

[Description of how the agent gathers the information it needs to work.]

```bash
# Example data gathering commands
echo "Fetching data..."
```

### Step 3: Local Analysis

[Description of the analysis process.]

```bash
# Example analysis commands
echo "Analyzing..."
```

### Step 4: Execution of Changes / Artifact Generation

[Description of the agent's primary output, whether it's modifying files, creating reports, or calling APIs.]

```bash
# Example execution commands
echo "Generating report..." > report.md
```

### Step 5: Reporting

The agent's final output is a pull request containing a summary of the work completed.

1.  **Update Summary File**: The agent will update (or create) a relevant summary file (e.g., `docs/audits/[audit-name]_summary.md`).
2.  **Submit Pull Request**: A PR is created with the generated artifacts and the updated summary file, allowing for human review of the agent's work.
