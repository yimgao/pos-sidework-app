"""Mutation checks: ONLY run against an isolated local seeded test database.
Requires POS_ISOLATED_TEST_DB=1. Uses UI demo login, no credentials in test code.
"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

assert os.environ.get('POS_ISOLATED_TEST_DB') == '1', 'Refusing writes without isolated database acknowledgement'
OUT=Path('/tmp/pos-responsive-artifacts'); OUT.mkdir(exist_ok=True)


def ready(page):
    page.wait_for_load_state('networkidle')
    if page.locator('.schedule-workspace').count():
        page.locator('.schedule-workspace [aria-busy="false"]').wait_for()
        page.locator('.schedule-cell-content, .schedule-editor').first.wait_for()


def api(page, expression):
    return page.evaluate('async () => {const a=await import("/src/api.js");'+expression+'}')


with sync_playwright() as p:
    browser=p.chromium.launch()
    manager=browser.new_page(viewport={'width':390,'height':844}, timezone_id='America/New_York')
    employee=browser.new_page(viewport={'width':390,'height':844}, timezone_id='America/New_York')
    for page, role in [(manager,'Owner'),(employee,'Anna')]:
        page.goto('http://127.0.0.1:5173')
        page.get_by_role('button',name=role,exact=True).click()
        page.locator('main').wait_for(); ready(page)
    manager.locator('.bottom-nav').get_by_role('button',name='Schedule',exact=True).click(); ready(manager)
    manager.locator('.schedule-week-picker input').fill('2030-03-11'); ready(manager)
    manager.locator('.schedule-custom summary').click()
    manager.get_by_label('Shift name (English)',exact=True).fill('Responsive test shift')
    manager.get_by_role('button',name='Add Shift',exact=True).click(); ready(manager)
    templates=api(manager,'return await a.shiftTemplates()')
    custom=max((t for t in templates if t['name'].startswith('Responsive test shift')), key=lambda t: t['id'])
    manager.locator('.schedule-add-form select').nth(0).select_option(label='Anna')
    manager.locator('.schedule-add-form select').nth(1).select_option(str(custom['id']))
    manager.locator('.schedule-add-form').get_by_role('button',name='Add Schedule',exact=True).click(); ready(manager)
    schedules=api(manager,"return await a.scheduleWeek('2030-03-11')")
    draft=next(s for s in schedules if s['shift_template_id']==custom['id'] and s['status']=='draft')
    expect(manager.locator('.schedule-day-view')).to_contain_text('Unpublished')
    assert all(s['id']!=draft['id'] for s in api(employee,"return await a.scheduleWeek('2030-03-11')")), 'Draft leaked to employee'
    manager.get_by_role('button',name='Publish Week',exact=True).click(); ready(manager)
    assert any(s['id']==draft['id'] and s['status']=='published' for s in api(employee,"return await a.scheduleWeek('2030-03-11')"))
    employee.locator('.bottom-nav').get_by_role('button',name='Schedule',exact=True).click(); ready(employee)
    employee.locator('.schedule-week-picker input').fill('2030-03-11'); ready(employee)
    expect(employee.locator('.schedule-day-view')).to_contain_text('Responsive test shift')
    employee.screenshot(path=str(OUT/'employee-published-phone.png'),full_page=True)
    manager.locator('.schedule-person').filter(has=manager.get_by_role('heading',name='Anna',exact=True)).get_by_role('button',name='Edit:',exact=False).click()
    assert manager.locator('.schedule-editor select').first.evaluate('(e)=>document.activeElement===e')
    replacement=next(t for t in templates if t['id']!=custom['id'])
    manager.locator('.schedule-editor-row').filter(has=manager.locator(f'select:has(option[value="{custom["id"]}"]:checked)')).first.locator('select').select_option(str(replacement['id'])); ready(manager)
    updated=api(manager,"return await a.scheduleWeek('2030-03-11')")
    assert next(s for s in updated if s['id']==draft['id'])['shift_template_id']==replacement['id']
    manager.screenshot(path=str(OUT/'schedule-editor-phone.png'),full_page=True)
    manager.locator('.schedule-editor-row').filter(has=manager.locator(f'select:has(option[value="{replacement["id"]}"]:checked)')).first.locator('.schedule-cancel').click(); ready(manager)
    assert all(s['id']!=draft['id'] or s['status']=='cancelled' for s in api(manager,"return await a.scheduleWeek('2030-03-11')"))
    assert all(s['id']!=draft['id'] for s in api(employee,"return await a.scheduleWeek('2030-03-11')"))
    manager.locator('.schedule-editor').press('Escape')
    assert manager.locator('.schedule-editor').count()==0
    print('PASS custom shift -> draft -> publish -> employee visibility -> edit -> cancel -> employee removed; keyboard focus/Escape')
    browser.close()
