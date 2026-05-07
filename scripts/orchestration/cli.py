import argparse
import sys
import os

# Ensure the root of the project is in the python path to allow direct execution
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from scripts.orchestration.orchestrator import Orchestrator

def main():
    parser = argparse.ArgumentParser(description="Orchestration CLI for Jules, Gemini, and GitHub.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Review PR Command
    pr_parser = subparsers.add_parser("review", help="Review a PR using Gemini")
    pr_parser.add_argument("--pr", required=True, help="PR number")

    # Dispatch Jules Command
    jules_parser = subparsers.add_parser("dispatch", help="Dispatch a Jules session for an issue")
    jules_parser.add_argument("--issue", required=True, help="Issue number")
    jules_parser.add_argument("--owner", required=True, help="Repo owner")
    jules_parser.add_argument("--repo", required=True, help="Repo name")

    # Read GitHub Issue Command
    read_parser = subparsers.add_parser("read", help="Read a GitHub issue")
    read_parser.add_argument("--issue", required=True, help="Issue number")

    # Fix Conflicts Command
    fix_parser = subparsers.add_parser("fix-conflicts", help="Fix merge conflicts for a branch")
    fix_parser.add_argument("--branch", required=True, help="Branch name")

    args = parser.parse_args()
    orchestrator = Orchestrator()

    if args.command == "review":
        orchestrator.review_pr(args.pr)
    elif args.command == "dispatch":
        orchestrator.dispatch_jules(args.issue, args.owner, args.repo)
    elif args.command == "read":
        orchestrator.read_github_issue(args.issue)
    elif args.command == "fix-conflicts":
        orchestrator.fix_conflicts(args.branch)

if __name__ == "__main__":
    main()
