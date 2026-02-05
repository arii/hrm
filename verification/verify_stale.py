from playwright.sync_api import Page, expect, sync_playwright
import time
import os

def test_stale_tile_verification(page: Page):
    # 1. Arrange: Go to the homepage
    page.goto("http://localhost:3000")

    # Wait for the page to be ready
    page.wait_for_function("() => window.__TEST_READY__ === true")

    # 2. Mock Date.now to a fixed point
    page.evaluate("() => { (window).__MOCKED_NOW__ = Date.now(); (window).Date.now = () => (window).__MOCKED_NOW__; }")

    # 3. Act: Dispatch active data
    hrm_data = {
        "type": "HRM_UPDATE",
        "payload": [
            {
                "clientId": "verify-stale",
                "value": 85,
                "name": "Verify Stale",
                "age": 30,
                "maxHr": 190,
                "restingHr": 60,
                "zone": "aerobic",
                "calories": 25,
            }
        ]
    }

    page.evaluate(f"(msg) => window.__TEST_CONTROLS__.dispatch(msg)", hrm_data)

    # Wait for render
    page.wait_for_selector("text=Verify Stale")

    # Take screenshot of active state
    page.screenshot(path="verification/active.png")

    # 4. Act: Move time forward by 15 seconds (exceeds warning threshold)
    page.evaluate("() => { window.__MOCKED_NOW__ += 15000; }")

    # Wait for re-render (useNow runs every 1s)
    time.sleep(2)

    # Take screenshot of stale (warning) state
    page.screenshot(path="verification/stale_warning.png")

    # 5. Act: Move time forward by another 20 seconds (exceeds stale threshold)
    page.evaluate("() => { window.__MOCKED_NOW__ += 20000; }")

    # Wait for re-render
    time.sleep(2)

    # Take screenshot of removed state (should show "No Heart Rate Data")
    page.screenshot(path="verification/removed.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_stale_tile_verification(page)
        finally:
            browser.close()
