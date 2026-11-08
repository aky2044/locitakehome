"""Serve the onboarding locally and open it in a frameless, installer-style app window.

Uses Chrome or Edge "--app" mode: no tabs, no address bar, fixed 1280x832 window
(the Figma Mac window size). Falls back to the default browser if neither is found.
"""
import functools, http.server, os, shutil, subprocess, sys, threading, webbrowser

PORT = int(os.environ.get("PORT", 5173))
ROOT = os.path.dirname(os.path.abspath(__file__))
URL = f"http://127.0.0.1:{PORT}/?app"  # ?app = fill the app window (no drawn Mac frame)


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *a):
        pass


def find_browser():
    candidates = [
        shutil.which("chrome"), shutil.which("msedge"),
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    ]
    return next((c for c in candidates if c and os.path.exists(c)), None)


def open_window():
    browser = find_browser()
    if not browser:
        webbrowser.open(URL)
        return
    profile = os.path.join(ROOT, ".app-profile")  # separate profile = its own clean window
    subprocess.Popen([
        browser, f"--app={URL}", "--window-size=1280,832",
        f"--user-data-dir={profile}", "--no-first-run", "--no-default-browser-check",
    ])


if __name__ == "__main__":
    handler = functools.partial(NoCache, directory=ROOT)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler)
    print(f"Serving {URL}", flush=True)
    if "--no-window" not in sys.argv:
        threading.Timer(0.5, open_window).start()
    server.serve_forever()
