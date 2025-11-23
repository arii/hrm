#!/usr/bin/env python3
import argparse
import os
import platform
import subprocess
import sys
import time

# Attempt to import secrets_ops
try:
    import secrets_ops

    SECRETS_AVAILABLE = True
except ImportError:
    SECRETS_AVAILABLE = False
    print(
        "⚠️  secrets_ops.py not found. Ensure .env files are manually configured."
    )


def get_default_chrome_profile():
    """
    Attempts to guess the default Chrome profile path based on OS.
    This allows the test to use your Real Spotify cookies.
    """
    system = platform.system()
    home = os.path.expanduser("~")

    if system == "Darwin":  # macOS
        return os.path.join(
            home,
            "Library",
            "Application Support",
            "Google",
            "Chrome",
            "Default",
        )
    elif system == "Linux":
        return os.path.join(home, ".config", "google-chrome", "Default")
    elif system == "Windows":
        return os.path.join(
            os.environ.get("LOCALAPPDATA", ""),
            "Google",
            "Chrome",
            "User Data",
            "Default",
        )
    return None


def check_server_running(base_url):
    """Checks if the web server is running."""
    try:
        # Use curl to quickly check headers
        result = subprocess.run(
            ["curl", "-I", base_url],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=2,
        )
        return result.returncode == 0
    except Exception:
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Run local Spotify OAuth verification with Playwright."
    )
    parser.add_argument(
        "--url",
        default="http://localhost:3000",
        help="Base URL of the application",
    )
    parser.add_argument(
        "--profile",
        help="Path to Chrome user profile (optional, auto-detected if omitted)",
    )
    parser.add_argument(
        "--user-id", help="Expected Spotify User ID for validation (optional)"
    )
    args = parser.parse_args()

    print("🕵️  Starting Local OAuth Verification...")

    # 1. Provision Secrets
    if SECRETS_AVAILABLE:
        print("\n🔑 Provisioning secrets to current directory...")
        if not secrets_ops.provision_secrets(os.getcwd()):
            print("❌ Failed to provision secrets. Aborting.")
            sys.exit(1)

    # 2. Check Server
    if not check_server_running(args.url):
        print(f"\n❌ Server does not appear to be running at {args.url}")
        print(
            "   Please run 'npm run dev' or 'start-production.sh' in a separate terminal."
        )
        sys.exit(1)
    else:
        print(f"✅ Server detected at {args.url}")

    # 3. Prepare Environment for Playwright
    env = os.environ.copy()
    env["TEST_BASE_URL"] = args.url

    if args.user_id:
        env["SPOTIFY_EXPECTED_USER_ID"] = args.user_id

    # Set Profile Path
    profile_path = args.profile or get_default_chrome_profile()
    if profile_path and os.path.exists(profile_path):
        print(f"👤 Using Chrome Profile: {profile_path}")
        env["CHROME_PROFILE_PATH"] = profile_path
    else:
        print(
            "⚠️  Chrome profile not found or not specified. Test will use a temporary profile (Login required)."
        )

    # 4. Run Playwright Test
    print("\n🎭 Running Playwright Test...")
    cmd = [
        "npx",
        "playwright",
        "test",
        "tests/playwright/local-oauth.spec.ts",
        "--project=chromium",
        "--headed",  # Force headed mode for local debugging
    ]

    try:
        subprocess.run(cmd, env=env, check=True)
        print("\n✅ OAuth Verification Passed!")
    except subprocess.CalledProcessError:
        print("\n❌ OAuth Verification Failed.")
        sys.exit(1)


if __name__ == "__main__":
    main()
