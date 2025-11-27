#!/usr/bin/env python3
"""
Test network requests to see what URL fetch() is trying to use
"""

from playwright.sync_api import sync_playwright
import json

PRODUCTION_URL = "https://sailorskills-settings.vercel.app"
LOGIN_URL = f"{PRODUCTION_URL}/login.html"
TEST_EMAIL = "standardhuman@gmail.com"
TEST_PASSWORD = "KLRss!650"

def test_network_requests():
    """Monitor network requests to see what's happening"""

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Capture network requests
        requests = []
        failed_requests = []

        def handle_request(request):
            requests.append({
                'url': request.url,
                'method': request.method,
                'headers': dict(request.headers)
            })

        def handle_response(response):
            if response.status >= 400:
                failed_requests.append({
                    'url': response.url,
                    'status': response.status,
                    'status_text': response.status_text
                })

        def handle_request_failed(request):
            failed_requests.append({
                'url': request.url,
                'failure': request.failure
            })

        page.on("request", handle_request)
        page.on("response", handle_response)
        page.on("requestfailed", handle_request_failed)

        print("="*70)
        print("MONITORING NETWORK REQUESTS")
        print("="*70)

        print("\n📋 Loading login page...")
        page.goto(LOGIN_URL, wait_until="networkidle", timeout=15000)

        print("✅ Page loaded\n")

        # Clear previous requests
        requests.clear()
        failed_requests.clear()

        print("📋 Attempting login...")

        # Fill form
        page.locator('input[type="email"]').first.fill(TEST_EMAIL)
        page.locator('input[type="password"]').first.fill(TEST_PASSWORD)

        # Click submit
        page.locator('button[type="submit"]').first.click()

        # Wait for requests to complete
        page.wait_for_timeout(3000)

        print("\n" + "="*70)
        print("REQUESTS MADE:")
        print("="*70)

        supabase_requests = [r for r in requests if 'supabase' in r['url'].lower()]

        if supabase_requests:
            print(f"\n✅ Found {len(supabase_requests)} Supabase requests:\n")
            for i, req in enumerate(supabase_requests, 1):
                print(f"{i}. {req['method']} {req['url']}")
                if 'apikey' in req['headers']:
                    key = req['headers']['apikey']
                    print(f"   API Key: {key[:20]}...{key[-10:] if len(key) > 30 else ''}")
        else:
            print("❌ No Supabase requests found!")

        print("\n" + "="*70)
        print("FAILED REQUESTS:")
        print("="*70)

        if failed_requests:
            print(f"\n❌ Found {len(failed_requests)} failed requests:\n")
            for i, req in enumerate(failed_requests, 1):
                print(f"{i}. {req.get('url', 'Unknown URL')}")
                if 'status' in req:
                    print(f"   Status: {req['status']} {req.get('status_text', '')}")
                if 'failure' in req:
                    print(f"   Failure: {req['failure']}")
        else:
            print("✅ No failed requests")

        # Check if any requests were made at all
        print("\n" + "="*70)
        print("ALL REQUESTS AFTER LOGIN ATTEMPT:")
        print("="*70)

        if requests:
            print(f"\nTotal requests: {len(requests)}\n")
            for i, req in enumerate(requests[:10], 1):  # Show first 10
                print(f"{i}. {req['method']} {req['url'][:80]}")
        else:
            print("❌ No requests captured - fetch() likely failed before making a request")
            print("\n🔍 This suggests the URL is invalid before fetch() is even called")
            print("   Possible causes:")
            print("   - URL contains whitespace or newlines")
            print("   - URL is undefined/null")
            print("   - URL is an empty string")

        # Get the page content to check for error messages
        print("\n" + "="*70)
        print("ERROR MESSAGES ON PAGE:")
        print("="*70)

        errors = page.locator('.error, .alert, [role="alert"]').all()
        if errors:
            for elem in errors:
                if elem.is_visible():
                    text = elem.text_content().strip()
                    if text:
                        print(f"❌ {text}")
        else:
            print("No error elements found")

        page.screenshot(path='/tmp/settings_network_test.png', full_page=True)
        print("\n📸 Screenshot saved: /tmp/settings_network_test.png")

        browser.close()

if __name__ == "__main__":
    test_network_requests()
