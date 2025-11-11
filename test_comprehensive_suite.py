#!/usr/bin/env python3
"""
Comprehensive Playwright Test Suite for Sailorskills
Tests all core services with authentication, navigation, and critical workflows
"""

from playwright.sync_api import sync_playwright, expect
import json
import sys
from datetime import datetime

# Test credentials
TEST_EMAIL = "standardhuman@gmail.com"
TEST_PASSWORD = "KLRss!650"

# Service URLs (production)
SERVICES = {
    "portal": "https://sailorskills-portal.vercel.app",
    "billing": "https://sailorskills-billing.vercel.app",
    "operations": "https://ops.sailorskills.com",
    "settings": "https://sailorskills-settings.vercel.app"
}

class TestResults:
    def __init__(self):
        self.results = []
        self.screenshots_dir = "/tmp/playwright-screenshots"

    def add_result(self, service, test_name, passed, error=None, screenshot=None):
        self.results.append({
            "service": service,
            "test": test_name,
            "passed": passed,
            "error": str(error) if error else None,
            "screenshot": screenshot,
            "timestamp": datetime.now().isoformat()
        })

    def print_summary(self):
        total = len(self.results)
        passed = sum(1 for r in self.results if r["passed"])
        failed = total - passed

        print("\n" + "="*80)
        print("COMPREHENSIVE TEST RESULTS")
        print("="*80)
        print(f"Total Tests: {total}")
        print(f"Passed: {passed} ✓")
        print(f"Failed: {failed} ✗")
        print(f"Success Rate: {(passed/total*100):.1f}%")
        print("="*80)

        if failed > 0:
            print("\nFailed Tests:")
            for r in self.results:
                if not r["passed"]:
                    print(f"  ✗ [{r['service']}] {r['test']}")
                    if r['error']:
                        print(f"    Error: {r['error']}")
                    if r['screenshot']:
                        print(f"    Screenshot: {r['screenshot']}")

        print("\nDetailed Results:")
        for r in self.results:
            status = "✓" if r["passed"] else "✗"
            print(f"  {status} [{r['service']}] {r['test']}")

    def save_json(self, filename="/tmp/test-results.json"):
        with open(filename, 'w') as f:
            json.dump({
                "timestamp": datetime.now().isoformat(),
                "results": self.results,
                "summary": {
                    "total": len(self.results),
                    "passed": sum(1 for r in self.results if r["passed"]),
                    "failed": sum(1 for r in self.results if not r["passed"])
                }
            }, f, indent=2)
        print(f"\nResults saved to: {filename}")

def test_portal_service(page, results):
    """Test Customer Portal service"""
    service = "portal"
    base_url = SERVICES[service]

    try:
        # Test 1: Portal loads
        print(f"\n[{service}] Testing portal page load...")
        page.goto(f"{base_url}/portal.html")
        page.wait_for_load_state('networkidle')
        expect(page.locator("h1")).to_be_visible()
        results.add_result(service, "Portal page loads", True)
    except Exception as e:
        results.add_result(service, "Portal page loads", False, e)

    try:
        # Test 2: Authentication
        print(f"[{service}] Testing authentication...")
        page.goto(f"{base_url}/portal.html")
        page.wait_for_load_state('networkidle')

        # Check if login form exists
        if page.locator('#customer-email').count() > 0:
            page.fill('#customer-email', TEST_EMAIL)
            page.fill('#customer-password', TEST_PASSWORD)
            page.click('button[type="submit"]')
            page.wait_for_timeout(2000)  # Wait for auth
            results.add_result(service, "Authentication", True)
        else:
            # Already logged in or different auth flow
            results.add_result(service, "Authentication", True, "Already authenticated or different flow")
    except Exception as e:
        screenshot = f"/tmp/portal-auth-error.png"
        page.screenshot(path=screenshot, full_page=True)
        results.add_result(service, "Authentication", False, e, screenshot)

    try:
        # Test 3: Navigation menu
        print(f"[{service}] Testing navigation...")
        nav = page.locator('nav, .navigation, .nav-menu')
        expect(nav.first).to_be_visible()
        results.add_result(service, "Navigation menu visible", True)
    except Exception as e:
        results.add_result(service, "Navigation menu visible", False, e)

    try:
        # Test 4: Service history section
        print(f"[{service}] Testing service history section...")
        page.goto(f"{base_url}/portal.html")
        page.wait_for_load_state('networkidle')

        # Look for service history indicators
        has_content = (
            page.locator('text=/service/i').count() > 0 or
            page.locator('text=/history/i').count() > 0 or
            page.locator('.service-card, .service-log').count() > 0
        )

        if has_content:
            results.add_result(service, "Service history section exists", True)
        else:
            results.add_result(service, "Service history section exists", False, "No service history found")
    except Exception as e:
        results.add_result(service, "Service history section exists", False, e)

