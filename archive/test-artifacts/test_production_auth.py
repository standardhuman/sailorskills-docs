#!/usr/bin/env python3
"""
Test Settings Service Production Deployment
Tests authentication, page loading, and console errors after Vercel env var fix
"""

from playwright.sync_api import sync_playwright
import sys

PRODUCTION_URL = "https://sailorskills-settings.vercel.app"
LOGIN_URL = f"{PRODUCTION_URL}/login.html"
DASHBOARD_URL = f"{PRODUCTION_URL}/src/views/dashboard.html"
TEST_EMAIL = "standardhuman@gmail.com"
TEST_PASSWORD = "KLRss!650"

def test_production_deployment():
    """Test the production deployment with authentication"""

    with sync_playwright() as p:
        # Launch browser in headless mode
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Capture console messages
        console_messages = []
        errors = []

        def handle_console(msg):
            console_messages.append({
                'type': msg.type,
                'text': msg.text
            })
            if msg.type == 'error':
                errors.append(msg.text)
                print(f"❌ Console Error: {msg.text}")

        page.on("console", handle_console)

        print("\n" + "="*70)
        print("TESTING SETTINGS SERVICE PRODUCTION DEPLOYMENT")
        print("="*70)

        # Test 1: Check if login page exists
        print("\n📋 Test 1: Checking login page...")
        try:
            response = page.goto(LOGIN_URL, wait_until="networkidle", timeout=15000)
            print(f"✅ Login page loads: {response.status}")

            # Take screenshot
            page.screenshot(path='/tmp/settings_login_page.png', full_page=True)
            print("📸 Screenshot saved: /tmp/settings_login_page.png")

        except Exception as e:
            print(f"❌ Login page failed to load: {str(e)}")

            # Try the root URL
            print("\n📋 Trying root URL...")
            try:
                response = page.goto(PRODUCTION_URL, wait_until="networkidle", timeout=15000)
                print(f"✅ Root URL loads: {response.status}")
                page.screenshot(path='/tmp/settings_root_page.png', full_page=True)
                print("📸 Screenshot saved: /tmp/settings_root_page.png")

            except Exception as e2:
                print(f"❌ Root URL also failed: {str(e2)}")
                browser.close()
                return False

        # Test 2: Check page content
        print("\n📋 Test 2: Checking page content...")
        page_content = page.content()

        if "login" in page_content.lower() or "email" in page_content.lower():
            print("✅ Page contains login-related content")
        else:
            print("⚠️  No login content found on page")
            print(f"Page title: {page.title()}")

        # Check for form elements
        try:
            email_input = page.locator('input[type="email"], input#email, input[name="email"]').first
            password_input = page.locator('input[type="password"], input#password, input[name="password"]').first
            submit_button = page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")').first

            if email_input.is_visible() and password_input.is_visible():
                print("✅ Login form found with email and password fields")

                # Test 3: Try to login
                print("\n📋 Test 3: Testing authentication...")

                email_input.fill(TEST_EMAIL)
                password_input.fill(TEST_PASSWORD)
                print(f"✅ Filled credentials: {TEST_EMAIL}")

                # Click submit and wait
                submit_button.click()
                print("✅ Clicked submit button")

                # Wait for navigation or error
                try:
                    page.wait_for_load_state("networkidle", timeout=10000)
                    current_url = page.url
                    print(f"✅ Page loaded: {current_url}")

                    # Take screenshot after login attempt
                    page.screenshot(path='/tmp/settings_after_login.png', full_page=True)
                    print("📸 Screenshot saved: /tmp/settings_after_login.png")

                    # Check if we're on dashboard or still on login
                    if "dashboard" in current_url or "login" not in current_url:
                        print("✅ Successfully redirected after login")

                        # Test 4: Check dashboard content
                        print("\n📋 Test 4: Checking dashboard content...")
                        page.wait_for_timeout(2000)  # Wait for any dynamic content

                        # Check for common dashboard elements
                        if page.locator('h1, h2').count() > 0:
                            heading = page.locator('h1, h2').first.text_content()
                            print(f"✅ Dashboard heading found: {heading}")

                        # Test navigation to other pages
                        print("\n📋 Test 5: Testing navigation...")
                        nav_links = [
                            ("Email Manager", f"{PRODUCTION_URL}/src/views/email-manager.html"),
                            ("System Config", f"{PRODUCTION_URL}/src/views/system-config.html"),
                            ("Users", f"{PRODUCTION_URL}/src/views/users.html")
                        ]

                        for name, url in nav_links:
                            try:
                                page.goto(url, wait_until="networkidle", timeout=10000)
                                print(f"✅ {name} page loads successfully")
                                page.wait_for_timeout(1000)
                            except Exception as e:
                                print(f"❌ {name} page failed: {str(e)}")

                    else:
                        print("⚠️  Still on login page after submission")
                        print(f"Current URL: {current_url}")

                        # Check for error messages
                        error_elements = page.locator('.error, .alert, [role="alert"]').all()
                        if error_elements:
                            for elem in error_elements:
                                if elem.is_visible():
                                    print(f"❌ Error message: {elem.text_content()}")

                except Exception as e:
                    print(f"❌ Error during login process: {str(e)}")
                    page.screenshot(path='/tmp/settings_login_error.png', full_page=True)
                    print("📸 Error screenshot saved: /tmp/settings_login_error.png")

            else:
                print("❌ Login form not found or not visible")

        except Exception as e:
            print(f"❌ Could not find login form: {str(e)}")

        # Summary
        print("\n" + "="*70)
        print("TEST SUMMARY")
        print("="*70)
        print(f"\n📊 Console Messages: {len(console_messages)}")
        print(f"❌ Console Errors: {len(errors)}")

        if errors:
            print("\n🔴 Console Errors Detected:")
            for i, error in enumerate(errors[:5], 1):  # Show first 5 errors
                print(f"{i}. {error}")
        else:
            print("\n✅ No console errors detected!")

        print("\n📸 Screenshots saved to /tmp/")
        print("   - /tmp/settings_login_page.png")
        print("   - /tmp/settings_after_login.png")
        print("   - /tmp/settings_login_error.png (if errors occurred)")

        browser.close()

        return len(errors) == 0

if __name__ == "__main__":
    success = test_production_deployment()
    sys.exit(0 if success else 1)
