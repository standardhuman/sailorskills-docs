#!/usr/bin/env python3
"""
Test that Estimator is loading dynamic pricing correctly
"""

from playwright.sync_api import sync_playwright
import json

ESTIMATOR_URL = "https://sailorskills.com"

def test_estimator_pricing():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Capture console logs
        console_logs = []
        def handle_console(msg):
            console_logs.append({
                'type': msg.type,
                'text': msg.text
            })
            print(f"[{msg.type.upper()}] {msg.text}")

        page.on("console", handle_console)

        print("="*70)
        print("TESTING ESTIMATOR DYNAMIC PRICING")
        print("="*70)

        # Load the page
        print("\n1️⃣ Loading Estimator...")
        page.goto(ESTIMATOR_URL, wait_until="networkidle", timeout=30000)

        # Wait for JavaScript to initialize
        page.wait_for_timeout(3000)

        # Check if dynamic pricing loaded
        print("\n2️⃣ Checking console logs...")
        pricing_loaded = False
        for log in console_logs:
            if 'Dynamic pricing loaded' in log['text']:
                pricing_loaded = True
                print(f"   ✅ {log['text']}")

        if not pricing_loaded:
            print("   ❌ Dynamic pricing not loaded!")
            print("   Looking for errors...")
            for log in console_logs:
                if log['type'] == 'error':
                    print(f"   ❌ {log['text']}")

        # Execute JavaScript to get the actual pricing values
        print("\n3️⃣ Reading pricing from JavaScript...")
        result = page.evaluate("""
            () => {
                // Access the serviceData object
                if (typeof serviceData !== 'undefined') {
                    return {
                        propeller_rate: serviceData.propeller_service?.rate,
                        propeller_desc: serviceData.propeller_service?.description,
                        underwater_rate: serviceData.underwater_inspection?.rate,
                        underwater_desc: serviceData.underwater_inspection?.description,
                        available: true
                    };
                }
                return { available: false };
            }
        """)

        if result['available']:
            print(f"\n   Propeller Service:")
            print(f"     Rate: ${result['propeller_rate']}")
            print(f"     Description: {result['propeller_desc'][:80]}...")

            print(f"\n   Underwater Inspection:")
            print(f"     Rate: ${result['underwater_rate']}")
            print(f"     Description: {result['underwater_desc'][:80]}...")

            # Check if propeller rate matches expected
            if result['propeller_rate'] == 366:
                print(f"\n   ✅ Propeller rate matches database ($366)")
            else:
                print(f"\n   ❌ Propeller rate mismatch!")
                print(f"      Expected: $366")
                print(f"      Got: ${result['propeller_rate']}")
        else:
            print("   ❌ serviceData not available!")

        # Check the rendered HTML
        print("\n4️⃣ Checking rendered HTML...")
        propeller_text = page.locator('text="Propeller Removal/Installation"').locator('..').text_content()
        print(f"   Propeller card text: {propeller_text}")

        if "$366" in propeller_text:
            print("   ✅ Shows $366 in HTML")
        elif "$349" in propeller_text:
            print("   ❌ Still shows $349 in HTML")
        else:
            print("   ⚠️  Price not found in HTML")

        # Take screenshot
        page.screenshot(path='/tmp/estimator_pricing_test.png', full_page=True)
        print("\n📸 Screenshot saved: /tmp/estimator_pricing_test.png")

        browser.close()

if __name__ == "__main__":
    test_estimator_pricing()
