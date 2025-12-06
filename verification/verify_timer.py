
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto("http://127.0.0.1:3000/client/control")
    page.screenshot(path="/app/verification/timer-stopped.png")
    browser.close()
