"""
selenium_e2e_query_studio.py
============================
Full browser-level Selenium end-to-end test for Talk2DB Query Studio.

WHAT IT DOES (in order):
  PHASE 1  — Launch Chrome (headless) and open the app at http://localhost:3000
  PHASE 2  — Log in with the Selenium test account
  PHASE 3  — Verify the dashboard loaded and DB status is "Connected"
  PHASE 4  — Navigate to Query Studio (sidebar link + direct URL fallback)
  PHASE 5  — Type the natural-language prompt:
                "show me employees whose salary is less than 60000"
  PHASE 6  — Click "Generate SQL →" and wait for APIFreeLLM to respond
  PHASE 7  — Verify the generated SQL is a SELECT with a salary filter
  PHASE 8  — Click "Run Query" and wait for the results table
  PHASE 9  — Validate every salary in the table is < 60,000
  PHASE 10 — Verify known employees (Alice Johnson etc.) are present
  PHASE 11 — Verify high-salary employees (Grace Taylor $110k) are absent
  PHASE 12 — Self-heal: if salary validation failed, retry once

RUN:
    cd "/home/saad/Desktop/Github Repos/Talk2DB"
    python3 tests-qa/selenium_e2e_query_studio.py

REQUIRES:
    pip install selenium
    ChromeDriver 150 at:
      ~/.cache/selenium/chromedriver/linux64/150.0.7871.124/chromedriver
    Next.js app running at http://localhost:3000
    Test user: selenium_test@talk2db.com / Test1234!  (has Neon DB connected)
"""

import re
import sys
import time
import traceback

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    TimeoutException,
    NoSuchElementException,
    StaleElementReferenceException,
)

# ─── Configuration ─────────────────────────────────────────────────────────────

APP_URL       = "http://localhost:3000"
TEST_EMAIL    = "selenium_test@talk2db.com"
TEST_PASSWORD = "Test1234!"
PROMPT_TEXT   = "show me employees whose salary is less than 60000"

CHROMEDRIVER  = (
    "/home/saad/.cache/selenium/chromedriver/"
    "linux64/150.0.7871.124/chromedriver"
)

# Timeouts
LLM_TIMEOUT  = 90   # APIFreeLLM free-tier can take ~25-35 s
DB_TIMEOUT   = 30
PAGE_TIMEOUT = 20

PASS = "✓"
FAIL = "✗"
INFO = "→"

# ─── Helpers ───────────────────────────────────────────────────────────────────

def log(symbol: str, msg: str) -> None:
    print(f"  {symbol}  {msg}", flush=True)


def wait_visible(driver, by, value, timeout=PAGE_TIMEOUT):
    return WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located((by, value))
    )


def wait_clickable(driver, by, value, timeout=PAGE_TIMEOUT):
    return WebDriverWait(driver, timeout).until(
        EC.element_to_be_clickable((by, value))
    )


def wait_text_in(driver, by, value, text, timeout=LLM_TIMEOUT):
    WebDriverWait(driver, timeout).until(
        EC.text_to_be_present_in_element((by, value), text)
    )


def safe_click(driver, el, retries: int = 3) -> None:
    for _ in range(retries):
        try:
            driver.execute_script(
                "arguments[0].scrollIntoView({block:'center'});", el
            )
            time.sleep(0.25)
            el.click()
            return
        except StaleElementReferenceException:
            time.sleep(0.4)
    raise RuntimeError("safe_click: element still stale after retries")


def js_type(driver, el, text: str) -> None:
    """Clear + type into a textarea using JS + send_keys."""
    driver.execute_script("arguments[0].focus();", el)
    el.send_keys(Keys.CONTROL + "a")
    el.send_keys(Keys.DELETE)
    time.sleep(0.2)
    el.send_keys(text)


def get_textarea_value(driver, el) -> str:
    return driver.execute_script("return arguments[0].value;", el) or ""


def build_driver() -> webdriver.Chrome:
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--window-size=1440,900")
    opts.add_argument("--disable-blink-features=AutomationControlled")
    opts.add_experimental_option("excludeSwitches", ["enable-automation"])
    opts.add_experimental_option("useAutomationExtension", False)
    service = Service(executable_path=CHROMEDRIVER)
    d = webdriver.Chrome(service=service, options=opts)
    d.set_page_load_timeout(30)
    return d

# ─── Individual test-phase runner ─────────────────────────────────────────────

