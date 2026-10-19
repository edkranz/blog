"""End-to-end check of /admin against the in-memory GitHub fake.

Run against a fresh server (the fake keeps state for the life of the process):
  ADMIN_FAKE_GITHUB=1 ./node_modules/.bin/next dev --turbopack -p 3011
  uv run --with playwright python tests/e2e/admin.py http://localhost:3011
"""

import re
import sys

from playwright.sync_api import expect, sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3011"
SLUG = "introducing-eddie-os"
ONE_CHANGE = re.compile(r"^1 change$")
ANY_CHANGES = re.compile(r"^\d+ changes?$")
# MDXEditor also puts its className on a popup container, so target the editable body itself.
RICH_BODY = ".eos-mdx [contenteditable='true']"


def api(page, path):
    res = page.request.get(f"{BASE}/api/admin/{path}")
    assert res.ok, f"{path}: {res.status}"
    return res.json()


def post(page, path, data):
    return page.request.post(f"{BASE}/api/admin/{path}", data=data, headers={"Origin": BASE})


def save(page):
    page.get_by_role("button", name="Save", exact=True).click()
    expect(page.get_by_text(ANY_CHANGES)).to_have_count(0, timeout=15_000)


with sync_playwright() as p:
    browser = p.chromium.launch()

    # Visitors: no admin UI, no editor code, no admin API calls.
    visitor = browser.new_page(viewport={"width": 1400, "height": 900})
    urls = []
    visitor.on("request", lambda r: urls.append(r.url))
    visitor.goto(f"{BASE}/about")
    expect(visitor.locator(".os-root em").first).to_be_visible(timeout=60_000)
    visitor.wait_for_timeout(1500)
    assert visitor.locator("[data-editable]").count() == 0
    assert not any("/api/admin/" in u or "mdxeditor" in u.lower() for u in urls), [u for u in urls if "admin" in u or "mdx" in u.lower()]
    assert visitor.request.get(f"{BASE}/api/admin/content").status == 401

    # Sign in.
    page = browser.new_page(viewport={"width": 1400, "height": 900})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"{BASE}/admin")
    page.get_by_role("link", name="Sign in with GitHub").click()
    page.wait_for_url(f"{BASE}/admin")
    header = page.locator("header")

    # In-place edit on main: Save moves it to a new draft branch, main stays untouched.
    blurb = page.locator('[data-editable="profile.blurb"]')
    expect(blurb).to_be_visible(timeout=60_000)
    blurb.click()
    page.keyboard.press("ControlOrMeta+A")
    page.keyboard.type("Edited by e2e.")
    blurb.evaluate("e => e.blur()")
    expect(page.get_by_text(ONE_CHANGE)).to_be_visible()
    page.get_by_role("button", name="Save", exact=True).click()
    name = page.get_by_role("dialog", name="New Branch").get_by_role("textbox")
    expect(name).to_have_value(re.compile(r"^edit \d{4}-\d{2}-\d{2}$"))
    name.fill("E2E Test")
    page.get_by_role("button", name="Create").click()
    expect(header.get_by_role("button", name="drafts/e2e-test")).to_be_visible()
    expect(page.get_by_text(ANY_CHANGES)).to_have_count(0, timeout=15_000)
    assert api(page, "content?branch=drafts/e2e-test")["profile"]["profile"]["blurb"] == "Edited by e2e."
    assert api(page, "content?branch=main")["profile"]["profile"]["blurb"] != "Edited by e2e."

    # Stale head and hostile paths are rejected server-side.
    head = api(page, "content?branch=main")["head"]
    assert post(page, "commit", {"branch": "main", "head": "stale", "message": "", "changes": [{"kind": "json", "file": "content/projects.json", "value": []}]}).status == 409
    hostile = post(page, "commit", {"branch": "main", "head": head, "message": "", "changes": [{"kind": "upload", "path": "../.github/workflows/x.yml", "base64": "AA=="}]})
    assert hostile.status == 400, hostile.status
    assert page.request.post(f"{BASE}/api/admin/commit", data={}).status == 403  # no Origin header

    # Edit the real post in the rich editor.
    page.get_by_role("button", name="Open Blog").click()
    page.get_by_role("button", name="Introducing Eddie OS").first.click()
    body = page.locator(RICH_BODY).first
    expect(body).to_be_visible(timeout=60_000)
    page.wait_for_timeout(1000)
    assert page.get_by_text(ANY_CHANGES).count() == 0, "opening a post staged a change"
    body.click()
    page.keyboard.press("ControlOrMeta+End")
    page.keyboard.type(" E2E line.")
    expect(page.get_by_text(ONE_CHANGE)).to_be_visible()
    save(page)
    draft = api(page, f"post?branch=drafts/e2e-test&slug={SLUG}")["draft"]
    assert "E2E line." in draft["body"]
    assert draft["body"].count("::sketch{") == 3, draft["body"]
    assert draft["extra"].get("author") == "content/authors/eddie.md", draft["extra"]
    assert "E2E line." not in api(page, f"post?branch=main&slug={SLUG}")["draft"]["body"]

    # A new post whose title collides with an existing slug never stages (no silent overwrite).
    page.get_by_role("button", name="Open Blog").click()
    page.get_by_role("button", name="New post").click()
    page.get_by_role("textbox", name="Title").last.fill("Introducing Eddie OS")
    page.locator(RICH_BODY).last.click()
    page.keyboard.type("overwrite?")
    page.wait_for_timeout(500)
    assert page.get_by_text(ANY_CHANGES).count() == 0
    assert "border-destructive" in (page.get_by_role("textbox", name="Slug").last.get_attribute("class") or "")

    # JSX the rich editor cannot parse survives a save from source mode.
    page.get_by_role("textbox", name="Title").last.fill("E2E Raw")
    page.get_by_label("Source mode", exact=True).last.click()
    source = page.locator(".eos-mdx .cm-content").last
    source.click()
    page.keyboard.press("ControlOrMeta+A")
    page.keyboard.type('<Foo bar="1" />\n\nplain text')
    page.wait_for_timeout(500)
    save(page)
    raw = api(page, "post?branch=drafts/e2e-test&slug=e2e-raw")["draft"]["body"]
    assert '<Foo bar="1" />' in raw and "plain text" in raw, raw

    # Saves do not build; Deploy preview asks for a build of the draft head.
    deploy = header.get_by_role("button", name="Deploy preview")
    expect(deploy).to_be_visible(timeout=15_000)
    deploy.click()
    preview = header.get_by_role("link", name="Preview")
    expect(preview).to_be_visible(timeout=15_000)
    assert "blog-git-drafts-e2e-test" in (preview.get_attribute("href") or "")

    # Push the branch to main.
    header.get_by_role("button", name="Push to main").click()
    page.get_by_role("dialog").get_by_role("button", name="Push", exact=True).click()
    expect(header.get_by_role("button", name="main", exact=True)).to_be_visible(timeout=15_000)
    assert "E2E line." in api(page, f"post?branch=main&slug={SLUG}")["draft"]["body"]
    assert "drafts/e2e-test" not in api(page, "branches")["branches"]

    # Visitors still get the build-time content (edits deploy via git, not live).
    visitor.goto(f"{BASE}/")
    expect(visitor.locator(".os-root").get_by_text("Edited by e2e.")).to_have_count(0)

    # A branch without editable content (main before content/profile.json lands) keeps the admin signed in
    # and the other branches reachable.
    assert post(page, "branches", {"name": "Has Content", "from": "main"}).ok
    page.evaluate("sessionStorage.clear()")  # start on main, not the remembered branch
    page.route(
        "**/api/admin/content?branch=main",
        lambda route: route.fulfill(status=404, content_type="application/json", body='{"error":"main has no content/profile.json"}'),
    )
    page.goto(f"{BASE}/admin")
    expect(page.get_by_text("Load failed: main has no content/profile.json")).to_be_visible(timeout=60_000)
    expect(page.get_by_role("link", name="Sign in with GitHub")).to_have_count(0)
    page.locator("header").get_by_role("button", name="main", exact=True).click()
    page.get_by_text("drafts/has-content").click()
    expect(page.locator('[data-editable="profile.blurb"]')).to_be_visible(timeout=15_000)

    assert not errors, errors
    browser.close()
    print("admin e2e: ok")
