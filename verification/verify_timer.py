from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    context = browser.new_context()
    page = context.new_page()
    page.goto("http://localhost:3000/")

    # Wait for dashboard
    page.wait_for_selector('[data-testid="dashboard"]', timeout=15000)

    # Wait for timer display
    page.wait_for_selector('[data-testid="timer-display-container"]')

    # Take screenshot
    page.screenshot(path="verification/timer_display.png")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
