
from playwright.sync_api import Page, expect, sync_playwright
import time

def test_hr_zones_visualization(page: Page):
    # 1. Navigate to the experimental page
    page.goto("http://localhost:3000/client/experimental")

    # 2. Inject mock session data into IndexedDB
    mock_session = {
        "sessionId": "mock-session-visual-test",
        "startTime": 1715620000000,
        "endTime": 1715623600000,
        "status": "finished",
        "hrHistory": [],
        "timeInZones": {
            "Warm-up": 3661,
            "Fat Burn": 1200,
            "Cardio": 1800,
            "Peak": 300,
            "Max": 60,
            "No Data": 0,
            "Unknown": 0
        },
        "averageHr": 140,
        "maxHr": 180,
        "calorieHistory": [],
        "totalCaloriesBurned": 500,
        "userSettings": { "age": 30, "weight": 70, "maxHr": 190 },
        "lastSyncTime": 1715623600000,
        "syncStatus": "synced"
    }

    # Helper function to inject data via IndexedDB
    page.evaluate("""
        (sessionData) => {
            const DB_NAME = 'WorkoutSessionDB';
            const STORE_NAME = 'sessions';
            const DB_VERSION = 1;

            const req = indexedDB.open(DB_NAME, DB_VERSION);

            req.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'sessionId' });
                    store.createIndex('status', 'status');
                }
            };

            req.onsuccess = (event) => {
                const db = event.target.result;
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                store.put(sessionData);
            };
        }
    """, mock_session)

    # 3. Reload page to fetch the injected session
    time.sleep(1) # Give IDB time to write
    page.reload()

    # 4. Wait for the list to load and click the view button
    # The view button has aria-label="view"
    view_button = page.get_by_role("button", name="view").first
    view_button.wait_for()
    view_button.click()

    # 5. Wait for SessionDetail to load and verify "Time in Zones" is visible
    expect(page.get_by_text("Time in Zones")).to_be_visible()

    # 6. Take screenshot
    page.screenshot(path="verification/hr_zones_visualization.png", full_page=True)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_hr_zones_visualization(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
