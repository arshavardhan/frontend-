"""Visual check: run against the Vite dev server with the mock backend and save screenshots."""
import json, sys, time, re
from playwright.sync_api import sync_playwright
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from mock_api import scenario, handle

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5173'
OUT = sys.argv[2] if len(sys.argv) > 2 else '/home/claude/shots'
SHOTS = json.loads(sys.argv[3]) if len(sys.argv) > 3 else [['home', 'advanced', 1672, 941, 'home']]

def run():
    import os; os.makedirs(OUT, exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for name, scen, w, h, route, *rest in SHOTS:
            state = scenario(scen)
            ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1)
            page = ctx.new_page()
            errors = []
            page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
            page.on('pageerror', lambda e: errors.append(str(e)))
            def route_api(r):
                req = r.request
                data = handle(req.url, req.method, req.post_data, state)
                r.fulfill(status=200, content_type='application/json', body=json.dumps({'data': data} if '/api/v1/' in req.url else data))
            page.route(re.compile(r'^https?://[^/]+/api/'), route_api)
            page.route('https://fonts.googleapis.com/**', lambda r: r.abort())
            page.goto(f'{BASE}/#/{route}')
            page.wait_for_timeout(1400)
            for action in (rest[0] if rest else []):
                kind, arg = action
                if kind == 'click': page.click(arg); page.wait_for_timeout(600)
                if kind == 'hover': page.hover(arg); page.wait_for_timeout(400)
                if kind == 'wait': page.wait_for_timeout(arg)
            page.screenshot(path=f'{OUT}/{name}.png', full_page=False)
            full = page.evaluate('document.documentElement.scrollWidth > window.innerWidth')
            print(name, 'errors:', errors[:5], 'h-overflow:', full)
            ctx.close()
        b.close()
run()