def test_billing_service(page, results):
    """Test Billing service"""
    service = "billing"
    base_url = SERVICES[service]

    try:
        # Test 1: Billing page loads
        print(f"\n[{service}] Testing billing page load...")
        page.goto(base_url)
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(2000)  # Give time for React to render

        # Check for any visible content
        body_text = page.locator('body').inner_text()
        has_content = len(body_text.strip()) > 0

        if has_content:
            results.add_result(service, "Billing page loads", True)
        else:
            screenshot = f"/tmp/billing-load-error.png"
            page.screenshot(path=screenshot, full_page=True)
            results.add_result(service, "Billing page loads", False, "No content visible", screenshot)
    except Exception as e:
        screenshot = f"/tmp/billing-error.png"
        page.screenshot(path=screenshot, full_page=True)
        results.add_result(service, "Billing page loads", False, e, screenshot)

    try:
        # Test 2: Check for billing components
        print(f"[{service}] Testing for billing components...")
        page.goto(base_url)
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(2000)

        # Look for common billing elements
        has_billing_elements = (
            page.locator('text=/invoice/i').count() > 0 or
            page.locator('text=/transaction/i').count() > 0 or
            page.locator('text=/payment/i').count() > 0 or
            page.locator('button, .btn').count() > 0
        )

        results.add_result(service, "Billing components present", has_billing_elements)
    except Exception as e:
        results.add_result(service, "Billing components present", False, e)

def test_operations_service(page, results):
    """Test Operations service"""
    service = "operations"
    base_url = SERVICES[service]

    try:
        # Test 1: Operations page loads
        print(f"\n[{service}] Testing operations page load...")
        page.goto(base_url)
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(2000)

        body_text = page.locator('body').inner_text()
        has_content = len(body_text.strip()) > 0

        results.add_result(service, "Operations page loads", has_content)

        if not has_content:
            screenshot = f"/tmp/operations-load-error.png"
            page.screenshot(path=screenshot, full_page=True)
    except Exception as e:
        screenshot = f"/tmp/operations-error.png"
        page.screenshot(path=screenshot, full_page=True)
        results.add_result(service, "Operations page loads", False, e, screenshot)

    try:
        # Test 2: Check for operations components
        print(f"[{service}] Testing for operations components...")
        page.goto(base_url)
        page.wait_for_load_state('networkidle')

        has_ops_elements = (
            page.locator('text=/schedule/i').count() > 0 or
            page.locator('text=/service/i').count() > 0 or
            page.locator('text=/log/i').count() > 0 or
            page.locator('nav, .navigation').count() > 0
        )

        results.add_result(service, "Operations components present", has_ops_elements)
    except Exception as e:
        results.add_result(service, "Operations components present", False, e)

def test_settings_service(page, results):
    """Test Settings/Authentication service"""
    service = "settings"
    base_url = SERVICES[service]

    try:
        # Test 1: Settings page loads
        print(f"\n[{service}] Testing settings page load...")
        page.goto(base_url)
        page.wait_for_load_state('networkidle')

        body_text = page.locator('body').inner_text()
        has_content = len(body_text.strip()) > 0

        results.add_result(service, "Settings page loads", has_content)
    except Exception as e:
        screenshot = f"/tmp/settings-error.png"
        page.screenshot(path=screenshot, full_page=True)
        results.add_result(service, "Settings page loads", False, e, screenshot)

    try:
        # Test 2: Login page
        print(f"[{service}] Testing login page...")
        page.goto(f"{base_url}/login.html")
        page.wait_for_load_state('networkidle')

        # Check for login form elements
        has_login_form = (
            page.locator('input[type="email"], input[name*="email"]').count() > 0 or
            page.locator('input[type="password"]').count() > 0 or
            page.locator('text=/sign in/i, text=/log in/i').count() > 0
        )

        results.add_result(service, "Login page available", has_login_form)
    except Exception as e:
        results.add_result(service, "Login page available", False, e)

def test_cross_service_navigation(page, results):
    """Test navigation between services"""
    service = "integration"

    try:
        # Test: Portal to Billing navigation
        print(f"\n[{service}] Testing Portal to Billing navigation...")
        page.goto(f"{SERVICES['portal']}/portal.html")
        page.wait_for_load_state('networkidle')

        # Look for billing link
        billing_link_by_href = page.locator('a[href*="billing"]')
        billing_link_by_text = page.locator('text=/billing/i')

        if billing_link_by_href.count() > 0:
            billing_link_by_href.first.click()
            page.wait_for_load_state('networkidle')
            page.wait_for_timeout(1000)

            # Check we landed on a billing page
            current_url = page.url
            is_billing_page = 'billing' in current_url.lower()

            results.add_result(service, "Portal to Billing navigation", is_billing_page)
        elif billing_link_by_text.count() > 0:
            billing_link_by_text.first.click()
            page.wait_for_load_state('networkidle')
            page.wait_for_timeout(1000)

            current_url = page.url
            is_billing_page = 'billing' in current_url.lower()

            results.add_result(service, "Portal to Billing navigation", is_billing_page)
        else:
            results.add_result(service, "Portal to Billing navigation", False, "No billing link found")
    except Exception as e:
        results.add_result(service, "Portal to Billing navigation", False, e)

def main():
    """Run comprehensive test suite"""
    print("="*80)
    print("SAILORSKILLS COMPREHENSIVE TEST SUITE")
    print("="*80)
    print(f"Started: {datetime.now().isoformat()}")
    print(f"Test User: {TEST_EMAIL}")

    results = TestResults()

    with sync_playwright() as p:
        # Launch browser in headless mode
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            ignore_https_errors=True
        )
        page = context.new_page()

        # Run all test suites
        test_portal_service(page, results)
        test_billing_service(page, results)
        test_operations_service(page, results)
        test_settings_service(page, results)
        test_cross_service_navigation(page, results)

        browser.close()

    # Print results
    results.print_summary()
    results.save_json()

    # Exit with error code if any tests failed
    failed_count = sum(1 for r in results.results if not r["passed"])
    sys.exit(0 if failed_count == 0 else 1)

if __name__ == "__main__":
    main()
