import time
from playwright.sync_api import sync_playwright

def verify_spotify_display():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Navigate to the dashboard
        page.goto("http://127.0.0.1:3000")

        # Inject mock state into the page to trigger SpotifyDisplay
        # This is tricky because SpotifyDisplay relies on WebSocket and NextAuth.
        # However, we can check if the Login button is visible, which means it rendered.
        # Or we can navigate to /client/spotify-selection to see the VolumeControl.

        print("Navigating to /client/spotify-selection to verify VolumeControl...")
        page.goto("http://127.0.0.1:3000/client/spotify-selection")

        # Wait for the page to load
        time.sleep(5)

        # Take a screenshot
        screenshot_path = "/home/jules/verification/spotify_selection_verification.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        # We also want to see the SpotifyDisplay logic if possible.
        # But verifying authenticated state without real creds is hard.
        # The decomposition can be verified by the fact the components work in isolation (unit tests passed)
        # and the selection page loads (integration).

        # Let's check if the VolumeControl elements are present on the selection page.
        # It should have a slider.
        if page.locator("span.MuiSlider-root").count() > 0:
             print("Slider found on page!")
        else:
             print("Slider NOT found on page!")

        browser.close()

if __name__ == "__main__":
    verify_spotify_display()
