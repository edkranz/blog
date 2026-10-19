"""Regression checks for review findings on /admin (run against a fresh fake-mode server).

  ADMIN_FAKE_GITHUB=1 ./node_modules/.bin/next dev --turbopack -p 3011
  uv run --with playwright python tests/e2e/admin_regressions.py http://localhost:3011

Each check runs in its own browser page and reports PASS/FAIL; the exit code is non-zero if any fail.
"""

import re
import sys
import traceback

from playwright.sync_api import expect, sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3011"
SLUG = "introducing-eddie-os"
ANY_CHANGES = re.compile(r"^\d+ changes?$")
RICH_BODY = ".eos-mdx [contenteditable='true']"


def api(page, path):
    res = page.request.get(f"{BASE}/api/admin/{path}")
    assert res.ok, f"{path}: {res.status}"
    return res.json()


def commit(page, branch, changes):
    head = api(page, f"content?branch={branch}")["head"]
    res = page.request.post(f"{BASE}/api/admin/commit", data={"branch": branch, "head": head, "message": "upstream", "changes": changes}, headers={"Origin": BASE})
    assert res.ok, res.status


def sign_in(browser):
    page = browser.new_page(viewport={"width": 1400, "height": 900})
    page.goto(f"{BASE}/api/admin/login")
    page.wait_for_url(f"{BASE}/admin")
    expect(page.locator("header").get_by_role("button", name="main", exact=True)).to_be_visible(timeout=60_000)
    return page


def save(page):
    page.get_by_role("button", name="Save", exact=True).click()
    expect(page.get_by_text(ANY_CHANGES)).to_have_count(0, timeout=15_000)


def save_as_draft(page, name):
    """Save on main: the edits move to a new draft branch named in the prompt."""
    page.get_by_role("button", name="Save", exact=True).click()
    prompt = page.get_by_role("dialog", name="New Branch")
    prompt.get_by_role("textbox").fill(name)
    prompt.get_by_role("button", name="Create").click()
    expect(page.get_by_text(ANY_CHANGES)).to_have_count(0, timeout=15_000)


def change_count(page):
    loc = page.get_by_text(ANY_CHANGES)
    return int(loc.inner_text().split()[0]) if loc.count() else 0


def open_post(page, title):
    page.get_by_role("button", name="Open Blog").click()
    page.get_by_role("button", name=title).first.click()


def check_typed_colliding_title(browser):
    """Typing a title through an existing slug stages one post and never touches the existing post's edit."""
    page = sign_in(browser)
    open_post(page, "Introducing Eddie OS")
    expect(page.locator(RICH_BODY).first).to_be_visible(timeout=60_000)
    page.locator(RICH_BODY).first.click()
    page.keyboard.press("ControlOrMeta+End")
    page.keyboard.type(" kept")
    page.get_by_role("button", name="Open Blog").click()
    page.get_by_role("button", name="New post").click()
    page.get_by_role("textbox", name="Title").last.click()
    page.keyboard.type("Introducing Eddie OS 2", delay=15)
    page.wait_for_timeout(500)
    assert change_count(page) == 2, f"expected the existing edit + one new post, got {change_count(page)}"
    titles = page.locator("li h2").all_inner_texts()
    assert "Introducing Eddie OS 2" in titles and not any(t in ("Introducing Eddie O", "Introducing Eddie") for t in titles), titles
    page.close()


