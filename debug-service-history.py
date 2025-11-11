#!/usr/bin/env python3
"""
Debug script to inspect the About Time service history modal in production
"""
from playwright.sync_api import sync_playwright
import json
import os

# Get test credentials from environment
TEST_EMAIL = os.getenv('TEST_USER_EMAIL', 'standardhuman@gmail.com')
TEST_PASSWORD = os.getenv('TEST_USER_PASSWORD', '')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)  # Visible browser for debugging
    page = browser.new_page()

    # Capture console messages
    console_messages = []
    page.on("console", lambda msg: console_messages.append(f"{msg.type}: {msg.text}"))

    # Capture network errors
    page.on("pageerror", lambda err: print(f"Page Error: {err}"))

    print("1. Navigating to production Operations...")
    page.goto('https://sailorskills-operations.vercel.app/')
    page.wait_for_load_state('networkidle')

    print("2. Checking if already logged in or need to login...")

    # Check if we're on login page or already authenticated
    if page.locator('input[type="email"]').count() > 0:
        print("   Login required, filling credentials...")
        print(f"   Email: {TEST_EMAIL}")
        print(f"   Password length: {len(TEST_PASSWORD)}")

        # Fill email
        email_field = page.locator('input[type="email"]')
        email_field.fill(TEST_EMAIL)

        # Fill password - try multiple selectors
        password_field = page.locator('input[type="password"]').first
        if password_field.count() == 0:
            print("   ❌ Password field not found!")
            browser.close()
            exit(1)

        password_field.fill(TEST_PASSWORD)

        # Verify fields are filled
        email_value = email_field.input_value()
        password_value = password_field.input_value()
        print(f"   Email filled: {email_value}")
        print(f"   Password filled: {'*' * len(password_value)}")

        print("   Clicking Sign In...")
        page.click('button:has-text("Sign In")')

        # Wait a bit and take screenshot to see what happened
        page.wait_for_timeout(3000)
        page.screenshot(path='/tmp/after-login-click.png', full_page=True)

        # Check if there's an error message
        error_message = page.locator('text=/error|failed|invalid/i').first
        if error_message.count() > 0:
            print(f"   ❌ Login error: {error_message.inner_text()}")

        # Check if still on login page or successfully logged in
        if page.locator('input[type="email"]').is_visible():
            print("   ❌ Still on login page - login failed")
            print("   Console messages:")
            for msg in console_messages[-5:]:
                print(f"      {msg}")
            browser.close()
            exit(1)
        else:
            print("   ✅ Login successful!")
    else:
        print("   Already authenticated!")

    print("3. Navigating to Boats page...")
    page.goto('https://sailorskills-operations.vercel.app/?tab=boats')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)  # Wait for table to load

    print("4. Taking initial screenshot...")
    page.screenshot(path='/tmp/operations-boats-page.png', full_page=True)

    print("5. Looking for 'About Time' boat...")
    # Find and click the About Time boat row
    about_time_row = page.locator('tr:has-text("About Time")').first
    if about_time_row.count() > 0:
        print("   Found 'About Time' row, clicking...")
        about_time_row.click()
        page.wait_for_timeout(1000)  # Wait for modal to open

        print("6. Taking modal screenshot...")
        page.screenshot(path='/tmp/service-history-modal.png', full_page=True)

        print("7. Inspecting modal HTML...")
        # Get the modal content - try multiple selectors
        modal = page.locator('.modal, .modal-overlay, [class*="modal"]').first
        if modal.count() > 0:
            print(f"   Found modal with class: {modal.get_attribute('class')}")
            modal_html = modal.inner_html()

            # Save full HTML for inspection
            with open('/tmp/modal-full.html', 'w') as f:
                f.write(modal_html)

            # Check for timeline items
            timeline_items = page.locator('.timeline-item').all()
            print(f"\n   Found {len(timeline_items)} timeline items")

            if len(timeline_items) > 0:
                first_item = timeline_items[0]

                # Check classes
                classes = first_item.get_attribute('class')
                print(f"\n   First item classes: {classes}")

                # Check if it has notion-service-log class
                has_notion_class = 'notion-service-log' in (classes or '')
                print(f"   Has 'notion-service-log' class: {has_notion_class}")

                # Check inline styles
                style = first_item.get_attribute('style')
                print(f"   Style attribute: {style[:200] if style else 'None'}...")

                # Look for (Historical) badge
                has_historical_badge = '(Historical)' in first_item.inner_text()
                print(f"   Has '(Historical)' badge: {has_historical_badge}")

                # Check for edit/delete buttons
                edit_buttons = first_item.locator('button:has-text("✏️")').count()
                delete_buttons = first_item.locator('button:has-text("🗑️")').count()
                print(f"   Edit buttons visible: {edit_buttons}")
                print(f"   Delete buttons visible: {delete_buttons}")

                # Get the raw HTML of first timeline item
                item_html = first_item.inner_html()[:500]
                print(f"\n   First item HTML preview:\n   {item_html}...")
        else:
            print("   ❌ Modal not found!")
    else:
        print("   ❌ 'About Time' boat not found!")

    print("\n8. Console messages:")
    for msg in console_messages[-10:]:  # Last 10 messages
        print(f"   {msg}")

    print("\n9. Keeping browser open for 5 seconds for manual inspection...")
    page.wait_for_timeout(5000)

    browser.close()
    print("\n✅ Debug complete! Check /tmp/ for screenshots and HTML")
