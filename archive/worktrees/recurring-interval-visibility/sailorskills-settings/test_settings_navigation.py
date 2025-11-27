#!/usr/bin/env python3
"""
Test third-tier sub-navigation on all Settings pages
Verifies that horizontal navigation tabs appear on each page
"""

from playwright.sync_api import sync_playwright
import sys

def test_settings_navigation():
    """Test that all Settings pages display sub-navigation tabs"""

    pages_to_test = [
        {'url': 'http://localhost:5178/src/views/dashboard.html', 'name': 'Dashboard'},
        {'url': 'http://localhost:5178/src/views/email-manager.html', 'name': 'Email Manager'},
        {'url': 'http://localhost:5178/src/views/email-logs.html', 'name': 'Email Logs'},
        {'url': 'http://localhost:5178/src/views/system-config.html', 'name': 'System Config'},
        {'url': 'http://localhost:5178/src/views/users.html', 'name': 'Users'},
        {'url': 'http://localhost:5178/src/views/integrations.html', 'name': 'Integrations'},
    ]

    expected_tabs = [
        'Dashboard',
        'Email Templates',
        'Email Logs',
        'Pricing',
        'Users',
        'Integrations'
    ]

    results = []
    all_passed = True

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        for page_info in pages_to_test:
            print(f"\n{'='*60}")
            print(f"Testing: {page_info['name']}")
            print(f"URL: {page_info['url']}")
            print('='*60)

            try:
                # Navigate and wait for page to load
                page.goto(page_info['url'], wait_until='networkidle', timeout=10000)

                # Wait for navigation to render
                page.wait_for_timeout(1000)

                # Check for sub-navigation container
                sub_nav = page.locator('.sub-nav').first

                if not sub_nav.is_visible():
                    print(f"❌ FAIL: No sub-navigation found on {page_info['name']}")
                    all_passed = False
                    results.append({'page': page_info['name'], 'status': 'FAIL', 'reason': 'Sub-nav not visible'})
                    continue

                print(f"✅ Sub-navigation container found")

                # Check for all expected tabs
                tabs_found = []
                tabs_missing = []

                for tab_label in expected_tabs:
                    # Look for tab links containing the label text
                    tab = page.locator(f'.sub-nav a:has-text("{tab_label}")').first

                    if tab.is_visible():
                        tabs_found.append(tab_label)
                        print(f"  ✅ Tab found: {tab_label}")
                    else:
                        tabs_missing.append(tab_label)
                        print(f"  ❌ Tab missing: {tab_label}")

                # Take screenshot
                screenshot_path = f"/tmp/settings-nav-{page_info['name'].lower().replace(' ', '-')}.png"
                page.screenshot(path=screenshot_path, full_page=True)
                print(f"📸 Screenshot saved: {screenshot_path}")

                # Determine pass/fail
                if len(tabs_missing) == 0:
                    print(f"\n✅ PASS: All {len(expected_tabs)} tabs present on {page_info['name']}")
                    results.append({'page': page_info['name'], 'status': 'PASS', 'tabs': len(tabs_found)})
                else:
                    print(f"\n❌ FAIL: {len(tabs_missing)} tabs missing on {page_info['name']}")
                    print(f"Missing: {', '.join(tabs_missing)}")
                    all_passed = False
                    results.append({'page': page_info['name'], 'status': 'FAIL', 'missing': tabs_missing})

            except Exception as e:
                print(f"❌ ERROR on {page_info['name']}: {str(e)}")
                all_passed = False
                results.append({'page': page_info['name'], 'status': 'ERROR', 'error': str(e)})

        browser.close()

    # Summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print('='*60)

    for result in results:
        status_icon = '✅' if result['status'] == 'PASS' else '❌'
        print(f"{status_icon} {result['page']}: {result['status']}")
        if 'missing' in result:
            print(f"   Missing tabs: {', '.join(result['missing'])}")

    print(f"\nTotal pages tested: {len(results)}")
    print(f"Passed: {sum(1 for r in results if r['status'] == 'PASS')}")
    print(f"Failed: {sum(1 for r in results if r['status'] in ['FAIL', 'ERROR'])}")

    if all_passed:
        print("\n🎉 All tests passed! Third-tier navigation working on all pages.")
        return 0
    else:
        print("\n⚠️  Some tests failed. Check output above for details.")
        return 1

if __name__ == '__main__':
    sys.exit(test_settings_navigation())
