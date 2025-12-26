
import os
import requests
import argparse
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Constants
JULES_API_BASE_URL = os.getenv("JULES_API_URL", "https://api.jules.ai/v1")
JULES_API_KEY = os.getenv("JULES_API_KEY")

def create_jules_session(prompt, branch, title, source):
    """
    Starts a new Jules coding session via the API.
    """
    if not JULES_API_KEY:
        logging.error("JULES_API_KEY environment variable not set.")
        raise ValueError("API key is missing.")

    headers = {
        "Authorization": f"Bearer {JULES_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "prompt": prompt,
        "source_code_reference": {
            "github_repo": {
                "owner": source.split('/')[2],
                "name": source.split('/')[3],
                "branch": branch
            }
        },
        "submission_override": {
            "branch_name": branch,
            "title": title
        }
    }

    url = f"{JULES_API_BASE_URL}/sessions"

    logging.info(f"Sending request to Jules API: {url}")
    logging.info(f"Payload: {payload}")

    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()  # Raises an HTTPError for bad responses (4xx or 5xx)

        session_data = response.json()
        session_id = session_data.get("id")
        logging.info(f"Successfully created Jules session with ID: {session_id}")
        print(f"JULES_SESSION_ID={session_id}")
        return session_id

    except requests.exceptions.HTTPError as e:
        logging.error(f"HTTP Error creating Jules session: {e.response.status_code} {e.response.text}")
        raise
    except requests.exceptions.RequestException as e:
        logging.error(f"Error connecting to Jules API: {e}")
        raise

def main():
    parser = argparse.ArgumentParser(description="Jules AI Operations CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Sub-parser for the 'create' command
    create_parser = subparsers.add_parser("create", help="Create a new Jules session")
    create_parser.add_argument("--prompt", required=True, help="The task prompt for the AI agent.")
    create_parser.add_argument("--branch", required=True, help="The target git branch for the changes.")
    create_parser.add_argument("--title", required=True, help="The title for the resulting Pull Request.")
    create_parser.add_argument("--source", required=True, help="The source repository in 'sources/github/owner/repo' format.")

    args = parser.parse_args()

    if args.command == "create":
        create_jules_session(
            prompt=args.prompt,
            branch=args.branch,
            title=args.title,
            source=args.source
        )

if __name__ == "__main__":
    main()
