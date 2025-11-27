#!/usr/bin/env python3
"""
Test Settings Service locally to confirm everything works
"""

from playwright.sync_api import sync_playwright
import subprocess
import time
import signal
import os

LOCAL_URL = "http://localhost:5178"
LOGIN_URL = f"{LOCAL_URL}/login.html"
TEST_EMAIL = "standardhuman@gmail.com"
TEST_PASSWORD = "KLRss!650"

def test_local_deployment():
    """Test the local deployment"""

    print("="*70)
    print("TESTING LOCAL DEPLOYMENT")
    print("="*70)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Capture console
        errors = []

        def handle_console(msg):
            if msg.type == 'error':
                errors.append(msg.text)
                print(f"❌ Console Error: {msg.text}")
            elif 'Environment check' in msg.text:
                print(f"✅ {msg.text}")

        page.on("console", handle_console)

        print("\n📋 Testing local login page...")

        try:
            page.goto(LOGIN_URL, wait_until="networkidle", timeout=10000)
            print("✅ Login page loads")

            # Test login
            page.locator('input[type="email"]').first.fill(TEST_EMAIL)
            page.locator('input[type="password"]').first.fill(TEST_PASSWORD)
            page.locator('button[type="submit"]').first.click()

            # Wait for response
            page.wait_for_timeout(3000)

            current_url = page.url
            print(f"✅ After login: {current_url}")

            if "login" not in current_url:
                print("✅ Successfully authenticated!")
                page.screenshot(path='/tmp/settings_local_success.png')
            else:
                print("⚠️  Still on login page")
                page.screenshot(path='/tmp/settings_local_failed.png')

                # Check for errors
                error_msg = page.locator('.error, .alert').first
                if error_msg.is_visible():
                    print(f"❌ Error: {error_msg.text_content()}")

            if errors:
                print(f"\n❌ Console errors: {len(errors)}")
                for err in errors[:3]:
                    print(f"   - {err}")
                return False
            else:
                print("\n✅ No console errors!")
                return True

        except Exception as e:
            print(f"❌ Test failed: {str(e)}")
            return False
        finally:
            browser.close()

if __name__ == "__main__":
    # Check if server is running
    try:
        import requests
        response = requests.get(LOCAL_URL, timeout=2)
        print("✅ Dev server is already running")
        test_local_deployment()
    except:
        print("❌ Dev server is not running")
        print("\nTo test locally, run:")
        print("  npm run dev")
        print("\nThen run this test again")
