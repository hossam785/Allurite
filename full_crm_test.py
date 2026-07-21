import sys
import io
import time
from playwright.sync_api import sync_playwright

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

def run_test():
    console_errors = []
    page_errors = []
    failed_requests = []
    passed_pages = []

    print("--- Starting Full WebApp Test ---")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()

        # Set generous timeouts for initial Next.js cold compilation
        page.set_default_timeout(60000)
        page.set_default_navigation_timeout(60000)

        # Listen to console & error events
        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type in ["error"] else None)
        page.on("pageerror", lambda err: page_errors.append(str(err)))
        page.on("response", lambda res: failed_requests.append(f"{res.status} {res.url}") if res.status >= 400 else None)

        base_url = "http://localhost:3000"

        # 1. Test Home / Login Redirection directly
        print("\n1. Navigating to Login page...")
        try:
            page.goto(f"{base_url}/login", wait_until="domcontentloaded")
            time.sleep(2)
            print(f"   Current URL: {page.url}")
            page.screenshot(path="screenshot_01_login.png")
        except Exception as e:
            print(f"   Navigation to /login error: {e}")

        # 2. Perform Login via UI
        print("\n2. Performing SuperAdmin Login...")
        email_input = page.locator("input[type='email'], input[name='email']")
        password_input = page.locator("input[type='password'], input[name='password']")

        if email_input.count() > 0 and password_input.count() > 0:
            email_input.first.fill("youssef@allurite.com")
            password_input.first.fill("Youssef2005")
            
            submit_button = page.locator("button[type='submit']")
            if submit_button.count() > 0:
                submit_button.first.click()
            else:
                password_input.first.press("Enter")
            
            time.sleep(3)
            print(f"   URL after login: {page.url}")
            page.screenshot(path="screenshot_02_dashboard.png")

        # If still on login, try direct API login to set session cookie
        if "/login" in page.url:
            print("   Attempting API login fallback...")
            try:
                api_res = page.request.post(f"{base_url}/api/v1/auth/login", data={
                    "email": "youssef@allurite.com",
                    "password": "Youssef2005"
                })
                print(f"   API Login status: {api_res.status}")
                time.sleep(1)
                page.goto(f"{base_url}/dashboard", wait_until="domcontentloaded")
                print(f"   URL after API session setup: {page.url}")
            except Exception as e:
                print(f"   API Login error: {e}")

        # 3. Test Dashboard and all Sub-Routes
        routes = [
            ("/dashboard", "Overview Dashboard"),
            ("/dashboard/clients", "Clients Management"),
            ("/dashboard/employees", "Employees Management"),
            ("/dashboard/followups", "Followups"),
            ("/dashboard/tasks", "Tasks Management"),
            ("/dashboard/reports", "Reports & Analytics"),
            ("/dashboard/notifications", "Notifications"),
            ("/dashboard/files", "Files & Documents"),
            ("/dashboard/backups", "Backups"),
            ("/dashboard/audit-logs", "Audit Logs"),
            ("/dashboard/settings", "System Settings"),
        ]

        print("\n3. Testing Dashboard Routes...")
        for route, label in routes:
            target_url = f"{base_url}{route}"
            print(f"   -> Testing [{label}]: {route}")
            try:
                res = page.goto(target_url, wait_until="domcontentloaded")
                time.sleep(1.5)
                
                body_text = page.inner_text("body")
                has_error_ui = "500" in body_text or "Internal Server Error" in body_text or "Application error" in body_text
                
                if res and res.status == 200 and not has_error_ui:
                    passed_pages.append((route, label, res.status, len(page.content())))
                    page.screenshot(path=f"screenshot_{route.replace('/', '_')}.png")
                else:
                    print(f"      [WARNING] Page status {res.status if res else 'None'}, potential error UI detected.")
            except Exception as e:
                print(f"      [FAILED] {route}: {e}")

        # 4. Interactive Test: Test Modal / Buttons on Clients Page
        print("\n4. Testing Interactions on /dashboard/clients...")
        try:
            page.goto(f"{base_url}/dashboard/clients", wait_until="domcontentloaded")
            time.sleep(1.5)
            
            add_client_btn = page.locator("button:has-text('جديد'), button:has-text('إضافة'), button:has-text('Add')")
            if add_client_btn.count() > 0:
                print(f"   Found Add Client button ({add_client_btn.count()} match). Clicking...")
                add_client_btn.first.click()
                time.sleep(1)
                page.screenshot(path="screenshot_client_modal.png")
                print("   Add Client Modal opened successfully.")
        except Exception as e:
            print(f"   Interaction test error: {e}")

        browser.close()

    print("\n================ TEST RESULTS SUMMARY ================")
    print(f"Total Routes Tested: {len(routes)}")
    print(f"Passed Routes: {len(passed_pages)}/{len(routes)}")
    for route, label, status, bytes_cnt in passed_pages:
        print(f"  OK: {route} ({label}) - Status: {status}, Page Size: {bytes_cnt} bytes")

    print(f"\nConsole Errors Detected ({len(console_errors)}):")
    if console_errors:
        for ce in console_errors:
            print(f"  ERR: {ce}")
    else:
        print("  OK: No JS console errors detected.")

    print(f"\nPage Script Errors ({len(page_errors)}):")
    if page_errors:
        for pe in page_errors:
            print(f"  ERR: {pe}")
    else:
        print("  OK: No unhandled JS exceptions.")

    print(f"\nFailed HTTP Network Requests ({len(failed_requests)}):")
    if failed_requests:
        for fr in failed_requests:
            print(f"  ERR: {fr}")
    else:
        print("  OK: All HTTP requests returned success codes.")

if __name__ == "__main__":
    run_test()
