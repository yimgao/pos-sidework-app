"""Rendered smoke tests against a running local app and ISOLATED seeded backend.
Run with Playwright installed: python3 scripts/verify_responsive.py
Uses existing demo buttons; never reads credentials or prints auth tokens.
Does not mutate business data. Screenshots/results go to /tmp/pos-responsive-artifacts.
"""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

OUT = Path('/tmp/pos-responsive-artifacts')
OUT.mkdir(exist_ok=True)
SIZES = [(375, 667), (390, 844), (540, 720), (768, 1024), (834, 1194), (1024, 768), (1280, 800), (1440, 1000)]
results, errors = [], []


def settle(page):
    page.evaluate('() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
    page.wait_for_load_state('networkidle')
    page.locator('main').wait_for()
    if page.locator('.schedule-workspace').count():
        page.locator('.schedule-workspace [aria-busy="false"]').wait_for()
        page.locator('.schedule-cell-content, .schedule-editor').first.wait_for()


def visit(page, name, phone, more):
    if phone:
        direct = page.locator('.bottom-nav').get_by_role('button', name=name, exact=True)
        if direct.count():
            direct.click()
        else:
            page.locator('.bottom-nav').get_by_role('button', name=more, exact=True).click()
            page.locator('.nav-directory').get_by_role('button', name=name, exact=False).click()
    else:
        page.locator('.side-nav').get_by_role('button', name=name, exact=True).click()
    settle(page)


with sync_playwright() as p:
    browser = p.chromium.launch()
    for role in ['Owner', 'Manager', 'Anna']:
        context = browser.new_context(timezone_id='America/New_York')
        page = context.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('response', lambda r: errors.append(f'HTTP {r.status}: {r.url}') if r.status >= 400 else None)
        page.goto('http://127.0.0.1:5173')
        page.get_by_role('button', name=role, exact=True).click()
        settle(page)
        for lang in ['en', 'zh']:
            page.evaluate('(lang) => localStorage.setItem("pos-lang",lang)', lang)
            page.reload()
            settle(page)
            names = page.evaluate('async (lang) => (await import("/src/i18n.js")).dict(lang)', lang)
            for width, height in SIZES:
                page.set_viewport_size({'width': width, 'height': height})
                phone = width < 768
                if role == 'Anna':
                    routes = [('today', names['responsive']['today'] if phone else names['nav']['today']), ('schedule', names['responsive']['schedule'] if phone else names['nav']['schedule']), ('score', names['responsive']['score'] if phone else names['nav']['score'])]
                else:
                    routes = [(key, names['responsive'][{'dashboard':'overview','builder':'schedule','review':'review'}[key]] if phone and key in ['dashboard','builder','review'] else names['nav'][key]) for key in ['dashboard','builder','review','accounts','analytics','tasks','ai','report']]
                for key, label in routes:
                    visit(page, label, phone, names['responsive']['more'])
                    expect(page.locator('main').get_by_text(names['loading'], exact=True)).not_to_be_visible()
                    if key == 'dashboard':
                        page.locator('.dashboard-body').wait_for()
                    if key in ['analytics', 'accounts']:
                        page.locator('.responsive-table tbody tr').first.wait_for()
                    if key == 'today':
                        page.locator('.check-card').first.wait_for()
                    dims = page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})')
                    assert dims['scroll'] <= width + 1, (role, lang, key, dims)
                    assert page.locator('main').inner_text().strip(), (role, key, 'empty')
                    if key in ['schedule','builder']:
                        assert page.locator('.schedule-day-view' if phone else '.schedule-week-view').is_visible()
                        assert (page.locator('.schedule-edit').count() == 0 if role == 'Anna' else page.locator('.schedule-edit').count() > 0), (role, lang, width, page.locator('main').inner_text())
                    if key == 'accounts':
                        search=page.get_by_role('searchbox')
                        assert search.is_visible()
                        search.fill('Anna')
                        expect(page.locator('tbody tr')).to_have_count(1)
                        search.fill('')
                    if phone:
                        assert page.locator('.bottom-nav button').count() == (3 if role == 'Anna' else 4)
                    results.append({'role':role,'language':lang,'width':width,'page':key,'overflow':False})
                    if role in ['Owner','Anna'] and width in [390,834,1440]:
                        page.screenshot(path=str(OUT/f'{role}-{lang}-{key}-{width}.png'), full_page=True)
                # Profile remains reachable at every breakpoint.
                page.locator('.avatar-btn' if phone else '.topbar-user').click()
                settle(page)
                assert page.get_by_role('button', name='English', exact=True).count() or page.locator('.lang-switch').count()
        context.close()
    browser.close()
assert not errors, errors
(OUT/'results.json').write_text(json.dumps({'checks':results,'errors':errors},indent=2))
print(json.dumps({'passed':len(results),'widths':[w for w,h in SIZES],'roles':['Owner','Manager','Anna'],'languages':['en','zh'],'errors':errors,'artifacts':str(OUT)}))
