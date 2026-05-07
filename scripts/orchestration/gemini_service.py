import os
import subprocess
import tempfile
import json

class GeminiService:
    def __init__(self, api_key=None, model="gemini-2.5-flash"):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        self.model = model

    def generate_content(self, prompt: str) -> str:
        """
        Invokes the local scripts/gemini-client.ts to generate content.
        """
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not set")

        # Write prompt to a temporary file since gemini-client.ts expects a task or task-file
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as temp_task_file:
            temp_task_file.write(prompt)
            temp_task_path = temp_task_file.name

        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as temp_output_file:
            temp_output_path = temp_output_file.name

        try:
            env = os.environ.copy()
            env["GEMINI_API_KEY"] = self.api_key

            # The script expects npx tsx and these arguments
            cmd = [
                "npx", "tsx", "scripts/gemini-client.ts",
                "--task-file", temp_task_path,
                "--output", temp_output_path
            ]

            result = subprocess.run(cmd, env=env, capture_output=True, text=True)
            if result.returncode != 0:
                raise RuntimeError(f"Gemini client error: {result.stderr}")

            # Read output from the generated file
            with open(temp_output_path, 'r') as f:
                output_content = f.read()

            return output_content

        finally:
            # Cleanup temp files
            if os.path.exists(temp_task_path):
                os.remove(temp_task_path)
            if os.path.exists(temp_output_path):
                os.remove(temp_output_path)

    def review_code(self, diff: str) -> str:
        """
        Uses Gemini to review a code diff.
        """
        prompt = f"Review the following code changes and provide feedback:\n\n{diff}"
        return self.generate_content(prompt)

    def fix_conflicts(self, diff: str) -> str:
        """
        Uses Gemini to generate a conflict resolution for a diff.
        """
        prompt = (
            "The following diff contains git merge conflicts. "
            "Please resolve the conflicts and provide ONLY the corrected code without the conflict markers. "
            f"Here is the diff:\n\n{diff}"
        )
        return self.generate_content(prompt)
