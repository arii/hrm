
import os
import sys
import requests
import argparse

def create_jules_session(prompt, branch, title, owner, repo_name):
    """
    Creates a new Jules session via the API.
    """
    api_key = os.environ.get("JULES_API_KEY")
    if not api_key:
        sys.stderr.write("::error::JULES_API_KEY environment variable not set. Please set it to your Jules API key.\n")
        sys.exit(1)

    url = os.environ.get("JULES_API_URL", "https://api.jules.ai/v1/sessions")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "prompt": prompt,
        "branch": branch,
        "title": title,
        "owner": owner,
        "repo_name": repo_name,
    }

    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        session_data = response.json()
        session_url = session_data.get("url")

        if session_url:
            # Output for GitHub Actions
            print(f"session_url={session_url}")
            # Log for humans
            sys.stderr.write(f"Successfully created Jules session: {session_url}\n")
        else:
            sys.stderr.write(f"::warning::Jules session created, but no URL found in response: {session_data}\n")
    except requests.exceptions.RequestException as e:
        sys.stderr.write(f"::error::Error creating Jules session: {e}\n")
        sys.exit(1)

def main():
    """
    Main function to parse arguments and create a Jules session.
    """
    parser = argparse.ArgumentParser(description="Create a Jules coding session.")
    parser.add_argument("--prompt", required=True, help="The task description for the AI.")
    parser.add_argument("--branch", required=True, help="The git branch for the task.")
    parser.add_argument("--title", required=True, help="The title for the task or PR.")
    parser.add_argument("--owner", required=True, help="The owner of the repository.")
    parser.add_argument("--repo-name", required=True, help="The name of the repository.")

    args = parser.parse_args()

    create_jules_session(
        prompt=args.prompt,
        branch=args.branch,
        title=args.title,
        owner=args.owner,
        repo_name=args.repo_name,
    )

if __name__ == "__main__":
    main()
