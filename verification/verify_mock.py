
from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_mock_client(page: Page):
    # Use 0.0.0.0 as per PM2 logs, or 127.0.0.1
    page.goto("http://127.0.0.1:3000/client/mock")

    # Wait for page to load by waiting for main heading
    expect(page.get_by_role("heading", name="HRM Mock Streamer")).to_be_visible(timeout=10000)

    # Take a screenshot to debug
    page.screenshot(path="verification/debug_load.png")

    # Verify default "Manual Control"
    # It might be that ToggleButton doesn't use aria-pressed or it's not available yet.
    # Let's print the page content if it fails.
    try:
        expect(page.get_by_role("button", name="Manual Control")).to_have_attribute("aria-pressed", "true")
    except Exception as e:
        print(page.content())
        raise e

    page.screenshot(path="verification/mock_manual.png")

    # Select "Intervals"
    page.get_by_role("button", name="Intervals (170/110)").click()
    expect(page.get_by_role("button", name="Intervals (170/110)")).to_have_attribute("aria-pressed", "true")

    # Start Stream
    page.get_by_role("button", name="START Stream").click()
    time.sleep(2) # Wait for a tick
    page.screenshot(path="verification/mock_intervals.png")

    # Select "Steady"
    page.get_by_role("button", name="Steady Ramp (Max 140)").click()
    time.sleep(2)
    page.screenshot(path="verification/mock_steady.png")

    # Select "Signal Drop"
    page.get_by_role("button", name="Signal Drop (Null)").click()
    time.sleep(2)
    page.screenshot(path="verification/mock_drop.png")

    # Stop Stream
    page.get_by_role("button", name="STOP Stream").click()

    # Manual controls check
    page.get_by_role("button", name="Manual Control").click()
    expect(page.get_by_role("button", name="Z1")).to_be_visible()
    page.get_by_role("button", name="Z3").click()
    time.sleep(1)
    page.screenshot(path="verification/mock_manual_z3.png")

if __name__ == "__main__":
  with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    try:
      verify_mock_client(page)
    finally:
      browser.close()
