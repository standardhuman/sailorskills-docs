#!/usr/bin/env python3
"""
Test environment variables in production
Captures all console logs to debug the fetch() error
"""

from playwright.sync_api import sync_playwright
import json

PRODUCTION_URL = "https://sailorskills-settings.vercel.app"
LOGIN_URL = f"{PRODUCTION_URL}/login.html"

def test_environment_variables():
    """Check what environment variables are being used in production"""

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Capture ALL console messages
        console_logs = []

        def handle_console(msg):
            console_logs.append({
                'type': msg.type,
                'text': msg.text,
                'args': [str(arg) for arg in msg.args]
            })
            print(f"[{msg.type.upper()}] {msg.text}")

        page.on("console", handle_console)

        print("="*70)
        print("CHECKING ENVIRONMENT VARIABLES IN PRODUCTION")
        print("="*70)

        print("\n📋 Loading login page...")
        page.goto(LOGIN_URL, wait_until="networkidle", timeout=15000)

        print("\n✅ Page loaded, checking console output...")
        print("\n" + "="*70)
        print("CONSOLE OUTPUT:")
        print("="*70)

        # Wait a bit for all logs
        page.wait_for_timeout(2000)

        # Look for the environment check log
        env_check = None
        for log in console_logs:
            if 'Environment check' in log['text']:
                env_check = log
                print("\n🔍 Found environment check log:")
                print(json.dumps(log, indent=2))

        # Try to extract the actual values using JavaScript
        print("\n" + "="*70)
        print("EXTRACTING VALUES VIA JAVASCRIPT:")
        print("="*70)

        try:
            result = page.evaluate("""
                () => {
                    return {
                        hasUrl: !!import.meta.env.VITE_SUPABASE_URL,
                        hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
                        urlType: typeof import.meta.env.VITE_SUPABASE_URL,
                        keyType: typeof import.meta.env.VITE_SUPABASE_ANON_KEY,
                        urlLength: import.meta.env.VITE_SUPABASE_URL ? import.meta.env.VITE_SUPABASE_URL.length : 0,
                        keyLength: import.meta.env.VITE_SUPABASE_ANON_KEY ? import.meta.env.VITE_SUPABASE_ANON_KEY.length : 0,
                        urlFirst20: import.meta.env.VITE_SUPABASE_URL ? import.meta.env.VITE_SUPABASE_URL.substring(0, 20) : 'N/A',
                        urlHasNewlines: import.meta.env.VITE_SUPABASE_URL ? /\n/.test(import.meta.env.VITE_SUPABASE_URL) : false,
                        urlHasSpaces: import.meta.env.VITE_SUPABASE_URL ? / /.test(import.meta.env.VITE_SUPABASE_URL) : false,
                    }
                }
            """)
            print("\n📊 Environment Variable Analysis:")
            print(json.dumps(result, indent=2))

            # Check for issues
            print("\n" + "="*70)
            print("DIAGNOSIS:")
            print("="*70)

            if not result['hasUrl']:
                print("❌ VITE_SUPABASE_URL is not set!")
            elif result['urlHasNewlines']:
                print("❌ VITE_SUPABASE_URL contains newline characters!")
            elif result['urlHasSpaces']:
                print("❌ VITE_SUPABASE_URL contains spaces!")
            elif result['urlLength'] == 0:
                print("❌ VITE_SUPABASE_URL is an empty string!")
            elif not result['urlFirst20'].startswith('http'):
                print(f"❌ VITE_SUPABASE_URL doesn't start with 'http': {result['urlFirst20']}")
            else:
                print(f"✅ VITE_SUPABASE_URL looks valid: {result['urlFirst20']}...")
                print(f"   Length: {result['urlLength']} characters")

            if not result['hasKey']:
                print("❌ VITE_SUPABASE_ANON_KEY is not set!")
            elif result['keyLength'] == 0:
                print("❌ VITE_SUPABASE_ANON_KEY is an empty string!")
            else:
                print(f"✅ VITE_SUPABASE_ANON_KEY appears to be set")
                print(f"   Length: {result['keyLength']} characters")

        except Exception as e:
            print(f"❌ Failed to extract values: {str(e)}")

        # Check the actual build output
        print("\n" + "="*70)
        print("CHECKING BUNDLED JS:")
        print("="*70)

        try:
            # Find the supabase-client bundle
            scripts = page.locator('script[src*="supabase-client"]').all()
            if scripts:
                for script in scripts:
                    src = script.get_attribute('src')
                    print(f"Found supabase-client bundle: {src}")

                    # Fetch the bundle and look for the env vars
                    response = page.goto(f"{PRODUCTION_URL}/{src}" if not src.startswith('http') else src)
                    content = response.text()

                    # Look for the env var values in the bundle
                    if 'supabase.co' in content or 'supabase.com' in content:
                        print("✅ Supabase URL appears to be present in bundle")

                        # Try to extract it
                        import re
                        urls = re.findall(r'https://[a-z0-9-]+\.supabase\.co', content)
                        if urls:
                            print(f"   Found URL(s): {set(urls)}")
                    else:
                        print("❌ No Supabase URL found in bundle - env vars may not be baked in")

        except Exception as e:
            print(f"❌ Failed to check bundle: {str(e)}")

        browser.close()

if __name__ == "__main__":
    test_environment_variables()
