
import time
from playwright.sync_api import sync_playwright

def verify_spotify_display_debug():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Capture console logs
        page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"BROWSER ERROR: {exc}"))

        print("Navigating to /client/spotify-selection to verify VolumeControl...")
        try:
            page.goto("http://127.0.0.1:3000/client/spotify-selection")

            # Wait for the page to load
            time.sleep(5)

            # Take a screenshot
            screenshot_path = "/home/jules/verification/spotify_selection_debug.png"
            page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")

            if page.locator("span.MuiSlider-root").count() > 0:
                 print("Slider found on page!")
            else:
                 print("Slider NOT found on page!")
        except Exception as e:
            print(f"NAVIGATION ERROR: {e}")

        browser.close()

if __name__ == "__main__":
    verify_spotify_display_debug()
