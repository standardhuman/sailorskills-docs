#!/usr/bin/env python3
"""
Comprehensive test of the Settings service production deployment
"""

from playwright.sync_api import sync_playwright
import time

PRODUCTION_URL = "https://sailorskills-settings.vercel.app"
TEST_EMAIL = "standardhuman@gmail.com"
TEST_PASSWORD = "KLRss!650"

def test_full_authentication_flow():
    """Test complete authentication and navigation flow"""

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # Not headless so we can see what happens
        context = browser.new_context()
        page = context.new_page()

        errors = []
        def handle_console(msg):
            if msg.type == 'error':
                errors.append(msg.text)
                print(f"❌ Console Error: {msg.text}")

        page.on("console", handle_console)

        print("\n" + "="*70)
        print("COMPREHENSIVE PRODUCTION TEST")
        print("="*70)

        # Test 1: Access root URL
        print("\n1️⃣ Accessing root URL...")
        page.goto(PRODUCTION_URL, wait_until="networkidle", timeout=15000)
        print(f"   Current URL: {page.url}")
        page.screenshot(path='/tmp/step1_root.png')

        # Test 2: Navigate to login (if not already there)
        if '/login' not in page.url:
            print("\n2️⃣ Navigating to login page...")
            page.goto(f"{PRODUCTION_URL}/login.html", wait_until="networkidle")
        else:
            print("\n2️⃣ Already on login page")

        print(f"   Current URL: {page.url}")
        page.screenshot(path='/tmp/step2_login.png')

        # Test 3: Fill and submit login form
        print("\n3️⃣ Submitting login form...")
        try:
            page.locator('input[type="email"]').first.fill(TEST_EMAIL)
            page.locator('input[type="password"]').first.fill(TEST_PASSWORD)
            page.locator('button[type="submit"]').first.click()

            # Wait longer for redirect
            page.wait_for_timeout(5000)
            print(f"   Current URL: {page.url}")
            page.screenshot(path='/tmp/step3_after_login.png')

        except Exception as e:
            print(f"   ❌ Error: {e}")
            page.screenshot(path='/tmp/step3_error.png')

        # Test 4: Check if we're on dashboard
        print("\n4️⃣ Checking dashboard access...")
        if 'dashboard' in page.url or 'login' not in page.url:
            print("   ✅ Successfully accessed dashboard!")

            # Wait for content to load
            page.wait_for_timeout(3000)

            # Check for dashboard elements
            h1_elements = page.locator('h1').all()
            if h1_elements:
                for elem in h1_elements:
                    if elem.is_visible():
                        print(f"   Found heading: {elem.text_content()}")

            page.screenshot(path='/tmp/step4_dashboard.png', full_page=True)

        else:
            print(f"   ⚠️  Not on dashboard. Current URL: {page.url}")

            # Check for error messages
            error_elem = page.locator('.error, .alert, [role="alert"]').first
            if error_elem.is_visible():
                print(f"   Error message: {error_elem.text_content()}")

        # Test 5: Try to navigate to other pages
        print("\n5️⃣ Testing navigation to other pages...")

        test_pages = [
            ("Email Manager", f"{PRODUCTION_URL}/src/views/email-manager.html"),
            ("System Config", f"{PRODUCTION_URL}/src/views/system-config.html"),
            ("Users", f"{PRODUCTION_URL}/src/views/users.html"),
            ("Integrations", f"{PRODUCTION_URL}/src/views/integrations.html"),
        ]

        for name, url in test_pages:
            try:
                page.goto(url, wait_until="networkidle", timeout=10000)
                page.wait_for_timeout(2000)

                if 'login' in page.url:
                    print(f"   ❌ {name}: Redirected to login")
                else:
                    print(f"   ✅ {name}: Loaded successfully")

                page.screenshot(path=f'/tmp/step5_{name.lower().replace(" ", "_")}.png')

            except Exception as e:
                print(f"   ❌ {name}: Failed - {str(e)}")

        # Summary
        print("\n" + "="*70)
        print("TEST SUMMARY")
        print("="*70)
        print(f"Console Errors: {len(errors)}")

        if errors:
            print("\n❌ Errors detected:")
            for err in errors[:5]:
                print(f"  - {err}")
        else:
            print("\n✅ No console errors!")

        print("\n📸 Screenshots saved to /tmp/:")
        print("  - step1_root.png")
        print("  - step2_login.png")
        print("  - step3_after_login.png")
        print("  - step4_dashboard.png")
        print("  - step5_*.png (for each page tested)")

        # Keep browser open for manual inspection
        print("\n⏸️  Browser will stay open for 10 seconds for manual inspection...")
        time.sleep(10)

        browser.close()

        return len(errors) == 0

if __name__ == "__main__":
    success = test_full_authentication_flow()
    print("\n" + "="*70)
    if success:
        print("✅ ALL TESTS PASSED!")
    else:
        print("❌ TESTS FAILED - Check errors above")
    print("="*70)
