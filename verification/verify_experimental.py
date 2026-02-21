from playwright.sync_api import Page, expect, sync_playwright

def verify_experimental_page(page: Page):
    print("Navigating to Experimental Page...")
    page.goto("http://localhost:3000/client/experimental")

    print("Waiting for page to load...")
    # Check for New Workout button if we are in list view
    new_workout_btn = page.get_by_role("button", name="New Workout")
    if new_workout_btn.is_visible():
        print("Clicking New Workout...")
        new_workout_btn.click()

    print("Waiting for dashboard elements...")
    # Check for "Time in Zones"
    expect(page.get_by_text("Time in Zones")).to_be_visible()

    # Check for "No zone data available for this session."
    expect(page.get_by_text("No zone data available for this session.")).to_be_visible()

    print("Taking screenshot...")
    page.screenshot(path="verification/experimental_page.png")
    print("Screenshot saved to verification/experimental_page.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_experimental_page(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/experimental_error.png")
        finally:
            browser.close()
