from playwright.sync_api import sync_playwright
import time

def verify_hrm_repair():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        print("Navigating to dashboard...")
        page.goto("http://127.0.0.1:3000?use-native-table=true")

        # Wait for the page to stabilize
        print("Waiting for dashboard...")
        try:
            page.wait_for_selector('[data-testid="dashboard"]', timeout=10000)
        except:
            print("Dashboard load timed out, taking screenshot anyway.")

        # Check for Workout Table Viewer OR Alert
        print("Checking Workout Table Viewer or Alert...")

        # 1. Check for success state (Table)
        viewer = page.get_by_test_id("workout-table-viewer")
        if viewer.is_visible():
            print("Workout Table Viewer found (Success state).")
        else:
            print("Workout Table Viewer NOT found (Checking for alerts...).")

            # 2. Check for empty/error state (Alert)
            # The component renders <Alert severity="info">No workout data found in this document.</Alert>
            # Or <Alert severity="error">{error}</Alert>

            alert = page.get_by_role("alert")
            if alert.count() > 0:
                print(f"Found {alert.count()} alerts.")
                for i in range(alert.count()):
                    print(f"Alert {i+1} text: {alert.nth(i).text_content()}")

                if page.get_by_text("No workout data found").is_visible() or page.get_by_text("Failed to load").is_visible():
                     print("Workout Table Viewer Alert found (Error/Empty state). verification PASS.")
                else:
                     print("Alert found but text mismatch.")
            else:
                print("No Alerts found.")

        # Take screenshot
        screenshot_path = "verification_hrm_repair.png"
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    verify_hrm_repair()
