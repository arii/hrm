import requests
import os
import time
import argparse
import logging
import sys
import json

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger(__name__)

class JulesClient:
    def __init__(self, api_key=None):
        self.base_url = "https://jules.googleapis.com/v1alpha"
        self.api_key = api_key or os.environ.get("JULES_API_KEY")
        
        if not self.api_key:
            logger.error("No API key found. Set JULES_API_KEY env var or pass --api-key.")
            sys.exit(1)
            
        self.headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self.api_key
        }

    def _request(self, method, endpoint, data=None):
        url = f"{self.base_url}/{endpoint}"
        try:
            response = requests.request(method, url, headers=self.headers, json=data)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            logger.error(f"HTTP Error: {e.response.status_code} - {e.response.text}")
            return None
        except Exception as e:
            logger.error(f"Request Failed: {e}")
            return None

    def list_sources(self, filter_name=None):
        """Lists sources, optionally filtering by a substring name."""
        logger.info("Fetching sources...")
        data = self._request("GET", "sources")
        
        if not data or 'sources' not in data:
            logger.warning("No sources found or API error.")
            return []

        sources = data['sources']
        if filter_name:
            sources = [s for s in sources if filter_name.lower() in s.get('name', '').lower()]
        
        return sources

    def create_session(self, prompt, source_id, branch, title):
        """Creates a task session."""
        logger.info(f"Creating session for {source_id} on branch '{branch}'...")
        payload = {
            "prompt": prompt,
            "sourceContext": {
                "source": source_id,
                "githubRepoContext": {
                    "startingBranch": branch
                }
            },
            "title": title,
        }
        
        result = self._request("POST", "sessions", data=payload)
        if result and 'name' in result:
            logger.info(f"Session started successfully: {result['name']}")
            return result['name']
        return None

    def get_session(self, session_name):
        return self._request("GET", session_name)

    def delete_session(self, session_name):
        """Deletes a session."""
        logger.info(f"Deleting session {session_name}...")
        result = self._request("DELETE", session_name)
        if result is not None:
            logger.info(f"Session {session_name} deleted successfully.")
            return True
        return False

    def send_message(self, session_name, message):
        """Sends a follow-up message or command to an existing session."""
        logger.info(f"Sending message to {session_name}...")
        # Uses standard custom method pattern: POST {resource}:sendMessage
        endpoint = f"{session_name}:sendMessage"
        payload = {"prompt": message}
        
        result = self._request("POST", endpoint, data=payload)
        if result:
            logger.info("Message sent successfully.")
            return True
        return False

    def monitor_session(self, session_name, timeout_minutes=20):
        """Polls session until Success, Failure, or Timeout."""
        logger.info(f"Monitoring {session_name} (Timeout: {timeout_minutes}m)")
        
        start_time = time.time()
        end_time = start_time + (timeout_minutes * 60)
        
        while time.time() < end_time:
            status = self.get_session(session_name)
            if not status:
                time.sleep(30)
                continue

            state = status.get('state', 'UNKNOWN')
            
            # Check for completion states
            if state == 'SUCCEEDED':
                logger.info("Session SUCCEEDED.")
                self._print_pr_link(status)
                return True
            
            elif state in ['FAILED', 'CANCELLED', 'TERMINATED']:
                logger.error(f"Session ended with state: {state}")
                if 'error' in status:
                    logger.error(f"Error details: {status['error']}")
                return False
                
            else:
                # Still running (PENDING, RUNNING)
                logger.info(f"Status: {state}... waiting 30s")
                time.sleep(30)

        logger.error("Monitoring timed out.")
        return False

    def _print_pr_link(self, status_json):
        """Extracts and prints the PR link if available."""
        outputs = status_json.get('outputs', [])
        found_pr = False
        for output in outputs:
            if 'pullRequest' in output:
                pr_url = output['pullRequest'].get('url')
                print(f"\n{'-'*40}")
                print(f"🚀 PULL REQUEST CREATED: {pr_url}")
                print(f"{'-'*40}\n")
                found_pr = True
        
        if not found_pr:
            logger.warning("Session succeeded, but no PR URL found in outputs.")

def main():
    parser = argparse.ArgumentParser(description="Jules API Interaction Tool")
    parser.add_argument("--api-key", help="Jules API Key (or set JULES_API_KEY env var)")
    
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Command: list
    list_cmd = subparsers.add_parser("list", help="List connected sources")
    list_cmd.add_argument("--filter", help="Filter sources by name substring")

    # Command: create
    create_cmd = subparsers.add_parser("create", help="Start a new task")
    create_cmd.add_argument("--prompt", required=True, help="What should Jules do?")
    create_cmd.add_argument("--source", required=True, help="Full Source ID (e.g. sources/github/ப்புகளை)")
    create_cmd.add_argument("--branch", default="main", help="Starting branch")
    create_cmd.add_argument("--title", default="Jules Task", help="PR Title")
    create_cmd.add_argument("--no-watch", action="store_true", help="Exit immediately after creating (don't wait)")

    # Command: watch
    watch_cmd = subparsers.add_parser("watch", help="Resume monitoring an existing session")
    watch_cmd.add_argument("session_name", help="The full resource name of the session")

    # Command: message
    msg_cmd = subparsers.add_parser("message", help="Send a follow-up message to a session")
    msg_cmd.add_argument("session_name", help="The full resource name of the session")
    msg_cmd.add_argument("text", help="The message text (e.g. 'npm build')")
    msg_cmd.add_argument("--watch", action="store_true", help="Monitor session after sending message")

    # Command: publish
    pub_cmd = subparsers.add_parser("publish", help="Tell Jules to finalize changes and create a PR")
    pub_cmd.add_argument("session_name", help="The full resource name of the session")
    pub_cmd.add_argument("--watch", action="store_true", help="Monitor session after requesting publish")

    # Command: delete
    delete_cmd = subparsers.add_parser("delete", help="Delete a session")
    delete_cmd.add_argument("session_name", help="The full resource name of the session")

    args = parser.parse_args()
    client = JulesClient(api_key=args.api_key)

    if args.command == "list":
        sources = client.list_sources(args.filter)
        print(f"\nFound {len(sources)} sources:")
        for s in sources:
            print(f"- {s.get('name')} (ID: {s.get('id')})")

    elif args.command == "create":
        session_name = client.create_session(args.prompt, args.source, args.branch, args.title)
        if session_name and not args.no_watch:
            client.monitor_session(session_name)
        elif session_name:
            print(f"Session created: {session_name}")
            print("Use 'watch' command to monitor progress later.")

    elif args.command == "watch":
        client.monitor_session(args.session_name)

    elif args.command == "message":
        success = client.send_message(args.session_name, args.text)
        if success and args.watch:
            client.monitor_session(args.session_name)

    elif args.command == "publish":
        # Sends a specific instruction to finalize the PR
        success = client.send_message(args.session_name, "Please publish the branch and create the Pull Request now.")
        if success:
            logger.info("Publish request sent.")
            if args.watch:
                client.monitor_session(args.session_name)

if __name__ == "__main__":
    main()