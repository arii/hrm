import re
from playwright.sync_api import Page, expect, sync_playwright

def verify_empty_dashboard(page: Page):
  """
  This test verifies that the dashboard displays the 'No Heart Rate Data'
  message and does NOT show a connect button when no data is available.
  """
  # 1. Arrange: Go to the dashboard page.
  page.goto("http://127.0.0.1:3000")

  # 2. Assert: Check for the "No Heart Rate Data" message.
  expect(page.get_by_text("No Heart Rate Data")).to_be_visible()

  # 3. Assert: Ensure no "Connect" link or button is present.
  expect(page.get_by_role("link", name=re.compile("Connect", re.IGNORECASE))).to_have_count(0)
  expect(page.get_by_role("button", name=re.compile("Connect", re.IGNORECASE))).to_have_count(0)

  # 4. Screenshot: Capture the final result for visual verification.
  page.screenshot(path="/tmp/verification.png")

if __name__ == "__main__":
  with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    try:
      verify_empty_dashboard(page)
    finally:
      browser.close()
