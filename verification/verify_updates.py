from playwright.sync_api import sync_playwright
import os

def run():
    # Use the absolute path to index.html
    file_path = f"file://{os.path.abspath('index.html')}"

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(file_path)

        # Take a full page screenshot to verify all sections
        page.screenshot(path="verification/index_update.png", full_page=True)

        # Take a screenshot of the Hero Section specifically
        hero = page.locator(".hero-content")
        hero.screenshot(path="verification/hero_section.png")

        # Take a screenshot of the How It Works section
        how_it_works = page.locator("#how-it-works")
        how_it_works.screenshot(path="verification/how_it_works.png")

        # Take a screenshot of the Footer to verify Strava logo removal
        footer = page.locator("footer")
        footer.screenshot(path="verification/footer.png")

        browser.close()

if __name__ == "__main__":
    run()
