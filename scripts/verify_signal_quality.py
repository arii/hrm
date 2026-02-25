from playwright.sync_api import sync_playwright
import time
import os

def verify_signal_quality():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 800})

        page.on("console", lambda msg: print(f"CONSOLE {msg.type}: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"PAGE ERROR: {exc}"))

        page.add_init_script("""
            localStorage.setItem('user-prefs', JSON.stringify({
                userName: 'Test User',
                userAge: 30,
                userWeight: 70,
                userHeight: 175,
                unitSystem: 'METRIC',
                gender: 'MALE',
                theme: 'dark',
                volumeLevel: 70,
                defaultWorkDuration: 20,
                defaultRestDuration: 10,
                favoritePlaylist: '',
                autoConnect: false
            }));

            const mockDevice = {
                name: 'Mock HRM',
                id: 'mock-id',
                gatt: {
                    connect: async () => ({
                        getPrimaryService: async () => ({
                            getCharacteristic: async () => ({
                                startNotifications: async () => {},
                                addEventListener: () => {},
                                readValue: async () => ({ getUint8: () => 85 })
                            })
                        }),
                        disconnect: () => {},
                        connected: true
                    }),
                    connected: false
                },
                addEventListener: () => {},
                removeEventListener: () => {}
            };

            Object.defineProperty(navigator, 'bluetooth', {
                value: {
                    getDevices: () => Promise.resolve([]),
                    requestDevice: () => Promise.resolve(mockDevice),
                    addEventListener: () => {},
                    removeEventListener: () => {},
                },
                configurable: true
            });
        """)

        url = "http://localhost:3000/client/connect"
        print(f"Navigating to {url}...")
        page.goto(url)

        print("Waiting for page load...")
        page.wait_for_selector("text=Connect Bluetooth HRM", timeout=60000)

        print("Clicking Connect button...")
        page.click("text=Connect Bluetooth HRM")

        print("Waiting for connection success...")
        page.wait_for_selector("text=Connected!", timeout=60000)

        # Now set signal status
        print("Simulating Stable Signal...")
        page.evaluate("""
            window.__TEST_CONTROLS__.setSignalStatus({ last: 1000, slow: 0 });
        """)
        time.sleep(2)
        page.screenshot(path="stable_signal.png")

        # Mock Warning signal
        print("Simulating Warning Signal...")
        page.evaluate("""
            window.__TEST_CONTROLS__.setSignalStatus({ last: 2000, slow: 1 });
        """)
        time.sleep(2)
        page.screenshot(path="warning_signal.png")

        # Mock Critical signal
        print("Simulating Critical Signal (Signal Lost)...")
        page.evaluate("""
            window.__TEST_CONTROLS__.setSignalStatus({ last: 3500, slow: 1 });
        """)
        time.sleep(2)
        page.screenshot(path="critical_signal.png")

        # Mock consecutive slow packets to trigger snackbar
        print("Triggering Snackbar Notification...")
        page.evaluate("""
            window.__TEST_CONTROLS__.setSignalStatus({ last: 2000, slow: 3 });
        """)
        time.sleep(2)
        page.screenshot(path="snackbar_warning.png")

        browser.close()

if __name__ == "__main__":
    verify_signal_quality()
