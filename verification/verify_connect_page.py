from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_connect_page(page: Page):
    print("Navigating to Connect Page...")
    page.goto("http://localhost:3000/client/connect")

    print("Waiting for page to load...")
    # Using a more generic selector if title varies
    expect(page.get_by_text("Connect Heart Rate Monitor")).to_be_visible()

    print("Checking for Weight input...")
    # The label might be "Your Weight" or similar.
    weight_input = page.get_by_label("Your Weight")
    expect(weight_input).to_be_visible()

    print("Checking for Age input...")
    age_input = page.get_by_label("Your Age")
    expect(age_input).to_be_visible()

    print("Taking screenshot...")
    page.screenshot(path="verification/connect_page.png")
    print("Screenshot saved to verification/connect_page.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        print("Launching browser...")
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_connect_page(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
