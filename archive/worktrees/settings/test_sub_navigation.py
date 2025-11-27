#!/usr/bin/env python3
"""
Test sub-navigation in Settings service
Verifies that horizontal tab navigation appears on all pages
"""

from playwright.sync_api import sync_playwright
import sys

def test_sub_navigation():
    pages_to_test = [
        {'url': '/src/views/dashboard.html', 'expected_active': 'Dashboard'},
        {'url': '/src/views/email-manager.html', 'expected_active': 'Email Templates'},
        {'url': '/src/views/email-logs.html', 'expected_active': 'Email Logs'},
        {'url': '/src/views/system-config.html', 'expected_active': 'Pricing'},
        {'url': '/src/views/users.html', 'expected_active': 'Users'},
        {'url': '/src/views/integrations.html', 'expected_active': 'Integrations'},
    ]

    expected_tabs = ['Dashboard', 'Email Templates', 'Email Logs', 'Pricing', 'Users', 'Integrations']

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            all_passed = True

            for test_page in pages_to_test:
                print(f"\n{'='*60}")
                print(f"Testing: {test_page['url']}")
                print('='*60)

                page.goto(f"http://localhost:5178{test_page['url']}")
                page.wait_for_load_state('networkidle')

                # Check if sub-navigation exists
                sub_nav = page.locator('.sub-nav')
                if sub_nav.count() == 0:
                    print(f"❌ Sub-navigation not found on {test_page['url']}")
                    all_passed = False
                    continue

                print("✅ Sub-navigation element found")

                # Check all tabs are present
                tabs = page.locator('.sub-nav a').all()
                tab_texts = [tab.inner_text() for tab in tabs]

                # Extract just the text (remove icons)
                tab_labels = []
                for text in tab_texts:
                    # Remove emoji/icon at start
                    label = ' '.join(text.split()[1:]) if text and text[0] not in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' else text
                    tab_labels.append(label.strip())

                print(f"  Found tabs: {tab_labels}")

                if len(tab_labels) != len(expected_tabs):
                    print(f"  ❌ Expected {len(expected_tabs)} tabs, found {len(tab_labels)}")
                    all_passed = False
                else:
                    print(f"  ✅ All {len(expected_tabs)} tabs present")

                # Check if correct tab is active
                active_tab = page.locator('.sub-nav a.active')
                if active_tab.count() > 0:
                    active_text = active_tab.inner_text()
                    # Remove emoji
                    active_label = ' '.join(active_text.split()[1:]) if active_text and active_text[0] not in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' else active_text
                    active_label = active_label.strip()

                    if active_label == test_page['expected_active']:
                        print(f"  ✅ Correct tab active: '{active_label}'")
                    else:
                        print(f"  ❌ Wrong tab active: '{active_label}' (expected: '{test_page['expected_active']}')")
                        all_passed = False
                else:
                    print(f"  ⚠  No active tab found (expected: '{test_page['expected_active']}')")
                    all_passed = False

            # Take final screenshot
            page.goto('http://localhost:5178/src/views/dashboard.html')
            page.wait_for_load_state('networkidle')
            screenshot_path = '/tmp/settings-with-subnav.png'
            page.screenshot(path=screenshot_path, full_page=True)
            print(f"\n{'='*60}")
            print(f"Final screenshot saved to: {screenshot_path}")
            print('='*60)

            if all_passed:
                print("\n✅ All sub-navigation tests PASSED!")
            else:
                print("\n❌ Some sub-navigation tests FAILED")
                sys.exit(1)

        except Exception as e:
            print(f"\n❌ Test failed: {e}")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == '__main__':
    test_sub_navigation()