def check_branch_switch_reloads_editor(browser):
    """An editor left open across a branch switch shows (and stages) the new branch's post, not the old one."""
    page = sign_in(browser)
    header = page.locator("header")
    header.get_by_role("button", name="main").click()
    page.get_by_text("New Branch…").click()
    page.get_by_role("dialog").get_by_role("textbox").fill("Switch Test")
    page.get_by_role("button", name="Create").click()
    expect(header.get_by_role("button", name="drafts/switch-test")).to_be_visible()
    open_post(page, "Introducing Eddie OS")
    body = page.locator(RICH_BODY).first
    expect(body).to_be_visible(timeout=60_000)
    body.click()
    page.keyboard.press("ControlOrMeta+End")
    page.keyboard.type(" DRAFT-ONLY")
    save(page)
    header.get_by_role("button", name="drafts/switch-test").click()
    page.get_by_role("menuitem", name="main").or_(page.get_by_text("main", exact=True)).first.click()
    expect(header.get_by_role("button", name="main", exact=True)).to_be_visible()
    page.wait_for_timeout(1500)
    body = page.locator(RICH_BODY).first
    assert "DRAFT-ONLY" not in body.inner_text(), "editor still shows the draft branch's body on main"
    page.close()


def edit_blurb(page, text):
    blurb = page.locator('[data-editable="profile.blurb"]')
    expect(blurb).to_be_visible(timeout=60_000)
    blurb.click()
    page.keyboard.press("ControlOrMeta+A")
    page.keyboard.type(text)
    blurb.evaluate("e => e.blur()")


def move_upstream(page, branch, location):
    profile = api(page, f"content?branch={branch}")["profile"]
    profile["profile"]["location"] = location
    commit(page, branch, [{"kind": "json", "file": "content/profile.json", "value": profile}])


def check_reload_rebases_json(browser):
    """After 'branch moved', Reload keeps my edit and the upstream edit to the same file."""
    page = sign_in(browser)
    assert page.request.post(f"{BASE}/api/admin/branches", data={"name": "Rebase Test", "from": "main"}, headers={"Origin": BASE}).ok
    page.evaluate("sessionStorage.setItem('eos-admin-branch', 'drafts/rebase-test')")
    page.reload()
    expect(page.locator("header").get_by_role("button", name="drafts/rebase-test")).to_be_visible(timeout=60_000)
    edit_blurb(page, "Mine.")
    move_upstream(page, "drafts/rebase-test", "Upstream City")
    page.get_by_role("button", name="Save", exact=True).click()
    page.get_by_role("button", name="Reload").click()
    page.wait_for_timeout(1000)
    save(page)
    after = api(page, "content?branch=drafts/rebase-test")["profile"]["profile"]
    assert after["blurb"] == "Mine." and after["location"] == "Upstream City", after
    page.close()


def check_save_on_main_rebases_json(browser):
    """Edits moved from main to a new draft are rebased onto main as it is now, not saved over an upstream change."""
    page = sign_in(browser)
    edit_blurb(page, "Carried.")
    move_upstream(page, "main", "Moved City")
    save_as_draft(page, "Carry Test")
    after = api(page, "content?branch=drafts/carry-test")["profile"]["profile"]
    assert after["blurb"] == "Carried." and after["location"] == "Moved City", after
    page.close()


def check_saved_new_post_single_window(browser):
    """After a new post's first save, opening it from Blog focuses the same editor window."""
    page = sign_in(browser)
    page.get_by_role("button", name="Open Blog").click()
    page.get_by_role("button", name="New post").click()
    page.get_by_role("textbox", name="Title").last.fill("One Window")
    save_as_draft(page, "One Window")
    before = page.locator(RICH_BODY).count()
    open_post(page, "One Window")
    page.wait_for_timeout(1000)
    assert page.locator(RICH_BODY).count() == before, f"{page.locator(RICH_BODY).count()} editors, expected {before}"
    page.close()


CHECKS = [
    check_typed_colliding_title,
    check_branch_switch_reloads_editor,
    check_reload_rebases_json,
    check_save_on_main_rebases_json,
    check_saved_new_post_single_window,
]

with sync_playwright() as p:
    browser = p.chromium.launch()
    failed = 0
    for check in CHECKS:
        try:
            check(browser)
            print(f"PASS {check.__name__}")
        except Exception as e:  # noqa: BLE001
            failed += 1
            print(f"FAIL {check.__name__}: {str(e).splitlines()[0] if str(e) else traceback.format_exc(limit=1)}")
    browser.close()
    sys.exit(1 if failed else 0)
