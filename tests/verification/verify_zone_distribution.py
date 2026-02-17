from playwright.sync_api import Page, expect, sync_playwright
import time
import os

def test_zone_distribution(page: Page):
    print("Navigating to experimental page...")
    page.goto("http://localhost:3000/client/experimental")

    # Wait for page to load
    try:
        expect(page.get_by_text("New Workout")).to_be_visible(timeout=5000)
        print("Found 'New Workout' button. Clicking...")
        page.get_by_text("New Workout").click()
    except Exception:
        print("'New Workout' not found, maybe already in active view?")

    # Now look for "Start Workout"
    expect(page.get_by_text("Start Workout")).to_be_visible(timeout=10000)

    print("Starting workout...")
    page.get_by_text("Start Workout").click()

    # Wait for workout to run for a bit
    print("Workout started. Waiting for 10 seconds...")
    time.sleep(10)

    # Check if "Time in Zones" is visible
    print("Checking for 'Time in Zones'...")
    expect(page.get_by_text("Time in Zones")).to_be_visible()

    # Check if ZONE_0 (Idle) is visible
    print("Checking for 'Idle' zone...")
    # Select the visible paragraph, avoiding the hidden table cell
    # Use .first as a fallback if strict mode still complains, but filter by role is better
    idle_locator = page.get_by_role("paragraph").filter(has_text="Idle").first
    expect(idle_locator).to_be_visible()

    # Take screenshot
    screenshot_path = "/home/jules/verification/zone_distribution.png"
    os.makedirs(os.path.dirname(screenshot_path), exist_ok=True)
    page.screenshot(path=screenshot_path, full_page=True)
    print(f"Screenshot saved to {screenshot_path}")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_zone_distribution(page)
        except Exception as e:
            print(f"Test failed: {e}")
            page.screenshot(path="/home/jules/verification/failure.png")
            raise
        finally:
            browser.close()
