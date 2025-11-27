#!/usr/bin/env python3
"""Test diving.sailorskills.com specifically"""

from playwright.sync_api import sync_playwright
import time

URL = "https://diving.sailorskills.com/"

def test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # Visible
        page = browser.new_page()

        console_logs = []
        def handle_console(msg):
            console_logs.append(msg.text)
            if 'pricing' in msg.text.lower() or 'dynamic' in msg.text.lower():
                print(f"✅ {msg.text}")

        page.on("console", handle_console)

        print("Loading diving.sailorskills.com...")
        page.goto(URL, wait_until="networkidle", timeout=30000)

        print("\nWaiting 5 seconds for all initialization...")
        page.wait_for_timeout(5000)

        # Check what the page actually shows
        try:
            propeller_elem = page.locator('text="Propeller"').first
            parent = propeller_elem.locator('..')
            text = parent.text_content()
            print(f"\nPropeller card text:\n{text}\n")

            if "$366" in text:
                print("✅ Shows $366!")
            elif "$349" in text:
                print("❌ Still shows $349")

        except Exception as e:
            print(f"Error: {e}")

        print("\nKeeping browser open for 10 seconds...")
        time.sleep(10)

        browser.close()

if __name__ == "__main__":
    test()
