"""Offline Chromium integration tests. Synthetic data only; never a live voice test.
Run: python -m unittest discover -s test-browser -v
Set BROWSER_EXECUTABLE only to use an already installed browser.
"""
import functools
import http.server
import json
import os
import pathlib
import subprocess
import threading
import unittest
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

ROOT = pathlib.Path(__file__).resolve().parents[1]

class QuietStaticHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

class OfflineBrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pw = sync_playwright().start()
        launch = {"headless": True}
        if os.environ.get("BROWSER_EXECUTABLE"):
            launch["executable_path"] = os.environ["BROWSER_EXECUTABLE"]
        cls.browser = cls.pw.chromium.launch(**launch)
        print("BROWSER_VERSION=" + cls.browser.version, flush=True)
        # Only a fake empty key is passed; no environment credentials reach the server.
        code = "import {makeServer} from './server.mjs'; const s=makeServer({apiKey:'',fetcher:async()=>{throw Error('Provider requests forbidden in test')}}); s.listen(0,'127.0.0.1',()=>console.log(s.address().port));"
        cls.server = subprocess.Popen(["node", "--input-type=module", "-e", code], cwd=ROOT,
                                      stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
                                      env={k: v for k, v in os.environ.items() if k in ("PATH", "HOME", "SYSTEMROOT")})
        cls.origin = "http://127.0.0.1:" + cls.server.stdout.readline().strip()
        handler = functools.partial(QuietStaticHandler, directory=str(ROOT / "docs"))
        cls.static = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
        cls.static_thread = threading.Thread(target=cls.static.serve_forever, daemon=True)
        cls.static_thread.start()
        cls.static_origin = f"http://127.0.0.1:{cls.static.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()
        cls.static.shutdown()
        cls.static.server_close()
        cls.static_thread.join(timeout=5)
        cls.server.terminate()
        try:
            cls.server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            cls.server.kill()
            cls.server.wait(timeout=5)
        cls.server.stdout.close()
        cls.server.stderr.close()

    def setUp(self):
        self.context = self.browser.new_context(accept_downloads=True, service_workers="block")
        self.network_violations, self.errors, self.requests, self.sockets = [], [], [], []
        origins = {self.origin, self.static_origin}
        def route(request_route):
            url = request_route.request.url
            self.requests.append(url)
            parsed = urlparse(url)
            if f"{parsed.scheme}://{parsed.netloc}" not in origins or parsed.path == '/api/token':
                self.network_violations.append(url)
                request_route.abort()
            else:
                request_route.continue_()
        self.context.route("**/*", route)
        self.context.route_web_socket("**/*", lambda ws: (self.sockets.append(ws.url), ws.close()))
        self.context.add_init_script("""window.__microphoneRequests=0;
            navigator.mediaDevices.getUserMedia=async()=>{window.__microphoneRequests++;throw Error('No microphone in offline tests');};""")
        self.page = self.context.new_page()
        self.page.on("pageerror", lambda error: self.errors.append(str(error)))
        self.page.goto(self.origin)
        expect(self.page.locator('#notice')).to_contain_text('Live voice is not configured')

    def tearDown(self):
        microphone_requests = self.page.evaluate('window.__microphoneRequests')
        self.context.close()
        self.assertEqual(self.network_violations, [], 'Unexpected HTTP/paid-provider attempt')
        self.assertEqual(self.sockets, [], 'Unexpected WebSocket attempt')
        self.assertEqual(microphone_requests, 0, 'Microphone requested in an offline flow')
        self.assertEqual(self.errors, [], 'Uncaught browser error')

    def sample(self):
        self.page.locator('#sample').click()
        expect(self.page.locator('#progress')).to_have_text('5 / 5 captured')

    def correction(self, value):
        self.page.locator('details').evaluate('(element) => {element.open=true;}')
        self.page.locator('#field').select_option('window')
        self.page.locator('#value').fill(value)
        self.page.locator('#correction button').click()

    def test_explicit_review_before_download(self):
        expect(self.page.locator('#review')).to_be_disabled()
        self.sample()
        self.page.locator('#review').click()
        expect(self.page.locator('#download')).to_be_disabled()
        self.page.locator('#approve').check()
        with self.page.expect_download() as capture:
            self.page.locator('#download').click()
        download = capture.value
        data = json.loads(pathlib.Path(download.path()).read_text())
        self.assertEqual(data['delivery'], 'local-download-only')
        self.assertIsNone(data['booking'])
        self.assertIsNone(data['price'])
        self.assertEqual(len(data['answers']), 5)

    def test_correction_removes_stale_review_text_and_approval(self):
        self.sample()
        self.page.locator('#review').click()
        self.page.locator('#approve').check()
        self.correction('Monday morning')
        expect(self.page.locator('#review-box')).to_be_hidden()
        expect(self.page.locator('#approve')).not_to_be_checked()
        expect(self.page.locator('#download')).to_be_disabled()
        self.assertEqual(self.page.locator('#review-text').text_content(), '')
        self.page.locator('#review').click()
        expect(self.page.locator('#review-text')).to_contain_text('Monday morning')
        expect(self.page.locator('#review-text')).not_to_contain_text('Friday afternoon')

    def test_clear_removes_hidden_review_content(self):
        self.sample()
        self.page.locator('#review').click()
        self.page.locator('#reset').click()
        expect(self.page.locator('#progress')).to_have_text('0 / 5 captured')
        self.assertEqual(self.page.locator('#review-text').text_content(), '')
        self.assertEqual(self.page.locator('#transcript').text_content(), '')
        expect(self.page.locator('#review')).to_be_disabled()
        expect(self.page.locator('#download')).to_be_disabled()

    def test_clear_removes_unsubmitted_inputs(self):
        self.page.locator('details').evaluate('(element) => {element.open=true;}')
        self.page.locator('#value').fill('SYNTHETIC_UNSAVED_DETAIL')
        self.page.locator('#invite').evaluate("element => {element.value='synthetic-not-a-real-invite';}")
        self.page.locator('#reset').click()
        expect(self.page.locator('#value')).to_have_value('')
        expect(self.page.locator('#invite')).to_have_value('')

    def test_clear_removes_synthetic_recording_view(self):
        # Seed a canvas and URL fixture; does not claim MediaRecorder/voice validation.
        self.page.evaluate("""() => {
            const canvas=document.querySelector('#demo-canvas');
            const ctx=canvas.getContext('2d');ctx.fillStyle='black';ctx.fillRect(0,0,5,5);
            document.querySelector('#recording-preview').hidden=false;
            const link=document.querySelector('#video-download');
            link.href=URL.createObjectURL(new Blob(['synthetic-recording-fixture']));
            link.download='synthetic.webm';link.hidden=false;
        }""")
        self.page.locator('#reset').click()
        expect(self.page.locator('#recording-preview')).to_be_hidden()
        expect(self.page.locator('#video-download')).to_be_hidden()
        self.assertIsNone(self.page.locator('#video-download').get_attribute('href'))
        self.assertIsNone(self.page.locator('#video-download').get_attribute('download'))
        self.assertEqual(self.page.evaluate("document.querySelector('#demo-canvas').getContext('2d').getImageData(0,0,1,1).data[3]"), 0)

    def test_untrusted_markup_is_rendered_as_text(self):
        self.sample()
        payload = '<img src=x onerror="window.__injected=true">SYNTHETIC'
        self.correction(payload)
        self.page.locator('#review').click()
        expect(self.page.locator('#review-text')).to_contain_text(payload)
        self.assertEqual(self.page.locator('#answers img, #transcript img, #review-text img').count(), 0)
        self.assertIsNone(self.page.evaluate('window.__injected'))

    def test_reload_does_not_restore_a_session(self):
        self.sample()
        self.page.locator('#review').click()
        self.page.reload()
        expect(self.page.locator('#progress')).to_have_text('0 / 5 captured')
        self.assertEqual(self.page.locator('#review-text').text_content(), '')
        self.assertEqual(self.page.evaluate('localStorage.length+sessionStorage.length'), 0)

    def test_static_sample_at_mobile_size_has_no_voice_path(self):
        self.page.set_viewport_size({'width': 390, 'height': 844})
        self.page.goto(self.static_origin)
        expect(self.page.locator('#notice')).to_contain_text('Public sample:')
        expect(self.page.locator('#start')).to_be_hidden()
        expect(self.page.locator('.guided-controls')).to_be_hidden()
        self.sample()
        self.page.locator('#review').click()
        self.page.locator('#approve').focus()
        self.page.keyboard.press('Space')
        expect(self.page.locator('#download')).to_be_enabled()
        self.page.locator('#reset').click()
        self.assertEqual(self.page.locator('#review-text').text_content(), '')
        self.assertTrue(self.page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'))

if __name__ == '__main__':
    unittest.main(verbosity=2)
