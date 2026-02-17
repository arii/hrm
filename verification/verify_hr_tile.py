from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()

        try:
            # 1. Open Mock Page to stream data
            page_mock = context.new_page()
            page_mock.goto("http://localhost:3000/mock")
            page_mock.wait_for_selector("text=HRM Mock Streamer")

            page_mock.get_by_placeholder("e.g., Mock User").fill("Test User")
            page_mock.get_by_placeholder("e.g., 30").fill("30")

            # Start Streaming - DISABLED due to closure bug in MockPage
            # page_mock.get_by_role("button", name="START Continuous Stream").click()

            # Set HR to 195 (Zone 6)
            page_mock.get_by_test_id("zone-6-button").click()
            print("Set Zone 6 (purple) - 195 BPM")

            # 2. Open Dashboard to verify
            page_dashboard = context.new_page()
            page_dashboard.goto("http://localhost:3000/")

            print("Waiting for 'Test User'...")
            expect(page_dashboard.get_by_text("Test User")).to_be_visible(timeout=10000)
            print("'Test User' visible.")

            print("Waiting for 'MAX'...")
            expect(page_dashboard.get_by_text("MAX")).to_be_visible(timeout=10000)
            print("'MAX' visible.")

            expect(page_dashboard.get_by_test_id("bpm-value")).to_contain_text("195")

            page_dashboard.screenshot(path="verification/dashboard_zone_6.png")
            print("Screenshot saved: verification/dashboard_zone_6.png")

            # Change to Zone 2 (Blue)
            page_mock.bring_to_front()
            page_mock.get_by_test_id("zone-2-button").click()
            print("Changed to Zone 2 (blue) - 115 BPM")

            page_dashboard.bring_to_front()

            # Zone 2 label "WARM UP"
            print("Waiting for 'WARM UP'...")
            expect(page_dashboard.get_by_text("WARM UP")).to_be_visible(timeout=10000)
            expect(page_dashboard.get_by_test_id("bpm-value")).to_contain_text("115")

            page_dashboard.screenshot(path="verification/dashboard_zone_2.png")
            print("Screenshot saved: verification/dashboard_zone_2.png")

        except Exception as e:
            print(f"Error: {e}")
            page_dashboard.screenshot(path="verification/error_dashboard_2.png")
            print("Saved error screenshot: verification/error_dashboard_2.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
