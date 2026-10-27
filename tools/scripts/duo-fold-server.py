"""Lets a Maestro flow fold iPhone Duo, and capture it, in the middle of a flow.

    python3 -I tools/scripts/duo-fold-server.py <udid> [port] [screens dir]   (port default 7311)

Maestro's scripts cannot run a command, but they can make an HTTP request:

- `runScript: ../common/fold.js` posts to /fold?pose=<pose> (or ?keyframes=<json>), and this runs
  duo-fold.sh for the simulator and answers when it is done.
- `runScript: ../common/shot.js` posts to /shot?name=<capture name>, and this saves the panel that
  is lit as <screens dir>/<name>.png before it answers. Unlike a `takeScreenshot` taken again from
  the lit panel afterwards, the flow waits for it, so the next step cannot change the screen first.

It listens on the loopback address only, does one thing at a time, and is started and stopped by
device-run-flows.sh around a run on a device with two displays.
"""

import http.server
import os
import re
import subprocess
import sys
import threading
import urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
POSES = {"closed", "book", "stand", "open"}
UDID = sys.argv[1]
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 7311
SCREENS = sys.argv[3] if len(sys.argv) > 3 else ""
ONE_AT_A_TIME = threading.Lock()


def run(args):
    return subprocess.run(args, capture_output=True, text=True, timeout=120, check=False)


class Fold(http.server.BaseHTTPRequestHandler):
    def do_POST(self):  # noqa: N802 (the handler's name is http.server's)
        url = urllib.parse.urlparse(self.path)
        query = urllib.parse.parse_qs(url.query)
        if url.path == "/shot":
            self.shot(query.get("name", [""])[0])
            return
        pose = query.get("pose", [""])[0]
        keyframes = query.get("keyframes", [""])[0]
        if url.path != "/fold" or (pose not in POSES and not keyframes):
            self.answer(400, "POST /fold?pose=closed|book|stand|open, /fold?keyframes=<json> or /shot?name=<name>\n")
            return
        args = ["keyframes", keyframes] if keyframes else [pose]
        with ONE_AT_A_TIME:
            done = run([os.path.join(HERE, "duo-fold.sh"), *args, UDID])
        self.answer(200 if done.returncode == 0 else 500, done.stdout + done.stderr)

    def shot(self, name):
        if not re.fullmatch(r"[a-z0-9-]+", name):
            self.answer(400, "the capture's name is lower-case words joined by hyphens\n")
            return
        if not SCREENS:
            self.answer(200, "not capturing in this run\n")
            return
        with ONE_AT_A_TIME:
            lit = run([os.path.join(HERE, "sim-display.sh"), UDID, "auto"]).stdout.strip()
            display = [f"--display={lit}"] if lit else []
            done = run(["xcrun", "simctl", "io", UDID, "screenshot", *display, os.path.join(SCREENS, f"{name}.png")])
        self.answer(200 if done.returncode == 0 else 500, done.stdout + done.stderr)

    def answer(self, status, text):
        body = text.encode()
        self.send_response(status)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_):
        pass


http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Fold).serve_forever()
