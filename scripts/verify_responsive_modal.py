"""Read-only rendered modal checks against the local demo app."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
out=Path('/tmp/pos-responsive-artifacts')
with sync_playwright() as p:
 b=p.chromium.launch()
 page=b.new_page(viewport={'width':390,'height':844})
 page.goto('http://127.0.0.1:5173'); page.get_by_role('button',name='Owner',exact=True).click()
 page.locator('main').wait_for()
 page.locator('.bottom-nav').get_by_role('button',name='More',exact=True).click()
 page.locator('.nav-directory').get_by_role('button',name='Checklist Templates',exact=False).click()
 page.get_by_role('button',name='+ New task',exact=False).click()
 dialog=page.get_by_role('dialog'); dialog.wait_for()
 for width,height in [(390,844),(390,480),(834,1194),(1440,1000)]:
  page.set_viewport_size({'width':width,'height':height})
  bounds=dialog.bounding_box()
  assert bounds['y']>=0 and bounds['y']+bounds['height']<=height+1, bounds
  dialog.locator('input').first.focus()
  assert dialog.locator('input').first.evaluate('(e)=>getComputedStyle(e).fontSize')=='16px'
  page.screenshot(path=str(out/f'modal-{width}-{height}.png'))
  dialog.locator('select').first.focus(); page.keyboard.press('Shift+Tab')
  expect(dialog.locator('button').last).to_be_focused()
  page.keyboard.press('Tab'); expect(dialog.locator('select').first).to_be_focused()
 page.keyboard.press('Escape'); expect(dialog).to_have_count(0)
 print('PASS modal bounds at phone/reduced-height/tablet/desktop, 16px inputs, Tab trap and Escape')
 b.close()
