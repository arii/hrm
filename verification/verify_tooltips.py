import os
from playwright.sync_api import Page, expect, sync_playwright

def verify_tooltips(page: Page, base_url: str, screenshot_dir: str):
    """
    Verifies that the Timer Controls increment/decrement buttons have tooltips.
    """
    print(f"Navigating to {base_url}/client/control")
    page.goto(f"{base_url}/client/control")

    # Wait for page load
    expect(page.get_by_text("Timer Mode")).to_be_visible()

    # 1. Verify "Decrease work duration" tooltip
    print("Verifying 'Decrease work duration' tooltip...")
    decrease_work_btn = page.get_by_label("Decrease work duration")
    expect(decrease_work_btn).to_be_visible()
    decrease_work_btn.hover()
    expect(page.get_by_role("tooltip", name="Decrease by 5s")).to_be_visible()
    page.screenshot(path=os.path.join(screenshot_dir, "decrease_work_tooltip.png"))

    # 2. Verify "Increase work duration" tooltip
    print("Verifying 'Increase work duration' tooltip...")
    # Move mouse away to close previous tooltip
    page.mouse.move(0, 0)

    increase_work_btn = page.get_by_label("Increase work duration")
    expect(increase_work_btn).to_be_visible()
    increase_work_btn.hover()
    expect(page.get_by_role("tooltip", name="Increase by 5s")).to_be_visible()
    page.screenshot(path=os.path.join(screenshot_dir, "increase_work_tooltip.png"))

if __name__ == "__main__":
    app_url = os.environ.get("APP_URL", "http://localhost:3000")
    # Use a relative path for artifacts
    output_dir = os.environ.get("TEST_SCREENSHOT_DIR", "verification/screenshots")
    os.makedirs(output_dir, exist_ok=True)

    print(f"Starting verification against {app_url}")
    print(f"Screenshots will be saved to {output_dir}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_tooltips(page, app_url, output_dir)
            print(f"✅ Tooltips verified successfully. Screenshots saved to {output_dir}")
        except Exception as e:
            print(f"❌ Verification failed: {e}")
            page.screenshot(path=os.path.join(output_dir, "failure.png"))
            exit(1)
        finally:
            browser.close()
