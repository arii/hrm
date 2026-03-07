from playwright.sync_api import sync_playwright, expect

def verify_changes():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Go to dashboard
        page.goto("http://localhost:3000/")
        page.wait_for_load_state("networkidle")

        # Verify Footer is visible and take a screenshot
        footer = page.get_by_test_id("footer")
        expect(footer).to_be_visible()
        footer.screenshot(path="/home/jules/verification/footer2.png")

        browser.close()

if __name__ == "__main__":
    verify_changes()
