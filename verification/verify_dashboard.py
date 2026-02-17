from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Wait for server
        for i in range(30):
            try:
                page.goto("http://localhost:3000")
                break
            except:
                time.sleep(1)

        print("Navigated to Dashboard")
        page.screenshot(path="verification/dashboard.png")

        # Check for Spotify Display (Auth button likely)
        # The AuthButton has text "Connect with Spotify" or similar.
        # Or data-testid="spotify-auth-container"

        try:
            page.wait_for_selector('[data-testid="spotify-auth-container"]', timeout=5000)
            print("Spotify Auth Container found on Dashboard")
        except:
            print("Spotify Auth Container NOT found on Dashboard (might be logged in or hidden?)")

        page.goto("http://localhost:3000/client/control")
        print("Navigated to Control Panel")
        page.screenshot(path="verification/control.png")

        # Check for Spotify Controls
        # data-testid="spotify-controls"
        try:
            page.wait_for_selector('[data-testid="spotify-controls"]', timeout=5000)
            print("Spotify Controls found on Control Panel")
        except:
            print("Spotify Controls NOT found on Control Panel")

        browser.close()

if __name__ == "__main__":
    run()
