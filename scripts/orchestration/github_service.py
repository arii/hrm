import os
import subprocess
import json

class GitHubService:
    def __init__(self, token=None):
        self.token = token or os.environ.get("GITHUB_TOKEN")

    def _run_gh_command(self, args):
        env = os.environ.copy()
        if self.token:
            env["GH_TOKEN"] = self.token

        # Determine if we should parse as JSON or not
        try:
            result = subprocess.run(["gh"] + args, env=env, capture_output=True, text=True, check=True)
            return result.stdout.strip()
        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"GitHub CLI error: {e.stderr}")

    def get_pr(self, pr_number: str) -> dict:
        output = self._run_gh_command(["pr", "view", pr_number, "--json", "title,body,headRefName,baseRefName"])
        return json.loads(output)

    def get_issue(self, issue_number: str) -> dict:
        output = self._run_gh_command(["issue", "view", issue_number, "--json", "title,body"])
        return json.loads(output)

    def add_comment(self, subject_type: str, number: str, body: str):
        if subject_type.lower() == "pr":
            self._run_gh_command(["pr", "comment", number, "--body", body])
        elif subject_type.lower() == "issue":
            self._run_gh_command(["issue", "comment", number, "--body", body])

    def get_diff(self, pr_number: str) -> str:
        return self._run_gh_command(["pr", "diff", pr_number])

    def add_label(self, subject_type: str, number: str, label: str):
        if subject_type.lower() == "pr":
            self._run_gh_command(["pr", "edit", number, "--add-label", label])
        elif subject_type.lower() == "issue":
            self._run_gh_command(["issue", "edit", number, "--add-label", label])

    def parse_issue_body(self, issue_body: str) -> tuple:
        """
        Parses the issue body to extract task description, target files, and custom branch name.
        Mimics .github/scripts/parse_issue.py.
        """
        sections = {
            "Refactoring Task": "",
            "Target Files": "",
            "Custom Branch Name (Optional)": ""
        }

        current_section = None
        for line in issue_body.splitlines():
            if line.startswith("### "):
                section_name = line[4:].strip()
                if section_name in sections:
                    current_section = section_name
                else:
                    current_section = None
            elif current_section:
                sections[current_section] += line + "\n"

        task_description = sections["Refactoring Task"].strip()

        target_files_raw = sections["Target Files"].strip()
        target_files = [line.strip().replace("- ", "").replace("`", "") for line in target_files_raw.splitlines() if line.strip()]

        branch_name_raw = sections["Custom Branch Name (Optional)"].strip()
        branch_name = ""
        if branch_name_raw:
            branch_name_line = [line for line in branch_name_raw.splitlines() if line.strip()]
            if branch_name_line:
                branch_name = branch_name_line[0].replace("`", "").replace("branch-name:", "").strip()

        return task_description, ",".join(target_files), branch_name

    def checkout_branch(self, branch: str):
        subprocess.run(["git", "checkout", branch], check=True)

    def commit_and_push(self, branch: str, message: str):
        subprocess.run(["git", "add", "."], check=True)
        subprocess.run(["git", "commit", "-m", message], check=True)
        subprocess.run(["git", "push", "origin", branch], check=True)