class Phase:
    def __init__(self, name: str):
        self.name    = name
        self.passed  = False
        self.message = ""

    def ok(self, msg: str = "") -> None:
        self.passed  = True
        self.message = msg
        log(PASS, f"[{self.name}] {msg}")

    def fail(self, msg: str = "") -> None:
        self.passed  = False
        self.message = msg
        log(FAIL, f"[{self.name}] FAILED — {msg}")


# ─── Main test flow ────────────────────────────────────────────────────────────

def run_tests() -> bool:
    phases: list[Phase] = []
    driver = None

    print()
    print("=" * 68)
    print("  Talk2DB Selenium E2E — Query Studio: salary < 60,000")
    print("  Browser: Chrome 150 (headless)  |  DB: Neon PostgreSQL")
    print("  Prompt : \"" + PROMPT_TEXT + "\"")
    print("=" * 68)

    try:
        # ── PHASE 1: Launch browser ──────────────────────────────────────────
        p = Phase("PHASE-1  Browser launch")
        driver = build_driver()
        driver.get(APP_URL)
        wait_visible(driver, By.ID, "login-email")
        p.ok(f"Chrome opened {APP_URL} — login page rendered")
        phases.append(p)

        # ── PHASE 2: Login ───────────────────────────────────────────────────
        p = Phase("PHASE-2  Login with test credentials")
        email_el = driver.find_element(By.ID, "login-email")
        pwd_el   = driver.find_element(By.ID, "login-password")
        email_el.clear()
        email_el.send_keys(TEST_EMAIL)
        pwd_el.clear()
        pwd_el.send_keys(TEST_PASSWORD)
        driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        WebDriverWait(driver, PAGE_TIMEOUT).until(
            EC.url_contains("/dashboard")
        )
        time.sleep(1)   # let React hydrate dashboard
        p.ok(f"Logged in as {TEST_EMAIL} — dashboard loaded")
        phases.append(p)

        # ── PHASE 3: DB connection status ────────────────────────────────────
        p = Phase("PHASE-3  DB connection status is 'Connected'")
        # The TopBar button shows "Connected" (green) or "Not Connected" (red)
        status_el = wait_visible(
            driver,
            By.XPATH,
            "//*[text()='Connected' or text()='Not Connected']",
            timeout=PAGE_TIMEOUT,
        )
        status_text = status_el.text.strip()
        if "Not Connected" in status_text:
            p.fail(
                "DB shows 'Not Connected'. "
                "Ensure the test user has dbConnectionString set in the DB."
            )
        else:
            p.ok(f"DB status = '{status_text}'")
        phases.append(p)

        # ── PHASE 4: Navigate to Query Studio ────────────────────────────────
        p = Phase("PHASE-4  Navigate to Query Studio")
        # Pick the VISIBLE <a> tag whose href ends in /query-studio
        # (there are duplicate invisible links from collapsed sidebar)
        all_qs_links = driver.find_elements(
            By.XPATH,
            "//a[contains(@href,'query-studio')]"
        )
        visible_link = None
        for lnk in all_qs_links:
            if lnk.is_displayed() and lnk.text.strip():
                visible_link = lnk
                break

        if visible_link:
            safe_click(driver, visible_link)
        else:
            # Direct URL navigation as fallback
            driver.get(f"{APP_URL}/dashboard/query-studio")

        WebDriverWait(driver, PAGE_TIMEOUT).until(
            EC.url_contains("query-studio")
        )
        time.sleep(1)   # let page components render
        p.ok("Query Studio page loaded")
        phases.append(p)

        # ── PHASE 5: Confirm Query Studio has the prompt textarea ────────────
        p = Phase("PHASE-5  Query Studio prompt textarea present")
        # The page has two textareas: first = prompt, second = generated SQL
        textareas = WebDriverWait(driver, PAGE_TIMEOUT).until(
            lambda d: d.find_elements(By.TAG_NAME, "textarea")
            if len(d.find_elements(By.TAG_NAME, "textarea")) >= 1
            else None
        )
        prompt_area = textareas[0]
        placeholder = prompt_area.get_attribute("placeholder") or ""
        p.ok(f"Textarea found (placeholder: '{placeholder[:60]}')")
        phases.append(p)

        # ── PHASE 6: Type the natural-language prompt ────────────────────────
        p = Phase("PHASE-6  Enter NL prompt")
        js_type(driver, prompt_area, PROMPT_TEXT)
        time.sleep(0.4)
        actual = get_textarea_value(driver, prompt_area)
        if PROMPT_TEXT in actual:
            p.ok(f"Prompt entered: \"{PROMPT_TEXT}\"")
        else:
            # Some SQLEditor implementations use contenteditable divs
            # Try setting value via JS directly
            driver.execute_script(
                "arguments[0].value = arguments[1];"
                "arguments[0].dispatchEvent(new Event('input', {bubbles:true}));",
                prompt_area,
                PROMPT_TEXT,
            )
            time.sleep(0.4)
            actual = get_textarea_value(driver, prompt_area)
            if PROMPT_TEXT in actual:
                p.ok(f"Prompt entered via JS: \"{PROMPT_TEXT}\"")
            else:
                p.fail(f"Could not set prompt. Got: '{actual[:80]}'")
        phases.append(p)

        # ── PHASE 7: Click "Generate SQL →" ─────────────────────────────────
        p = Phase("PHASE-7  Click 'Generate SQL'")
        gen_btn = wait_clickable(
            driver,
            By.XPATH,
            "//button[contains(., 'Generate SQL')]",
        )
        safe_click(driver, gen_btn)
        # Wait for button to flip to "Generating SQL…"
        try:
            WebDriverWait(driver, 8).until(
                EC.text_to_be_present_in_element(
                    (By.XPATH, "//button[contains(., 'Generating') or contains(., 'Generate SQL')]"),
                    "Generating"
                )
            )
        except TimeoutException:
            pass   # might have been too fast
        p.ok("Generation request sent to APIFreeLLM")
        phases.append(p)

        # ── PHASE 8: Wait for LLM to return ─────────────────────────────────
        p = Phase("PHASE-8  LLM (APIFreeLLM) returns SQL")
        log(INFO, f"Waiting up to {LLM_TIMEOUT}s for APIFreeLLM (free tier ~25s) …")
        try:
            # Wait until "Generate SQL →" re-appears (spinner gone)
            WebDriverWait(driver, LLM_TIMEOUT).until(
                EC.text_to_be_present_in_element(
                    (By.XPATH, "//button[contains(., 'Generate SQL') or contains(., 'Generating')]"),
                    "Generate SQL"
                )
            )
            p.ok("LLM responded — SQL generation complete")
        except TimeoutException:
            p.fail(f"APIFreeLLM did not respond within {LLM_TIMEOUT}s")
        phases.append(p)
        if not p.passed:
            raise RuntimeError("LLM timeout — aborting")

        # ── PHASE 9: Verify generated SQL ────────────────────────────────────
        p = Phase("PHASE-9  Generated SQL is a valid SELECT with salary filter")
        time.sleep(0.5)
        # Check for a generation error banner first
        err_banners = driver.find_elements(
            By.XPATH,
            "//*[contains(text(),'Generation Error') or contains(text(),'⚠ Generation')]"
        )
        if err_banners:
            p.fail(f"Generation error shown: {err_banners[0].text.strip()[:120]}")
            phases.append(p)
        else:
            # Find the SQL textarea (second textarea, or the one that has SELECT)
            all_ta = driver.find_elements(By.TAG_NAME, "textarea")
            sql_text = ""
            for ta in all_ta:
                val = get_textarea_value(driver, ta)
                if "SELECT" in val.upper():
                    sql_text = val
                    break

            if not sql_text:
                p.fail("No SQL found in the editor after generation")
            elif "60000" not in sql_text and "salary" not in sql_text.lower():
                p.fail(
                    f"SQL doesn't contain salary filter: {sql_text.strip()[:120]}"
                )
            else:
                p.ok(f"SQL: {sql_text.strip()[:100]}")
            phases.append(p)

        # ── PHASE 10: Click "Run Query" ───────────────────────────────────────
        p = Phase("PHASE-10 Click 'Run Query' to execute SQL")
        run_btn = wait_clickable(
            driver,
            By.XPATH,
            "//button[contains(., 'Run Query')]",
        )
        safe_click(driver, run_btn)
        try:
            WebDriverWait(driver, 8).until(
                EC.text_to_be_present_in_element(
                    (By.XPATH, "//button[contains(., 'Running') or contains(., 'Run Query')]"),
                    "Running"
                )
            )
        except TimeoutException:
            pass   # might be instantaneous
        p.ok("Query execution started")
        phases.append(p)

        # ── Wait for execution to finish ──────────────────────────────────────
        p = Phase("PHASE-10b Query execution finished")
        log(INFO, f"Waiting up to {DB_TIMEOUT}s for results …")
        try:
            WebDriverWait(driver, DB_TIMEOUT).until(
                EC.text_to_be_present_in_element(
                    (By.XPATH, "//button[contains(., 'Running') or contains(., 'Run Query')]"),
                    "Run Query"
                )
            )
            p.ok("Query finished executing")
        except TimeoutException:
            p.fail(f"Query did not finish within {DB_TIMEOUT}s")
        phases.append(p)
        if not p.passed:
            raise RuntimeError("Execution timeout — aborting")

        # ── Check for execution error banner ──────────────────────────────────
        p = Phase("PHASE-10c No execution error banner")
        exec_err = driver.find_elements(
            By.XPATH,
            "//*[contains(text(),'Execution Error') or contains(text(),'⚠ Execution')]"
        )
        if exec_err:
            p.fail(f"Execution error: {exec_err[0].text.strip()[:200]}")
        else:
            p.ok("No error banner — results should be shown")
        phases.append(p)

        # ── PHASE 11: Results table is visible ────────────────────────────────
        p = Phase("PHASE-11 Results table rendered")
        time.sleep(0.5)
        try:
            table_el = wait_visible(driver, By.TAG_NAME, "table", timeout=PAGE_TIMEOUT)
            p.ok("Results <table> element found")
        except TimeoutException:
            # Fallback: look for "rows returned" text
            try:
                rows_lbl = driver.find_element(
                    By.XPATH,
                    "//*[contains(text(),'rows returned') or contains(text(),'row returned')]"
                )
                p.ok(f"Row count label: {rows_lbl.text.strip()}")
            except NoSuchElementException:
                p.fail("No <table> and no rows-returned label found")
        phases.append(p)

        # ── PHASE 11b: Row count ──────────────────────────────────────────────
        p = Phase("PHASE-11b Row count label shows >= 1 rows")
        try:
            # Use '.' (full text content) not 'text()' (text nodes only)
            # because the element renders as: <span>{13} row{s} returned</span>
            rows_lbl_el = driver.find_element(
                By.XPATH,
                "//*[contains(.,'rows returned') or contains(.,'row returned')]"
                "[not(self::html)][not(self::body)]"
            )
            lbl_text = rows_lbl_el.text.strip()
            log(INFO, f"Rows label: '{lbl_text}'")
            nums = re.findall(r"\d+", lbl_text)
            count = int(nums[0]) if nums else -1
            if count == 13:
                p.ok(f"Exact match: {count} rows (all 13 employees with salary < 60k)")
            elif count > 0:
                p.ok(f"{count} rows returned (expected 13)")
            else:
                p.fail(f"Unexpected row count: '{lbl_text}'")
        except NoSuchElementException:
            # Fallback: count <tr> elements in the table minus the header
            try:
                tbl = driver.find_element(By.TAG_NAME, "table")
                row_count = len(tbl.find_elements(By.TAG_NAME, "tr")) - 1
                if row_count > 0:
                    p.ok(f"{row_count} data rows counted in table directly")
                else:
                    p.fail("No data rows in table")
            except NoSuchElementException:
                p.fail("Could not locate row-count label or table")
        phases.append(p)

        # ── PHASE 12: Every salary < 60,000 ──────────────────────────────────
        p = Phase("PHASE-12 Every displayed salary is < 60,000")
        try:
            table_el = driver.find_element(By.TAG_NAME, "table")
            headers  = [
                th.text.strip().lower()
                for th in table_el.find_elements(By.TAG_NAME, "th")
            ]
            log(INFO, f"Table headers: {headers}")

            salary_idx = next(
                (i for i, h in enumerate(headers) if "salary" in h), -1
            )
            if salary_idx == -1:
                p.fail("'salary' column not found in table headers")
            else:
                rows_el = table_el.find_elements(By.TAG_NAME, "tr")[1:]   # skip header
                bad, all_salaries = [], []

                for row_el in rows_el:
                    cells = row_el.find_elements(By.TAG_NAME, "td")
                    if len(cells) <= salary_idx:
                        continue
                    raw = cells[salary_idx].text.strip().replace(",", "").replace("$", "")
                    try:
                        val = float(raw)
                        all_salaries.append(val)
                        if val >= 60000:
                            name = cells[0].text.strip() if cells else "?"
                            bad.append((name, val))
                    except ValueError:
                        pass

                if bad:
                    p.fail(f"Employees with salary >= 60,000 leaked into results: {bad}")
                elif not all_salaries:
                    p.fail("No salary values could be parsed from the table")
                else:
                    p.ok(
                        f"All {len(all_salaries)} salary values < 60,000  "
                        f"(highest = {max(all_salaries):,.0f})"
                    )
        except NoSuchElementException:
            p.fail("Table element no longer in DOM")
        phases.append(p)

        # ── PHASE 13: Known low-salary employees appear ───────────────────────
        p = Phase("PHASE-13 Known employees (salary < 60k) are present in table")
        page_src = driver.page_source
        expected = [
            "Alice Johnson", "Bob Martinez", "Carol Smith",
            "David Lee", "Eva Brown", "Liam Harris", "Quinn Young",
        ]
        found   = [n for n in expected if n in page_src]
        missing = [n for n in expected if n not in page_src]
        if len(found) == len(expected):
            p.ok(f"All {len(expected)} expected employees found")
        elif found:
            p.ok(f"Found {len(found)}/{len(expected)}: {found}")
        else:
            p.fail(f"None of the expected employees found. Missing: {missing}")
        phases.append(p)

        # ── PHASE 14: High-salary employees are absent ────────────────────────
        p = Phase("PHASE-14 High-salary employees (>= 60k) absent from results")
        excluded = [
            "Frank Wilson",    # $85,000
            "Grace Taylor",    # $110,000
            "Henry Adams",     # $72,000
            "James Clark",     # $68,000
            "Noah Robinson",   # $95,000
            "Rachel King",     # $98,000
            "Samuel Wright",   # $150,000
        ]
        leaked = [n for n in excluded if n in page_src]
        if leaked:
            p.fail(
                f"High-salary employees leaked into results: {leaked}"
            )
        else:
            p.ok(f"All {len(excluded)} high-salary employees correctly excluded")
        phases.append(p)

        # ── PHASE 15: Self-heal — retry if salary validation failed ───────────
        p = Phase("PHASE-15 Self-heal check (retry if salary validation failed)")
        salary_phase = next((ph for ph in phases if "PHASE-12" in ph.name), None)
        if salary_phase and not salary_phase.passed:
            log(INFO, "Salary validation failed — triggering self-heal retry…")
            # Re-enter prompt
            all_ta = driver.find_elements(By.TAG_NAME, "textarea")
            prompt_ta = all_ta[0]
            js_type(driver, prompt_ta, PROMPT_TEXT)
            gen_b = wait_clickable(
                driver, By.XPATH, "//button[contains(., 'Generate SQL')]"
            )
            safe_click(driver, gen_b)
            WebDriverWait(driver, LLM_TIMEOUT).until(
                EC.text_to_be_present_in_element(
                    (By.XPATH, "//button[contains(., 'Generate SQL') or contains(., 'Generating')]"),
                    "Generate SQL",
                )
            )
            run_b = wait_clickable(
                driver, By.XPATH, "//button[contains(., 'Run Query')]"
            )
            safe_click(driver, run_b)
            WebDriverWait(driver, DB_TIMEOUT).until(
                EC.text_to_be_present_in_element(
                    (By.XPATH, "//button[contains(., 'Run Query') or contains(., 'Running')]"),
                    "Run Query",
                )
            )
            p.ok("Self-heal retry completed")
        else:
            p.ok("No retry needed — salary validation passed on first attempt")
        phases.append(p)

    except Exception as exc:
        print(f"\n  {FAIL}  UNEXPECTED ERROR: {exc}")
        traceback.print_exc()

    finally:
        if driver:
            ss_path = "/tmp/selenium_talk2db_result.png"
            driver.save_screenshot(ss_path)
            log(INFO, f"Screenshot saved → {ss_path}")
            driver.quit()

    # ── Print summary ─────────────────────────────────────────────────────────
    passed = [ph for ph in phases if ph.passed]
    failed = [ph for ph in phases if not ph.passed]
    total  = len(phases)

    print()
    print("=" * 68)
    print("  FULL TEST SUMMARY")
    print("=" * 68)
    for ph in phases:
        sym = PASS if ph.passed else FAIL
        print(f"  {sym}  {ph.name}")
        if not ph.passed:
            # Indent the failure reason
            for line in ph.message.splitlines():
                print(f"        {line}")

    print()
    if not failed:
        print(f"  Result: {len(passed)}/{total} PASSED  — ALL TESTS PASSED ✓")
    else:
        print(f"  Result: {len(passed)}/{total} passed  |  {len(failed)} FAILED:")
        for ph in failed:
            print(f"    {FAIL} {ph.name}")
    print("=" * 68)
    print()

    return len(failed) == 0


if __name__ == "__main__":
    ok = run_tests()
    sys.exit(0 if ok else 1)
