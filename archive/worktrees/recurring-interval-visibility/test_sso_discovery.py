#!/usr/bin/env python3
"""
SSO Login Page Discovery Script
Identifies selectors and structure of the new SSO login flow
"""

from playwright.sync_api import sync_playwright
import json

def discover_sso_selectors():
    """Discover selectors on the SSO login page"""

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # Non-headless to see what happens
        page = browser.new_page()

        print("="*80)
        print("SSO LOGIN PAGE DISCOVERY")
        print("="*80)

        # Try to access portal billing page (should redirect to SSO)
        print("\n1. Navigating to Portal billing page (should redirect to SSO)...")
        page.goto('https://sailorskills-portal.vercel.app/billing.html')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(2000)

        current_url = page.url
        print(f"   Current URL: {current_url}")

        # Take screenshot
        screenshot_path = "/tmp/sso-login-page.png"
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"   Screenshot saved: {screenshot_path}")

        # Discover all input fields
        print("\n2. Discovering input fields...")
        inputs = page.locator('input').all()
        print(f"   Found {len(inputs)} input fields:")

        selectors = {
            "url": current_url,
            "inputs": [],
            "buttons": [],
            "forms": [],
            "headings": []
        }

        for i, input_elem in enumerate(inputs):
            try:
                input_type = input_elem.get_attribute('type') or 'text'
                input_id = input_elem.get_attribute('id') or ''
                input_name = input_elem.get_attribute('name') or ''
                input_placeholder = input_elem.get_attribute('placeholder') or ''

                input_info = {
                    "index": i,
                    "type": input_type,
                    "id": input_id,
                    "name": input_name,
                    "placeholder": input_placeholder
                }
                selectors["inputs"].append(input_info)

                print(f"   [{i}] type={input_type}, id={input_id}, name={input_name}, placeholder={input_placeholder}")
            except:
                pass

        # Discover buttons
        print("\n3. Discovering buttons...")
        buttons = page.locator('button').all()
        print(f"   Found {len(buttons)} buttons:")

        for i, btn in enumerate(buttons):
            try:
                btn_text = btn.inner_text()
                btn_id = btn.get_attribute('id') or ''
                btn_type = btn.get_attribute('type') or ''
                btn_class = btn.get_attribute('class') or ''

                btn_info = {
                    "index": i,
                    "text": btn_text,
                    "id": btn_id,
                    "type": btn_type,
                    "class": btn_class
                }
                selectors["buttons"].append(btn_info)

                print(f"   [{i}] text='{btn_text}', id={btn_id}, type={btn_type}")
            except:
                pass

        # Discover forms
        print("\n4. Discovering forms...")
        forms = page.locator('form').all()
        print(f"   Found {len(forms)} forms:")

        for i, form in enumerate(forms):
            try:
                form_id = form.get_attribute('id') or ''
                form_action = form.get_attribute('action') or ''
                form_method = form.get_attribute('method') or ''

                form_info = {
                    "index": i,
                    "id": form_id,
                    "action": form_action,
                    "method": form_method
                }
                selectors["forms"].append(form_info)

                print(f"   [{i}] id={form_id}, action={form_action}, method={form_method}")
            except:
                pass

        # Discover headings
        print("\n5. Discovering headings...")
        headings = page.locator('h1, h2, h3').all()
        print(f"   Found {len(headings)} headings:")

        for i, heading in enumerate(headings):
            try:
                heading_text = heading.inner_text()
                heading_tag = heading.evaluate('el => el.tagName')

                heading_info = {
                    "tag": heading_tag,
                    "text": heading_text
                }
                selectors["headings"].append(heading_info)

                print(f"   [{i}] <{heading_tag}>: {heading_text}")
            except:
                pass

        # Get page HTML structure
        print("\n6. Getting page HTML structure...")
        body_html = page.locator('body').inner_html()

        # Save selectors to JSON
        output_file = "/tmp/sso-selectors.json"
        with open(output_file, 'w') as f:
            json.dump(selectors, f, indent=2)
        print(f"\n   Selectors saved to: {output_file}")

        # Try to test the login flow
        print("\n7. Testing login flow...")
        email_selector = None
        password_selector = None
        submit_selector = None

        # Find email input
        for input_info in selectors["inputs"]:
            if input_info["type"] == "email" or "email" in input_info["name"].lower() or "email" in input_info["id"].lower():
                email_selector = f"#{input_info['id']}" if input_info['id'] else f"input[name='{input_info['name']}']"
                print(f"   Email selector: {email_selector}")
                break

        # Find password input
        for input_info in selectors["inputs"]:
            if input_info["type"] == "password":
                password_selector = f"#{input_info['id']}" if input_info['id'] else f"input[type='password']"
                print(f"   Password selector: {password_selector}")
                break

        # Find submit button
        for btn_info in selectors["buttons"]:
            if btn_info["type"] == "submit" or "submit" in btn_info["id"].lower() or "sign" in btn_info["text"].lower() or "log" in btn_info["text"].lower():
                submit_selector = f"#{btn_info['id']}" if btn_info['id'] else f"button:has-text('{btn_info['text']}')"
                print(f"   Submit selector: {submit_selector}")
                break

        # Attempt login
        if email_selector and password_selector and submit_selector:
            print("\n8. Attempting login with discovered selectors...")
            try:
                page.fill(email_selector, 'standardhuman@gmail.com')
                page.fill(password_selector, 'KLRss!650')
                page.click(submit_selector)
                page.wait_for_timeout(3000)

                final_url = page.url
                print(f"   Login successful! Final URL: {final_url}")

                # Take screenshot after login
                page.screenshot(path="/tmp/sso-after-login.png", full_page=True)
                print(f"   After-login screenshot: /tmp/sso-after-login.png")

            except Exception as e:
                print(f"   Login attempt failed: {e}")
        else:
            print("\n8. Could not identify all required selectors for login")

        print("\n" + "="*80)
        print("DISCOVERY COMPLETE")
        print("="*80)
        print(f"Results saved to: {output_file}")
        print(f"Screenshots: /tmp/sso-login-page.png, /tmp/sso-after-login.png")

        browser.close()

if __name__ == "__main__":
    discover_sso_selectors()
