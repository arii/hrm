from playwright.sync_api import sync_playwright, expect

def test_spotify_display(page):
    print("Navigating to dashboard...")
    page.goto("http://localhost:3000/")

    print("Waiting for Spotify Auth Container...")
    # Wait for the login button (initial state)
    login_container = page.locator('[data-testid="spotify-auth-container"]')
    expect(login_container).to_be_visible(timeout=15000)

    print("Taking screenshot...")
    # Take screenshot of login state
    page.screenshot(path="verification_spotify_display.png")
    print("Screenshot saved to verification_spotify_display.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            test_spotify_display(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification_error.png")
        finally:
            browser.close()
