from playwright.sync_api import sync_playwright, expect
import time

def run():
    with sync_playwright() as p:
        print("Launching browser...")
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        url = "http://localhost:3000/client/connect"
        print(f"Navigating to {url}")
        page.goto(url)

        # Wait for the page to signal readiness
        try:
            page.wait_for_selector('[data-ready="true"]', timeout=10000)
            print("Page is ready.")
        except Exception as e:
            print(f"Wait for ready timed out or failed: {e}")
            # Continue anyway to capture screenshot of error state if any

        # Look for the Reset Button
        reset_button = page.get_by_role("button", name="Reset Permissions & Settings")

        try:
            expect(reset_button).to_be_visible(timeout=5000)
            print("Reset button found and visible.")
            reset_button.scroll_into_view_if_needed()

            # Take a screenshot of the bottom area
            # We can also try to locate the container by text content to get the border
            section_text = page.get_by_text("Resets server state AND forgets Bluetooth device connection.")
            expect(section_text).to_be_visible()

            # Screenshot the whole page to see the bottom section
            page.screenshot(path="verification/reset_section_full.png", full_page=True)
            print("Full page screenshot saved to verification/reset_section_full.png")

        except Exception as e:
            print(f"Error finding reset button or taking screenshot: {e}")
            page.screenshot(path="verification/error.png")

        browser.close()

if __name__ == "__main__":
    run()
