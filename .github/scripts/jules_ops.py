
import os
import sys
import requests
import argparse

def create_jules_session(prompt, branch, title, owner, repo_name, jules_api_url):
    """
    Creates a new Jules session via the API and returns the session ID.
    """
    api_key = os.environ.get("JULES_API_KEY")
    if not api_key or not api_key.strip():
        sys.stderr.write("Error: JULES_API_KEY environment variable not set or empty.\n")
        sys.exit(1)

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
        response = requests.post(jules_api_url, headers=headers, json=payload)
        response.raise_for_status()
        response_data = response.json()
        print(f"Successfully created Jules session: {response_data}")
        session_id = response_data.get("id")
        if not session_id:
            sys.stderr.write("Error: Could not find session ID in API response.\n")
            sys.exit(1)
        return session_id
    except requests.exceptions.RequestException as e:
        sys.stderr.write(f"Error creating Jules session: {e}\n")
        if e.response:
            sys.stderr.write(f"Response: {e.response.text}\n")
        sys.exit(1)

def delete_jules_session(session_id, jules_api_url):
    """
    Deletes a Jules session via the API.
    """
    api_key = os.environ.get("JULES_API_KEY")
    if not api_key or not api_key.strip():
        sys.stderr.write("Error: JULES_API_KEY environment variable not set or empty.\n")
        sys.exit(1)

    if not session_id:
        sys.stderr.write("Error: --session-id is required for the 'delete' command.\n")
        sys.exit(1)

    url = f"{jules_api_url}/{session_id}"

    headers = {
        "Authorization": f"Bearer {api_key}",
    }

    try:
        response = requests.delete(url, headers=headers)
        response.raise_for_status()
        print(f"Successfully deleted Jules session {session_id}")
    except requests.exceptions.RequestException as e:
        sys.stderr.write(f"Error deleting Jules session: {e}\n")
        if e.response:
            sys.stderr.write(f"Response: {e.response.text}\n")
        sys.exit(1)


def main():
    """
    Main function to parse arguments and manage Jules sessions.
    """
    parser = argparse.ArgumentParser(description="Manage Jules coding sessions.")
    parser.add_argument("--command", required=True, choices=['new', 'delete'], help="The command to execute.")
    parser.add_argument("--session-id", help="The ID of the session to delete.")
    parser.add_argument("--prompt", help="The task description for the AI.")
    parser.add_argument("--branch", help="The git branch for the task.")
    parser.add_argument("--title", help="The title for the task or PR.")
    parser.add_argument("--owner", help="The owner of the repository.")
    parser.add_argument("--repo-name", help="The name of the repository.")
    parser.add_argument("--jules-api-url", default="https://api.jules.ai/v1/sessions", help="The URL of the Jules API.")

    args = parser.parse_args()

    if args.command == 'new':
        if not all([args.prompt, args.branch, args.title, args.owner, args.repo_name]):
            sys.stderr.write("Error: --prompt, --branch, --title, --owner, and --repo-name are required for the 'new' command.\n")
            sys.exit(1)
        session_id = create_jules_session(
            prompt=args.prompt,
            branch=args.branch,
            title=args.title,
            owner=args.owner,
            repo_name=args.repo_name,
            jules_api_url=args.jules_api_url
        )
        if 'GITHUB_OUTPUT' in os.environ:
            with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
                f.write(f"session_id={session_id}\n")
        else:
            print(f"session_id={session_id}")

    elif args.command == 'delete':
        delete_jules_session(session_id=args.session_id, jules_api_url=args.jules_api_url)

if __name__ == "__main__":
    main()
