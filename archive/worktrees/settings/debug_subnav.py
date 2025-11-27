#!/usr/bin/env python3
"""Debug sub-navigation rendering"""

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    page.goto('http://localhost:5178/src/views/dashboard.html')
    page.wait_for_load_state('networkidle')

    # Check if sub-nav exists
    sub_nav = page.locator('.sub-nav')
    print(f"Sub-nav found: {sub_nav.count() > 0}")

    if sub_nav.count() > 0:
        # Get the HTML
        html = sub_nav.inner_html()
        print(f"\nSub-nav HTML:\n{html[:500]}")

        # Check computed styles
        bg_color = sub_nav.evaluate('el => window.getComputedStyle(el).backgroundColor')
        display = sub_nav.evaluate('el => window.getComputedStyle(el).display')
        print(f"\nSub-nav styles:")
        print(f"  background-color: {bg_color}")
        print(f"  display: {display}")

    # Take screenshot
    page.screenshot(path='/tmp/subnav-debug.png', full_page=True)
    print("\nScreenshot saved to /tmp/subnav-debug.png")

    browser.close()
