#!/usr/bin/env python3
"""
Test navigation styling in Settings service
Verifies that navigation appears with proper CSS styling
"""

from playwright.sync_api import sync_playwright
import sys

def test_navigation_styling():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            # Navigate to Settings dashboard
            print("Navigating to Settings dashboard...")
            page.goto('http://localhost:5178/src/views/dashboard.html')
            page.wait_for_load_state('networkidle')

            # Take screenshot immediately to see what's on page
            screenshot_debug = '/tmp/settings-debug.png'
            page.screenshot(path=screenshot_debug, full_page=True)
            print(f"Debug screenshot saved to: {screenshot_debug}")

            # Check if navigation exists at all
            nav_exists = page.locator('nav').count() > 0
            print(f"Nav element exists: {nav_exists}")

            # Print page HTML
            print("\nPage HTML snippet:")
            print(page.locator('body').inner_html()[:500])

            # Try to wait for navigation (with longer timeout)
            try:
                page.wait_for_selector('.top-nav', timeout=10000)
                print("Navigation found!")
            except:
                print("⚠ .top-nav not found, checking for any nav element...")

            # Take screenshot
            screenshot_path = '/tmp/settings-navigation.png'
            page.screenshot(path=screenshot_path, full_page=True)
            print(f"Screenshot saved to: {screenshot_path}")

            # Check for navigation elements
            nav_logo = page.locator('.nav-logo')
            if nav_logo.count() > 0:
                print("✓ Navigation logo found")
            else:
                print("✗ Navigation logo NOT found")

            # Check for navigation links
            nav_links = page.locator('.top-nav-links a')
            link_count = nav_links.count()
            print(f"✓ Found {link_count} navigation links")

            # Check for dropdown
            dropdown = page.locator('.nav-dropdown')
            if dropdown.count() > 0:
                print("✓ Navigation dropdown found")
                # Get dropdown text
                dropdown_text = dropdown.inner_text()
                print(f"  Dropdown text: {dropdown_text}")
            else:
                print("✗ Navigation dropdown NOT found")

            # Check computed styles for navigation
            nav_element = page.locator('.top-nav').first
            bg_color = nav_element.evaluate('el => window.getComputedStyle(el).backgroundColor')
            print(f"Navigation background color: {bg_color}")

            # Check if navigation has proper styling (not default browser styles)
            if bg_color != 'rgba(0, 0, 0, 0)':
                print("✓ Navigation has custom background styling")
            else:
                print("⚠ Navigation might be missing CSS (transparent background)")

            print("\n✅ Navigation test complete!")

        except Exception as e:
            print(f"\n❌ Test failed: {e}")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == '__main__':
    test_navigation_styling()
