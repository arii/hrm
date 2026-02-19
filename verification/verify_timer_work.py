import os
from playwright.sync_api import sync_playwright, expect

def test_timer_display_work():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()
        page.goto("http://localhost:3000?testing=true")
        page.wait_for_selector('[data-ready="true"]', timeout=30000)

        # Dispatch a WORK phase message
        page.evaluate("""
            window.__TEST_CONTROLS__.dispatch({
                type: 'TIMER_UPDATE',
                payload: {
                    currentPhase: 'WORK',
                    timeRemaining: 20,
                    timeElapsed: 0,
                    mode: 'TABATA',
                    workDuration: 20,
                    restDuration: 10,
                    isRunning: true
                }
            });
        """)

        # Wait for UI update
        page.wait_for_timeout(500)
        page.evaluate("document.fonts.ready")

        timer_display = page.locator('[data-testid="timer-display-container"]')
        timer_display.screenshot(path="verification/timer_display_work.png")

        browser.close()

if __name__ == "__main__":
    test_timer_display_work()
