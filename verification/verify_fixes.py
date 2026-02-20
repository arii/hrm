from playwright.sync_api import sync_playwright
import time

def verify_timer_and_summary():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Create a context with a viewport size that is 'md' (960px - 1280px)
        # 1024x768 is a good 'md' size.
        context = browser.new_context(viewport={"width": 1024, "height": 768})
        page = context.new_page()

        try:
            # 1. Verify TimerDisplay Font Size
            print("Navigating to Dashboard...")
            page.goto("http://localhost:3000", timeout=60000)

            print("Waiting for dashboard to load...")
            try:
                page.wait_for_selector('[data-testid="timer-display-container"]', timeout=30000)
            except Exception as e:
                print("Dashboard load timed out. Taking screenshot.")
                page.screenshot(path="verification/debug_dashboard_timeout.png")
                raise e

            print("Checking Timer State...")
            if page.locator('[data-testid="start-timer-button"]').is_visible():
                print("Starting Timer...")
                page.locator('[data-testid="start-timer-button"]').click()
            elif page.locator('[data-testid="stop-timer-button"]').is_visible():
                print("Timer already running.")
            else:
                print("Unknown timer state. Taking screenshot.")
                page.screenshot(path="verification/debug_timer_state.png")

            page.wait_for_timeout(2000) # Wait for animation/transition

            print("Taking screenshot of TimerDisplay...")
            # We screenshot the container to see the font size relative to it
            page.locator('[data-testid="timer-display-container"]').screenshot(path="verification/timer_display_md.png")

            # 2. Verify WorkoutSummary
            print("Navigating to Experimental Analytics...")
            page.goto("http://localhost:3000/client/experimental", timeout=60000)
            page.wait_for_timeout(2000)

            print("Checking Experimental Page State...")
            # Check if we are in list view or active view
            if page.get_by_text('New Workout').is_visible():
                print("Clicking New Workout...")
                page.get_by_text('New Workout').click()
            elif page.get_by_text('Back to Active Workout').is_visible():
                print("Clicking Back to Active Workout...")
                page.get_by_text('Back to Active Workout').click()

            page.wait_for_timeout(1000)

            # Now we should see Start Workout if idle
            if page.get_by_text('Start Workout').is_visible():
                print("Starting Workout...")
                page.get_by_text('Start Workout').click()
            elif page.get_by_text('Pause').is_visible():
                print("Workout already running...")
            elif page.get_by_text('Resume').is_visible():
                print("Workout paused...")

            # Now WorkoutSummary should be visible
            print("Taking screenshot of WorkoutSummary...")
            try:
                page.wait_for_selector('[data-testid="workout-summary"]', timeout=10000)
                page.locator('[data-testid="workout-summary"]').screenshot(path="verification/workout_summary.png")
            except Exception as e:
                print("WorkoutSummary not found. Taking debug screenshot.")
                page.screenshot(path="verification/debug_experimental.png")
                raise e

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_timer_and_summary()
