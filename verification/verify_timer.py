from playwright.sync_api import sync_playwright
import time

def verify_timer():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        try:
            # Wait for server to start (simple retry)
            for _ in range(30):
                try:
                    page.goto("http://localhost:3000/", timeout=3000)
                    break
                except:
                    time.sleep(1)
            else:
                raise Exception("Server failed to start")

            # Wait for timer display
            timer_container = page.locator('[data-testid="timer-display-container"]')
            timer_container.wait_for(timeout=10000)

            # Take screenshot
            page.screenshot(path="verification/timer_display.png")
            print("Screenshot taken")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_timer()
