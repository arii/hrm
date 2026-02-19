import os
from playwright.sync_api import sync_playwright, expect

def test_timer_display():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Set viewport to something that shows the timer well
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        # Navigate to the dashboard
        page.goto("http://localhost:3000")

        # Wait for the dashboard to be ready (custom hook sets data-ready="true")
        page.wait_for_selector('[data-ready="true"]', timeout=30000)

        # Wait for fonts to load
        page.evaluate("document.fonts.ready")

        # Take a screenshot of the TimerDisplay
        timer_display = page.locator('[data-testid="timer-display-container"]')
        timer_display.screenshot(path="verification/timer_display.png")

        # Also take a full page screenshot
        page.screenshot(path="verification/full_dashboard.png")

        browser.close()

if __name__ == "__main__":
    test_timer_display()
