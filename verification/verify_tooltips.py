from playwright.sync_api import Page, expect, sync_playwright

def verify_tooltips(page: Page):
    """
    Verifies that the Timer Controls increment/decrement buttons have tooltips.
    """
    # 1. Navigate to the Control Panel
    page.goto("http://localhost:3000/client/control")

    # 2. Wait for the page to load
    expect(page.get_by_text("Timer Mode")).to_be_visible()

    # 3. Locate the "Decrease work duration" button (icon-only button)
    decrease_work_btn = page.get_by_label("Decrease work duration")
    expect(decrease_work_btn).to_be_visible()

    # 4. Hover over the button to trigger the tooltip
    decrease_work_btn.hover()

    # 5. Assert that the tooltip "Decrease by 5s" appears
    tooltip = page.get_by_role("tooltip", name="Decrease by 5s")
    expect(tooltip).to_be_visible()

    # 6. Screenshot with tooltip visible
    page.screenshot(path="/home/jules/verification/tooltip_verification.png")
    print("Screenshot captured with tooltip visible")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_tooltips(page)
        finally:
            browser.close()
