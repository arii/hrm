import os
import sys
import requests

class JulesService:
    def __init__(self, api_url="https://api.jules.ai/v1/sessions", api_key=None):
        self.api_url = api_url
        self.api_key = api_key or os.environ.get("JULES_API_KEY")

    def _get_headers(self):
        if not self.api_key or not self.api_key.strip():
            raise ValueError("JULES_API_KEY is not set or empty")
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def create_session(self, prompt: str, branch: str, title: str, owner: str, repo_name: str) -> str:
        """
        Creates a new Jules session via the API and returns the session ID.
        Mimics .github/scripts/jules_ops.py create_jules_session.
        """
        payload = {
            "prompt": prompt,
            "branch": branch,
            "title": title,
            "owner": owner,
            "repo_name": repo_name,
        }

        try:
            response = requests.post(self.api_url, headers=self._get_headers(), json=payload)
            response.raise_for_status()
            response_data = response.json()
            session_id = response_data.get("id")
            if not session_id:
                raise RuntimeError("Could not find session ID in API response.")
            return session_id
        except requests.exceptions.RequestException as e:
            error_msg = f"Error creating Jules session: {e}"
            if e.response is not None:
                error_msg += f"\nResponse: {e.response.text}"
            raise RuntimeError(error_msg)

    def delete_session(self, session_id: str):
        """
        Deletes a Jules session via the API.
        Mimics .github/scripts/jules_ops.py delete_jules_session.
        """
        if not session_id:
            raise ValueError("session_id is required for the 'delete' command.")

        url = f"{self.api_url}/{session_id}"

        headers = {
            "Authorization": f"Bearer {self.api_key}",
        }

        try:
            response = requests.delete(url, headers=headers)
            response.raise_for_status()
            return True
        except requests.exceptions.RequestException as e:
            error_msg = f"Error deleting Jules session: {e}"
            if e.response is not None:
                error_msg += f"\nResponse: {e.response.text}"
            raise RuntimeError(error_msg)
