from .jules_service import JulesService
from .gemini_service import GeminiService
from .github_service import GitHubService

class Orchestrator:
    def __init__(self):
        self.jules = JulesService()
        self.gemini = GeminiService()
        self.github = GitHubService()

    def review_pr(self, pr_number: str):
        print(f"Fetching diff for PR {pr_number}...")
        diff = self.github.get_diff(pr_number)

        print(f"Requesting review from Gemini...")
        review = self.gemini.review_code(diff)

        print(f"Posting review to PR {pr_number}...")
        self.github.add_comment("pr", pr_number, f"### AI Code Review\n\n{review}")
        print("Review completed.")

    def dispatch_jules(self, issue_number: str, owner: str, repo_name: str):
        print(f"Fetching issue {issue_number}...")
        issue = self.github.get_issue(issue_number)

        title = issue.get("title", "")
        body = issue.get("body", "")

        print("Parsing issue body...")
        task_description, target_files, branch_name = self.github.parse_issue_body(body)

        # Determine branch name
        if not branch_name:
            branch_name = f"jules-issue-{issue_number}"

        print("Creating Jules session...")
        session_id = self.jules.create_session(
            prompt=task_description if task_description else body,
            branch=branch_name,
            title=title,
            owner=owner,
            repo_name=repo_name
        )
        print(f"Jules session created: {session_id}")
        return session_id

    def read_github_issue(self, issue_number: str):
        issue = self.github.get_issue(issue_number)
        print(f"Title: {issue.get('title')}\nBody: {issue.get('body')}")

    def fix_conflicts(self, branch: str):
        print(f"Checking out branch {branch}...")
        self.github.checkout_branch(branch)

        print("Attempting to get conflicting diff...")
        import subprocess
        import os
        try:
            result = subprocess.run(["git", "diff", "--diff-filter=U"], capture_output=True, text=True, check=True)
            diff = result.stdout
            if not diff.strip():
                print("No conflicts found.")
                return
        except subprocess.CalledProcessError as e:
            print(f"Error getting diff: {e.stderr}")
            return

        print("Sending conflicting diff to Gemini for resolution...")
        resolved_code = self.gemini.fix_conflicts(diff)

        if resolved_code:
            print("Received resolution. Applying it...")
            import tempfile
            with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.patch') as patch_file:
                patch_file.write(resolved_code)
                patch_file_path = patch_file.name

            try:
                subprocess.run(["git", "apply", patch_file_path], check=True)
                print("Successfully applied conflict resolution.")
                # Stage the resolved files
                subprocess.run(["git", "add", "."], check=True)
            except subprocess.CalledProcessError as e:
                print(f"Failed to apply patch: {e}")
                print(f"Patch content was:\n{resolved_code}")
            finally:
                if os.path.exists(patch_file_path):
                    os.remove(patch_file_path)
        else:
            print("Failed to resolve conflicts using Gemini.")
