from playwright.sync_api import sync_playwright
import time

def verify_zone_distribution():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()

        # Dashboard Page
        dashboard_page = context.new_page()
        print("Navigating to Dashboard...")
        dashboard_page.goto("http://localhost:3000/client/experimental")

        # Mock Page
        mock_page = context.new_page()
        print("Navigating to Mock...")
        mock_page.goto("http://localhost:3000/client/mock")

        # Setup Mock
        print("Setting up Mock...")
        # Use 165 BPM (Cardio for Age 30)
        mock_page.get_by_label("Current BPM").fill("165")
        mock_page.get_by_test_id("streaming-start-button").click()

        # Setup Dashboard
        print("Setting up Dashboard...")
        dashboard_page.bring_to_front()
        # Click "New Workout" if available (if status is list)
        try:
            new_workout_btn = dashboard_page.get_by_role("button", name="New Workout")
            if new_workout_btn.is_visible(timeout=5000):
                new_workout_btn.click()
        except:
            print("New Workout button not found or not clickable.")

        try:
            start_workout_btn = dashboard_page.get_by_role("button", name="Start Workout")
            if start_workout_btn.is_visible(timeout=5000):
                start_workout_btn.click()
        except:
            print("Start Workout button not found or not clickable.")

        # Wait for data
        print("Waiting for data...")
        zone_card = dashboard_page.get_by_test_id("zone-distribution-card")
        try:
            zone_card.wait_for(state="visible", timeout=20000)
            print("Zone card appeared.")

            # Wait a bit more for chart to stabilize/animate
            time.sleep(5)

            # Take Screenshot
            print("Taking screenshot...")
            zone_card.screenshot(path="verification/zone_distribution.png")
            print("Screenshot saved to verification/zone_distribution.png")

        except Exception as e:
            print(f"Error waiting for zone card: {e}")
            dashboard_page.screenshot(path="verification/error_dashboard.png")

        browser.close()

if __name__ == "__main__":
    verify_zone_distribution()
