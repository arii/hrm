from playwright.sync_api import sync_playwright, expect

def verify_changes():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Go to control panel
        page.goto("http://localhost:3000/client/control")
        page.wait_for_load_state("networkidle")

        # Verify SpotifySearchInput is visible and take a screenshot
        search_input = page.locator(".MuiAutocomplete-root")
        expect(search_input).to_be_visible()
        search_input.screenshot(path="/home/jules/verification/spotify-search-input.png")

        # Verify Footer is visible and take a screenshot
        footer = page.get_by_test_id("footer")
        expect(footer).to_be_visible()
        footer.screenshot(path="/home/jules/verification/footer.png")

        browser.close()

if __name__ == "__main__":
    verify_changes()
