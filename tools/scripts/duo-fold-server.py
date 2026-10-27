"""Lets a Maestro flow fold iPhone Duo in the middle of a flow.

    python3 -I tools/scripts/duo-fold-server.py <udid> [port]   (port default 7311)

Maestro's scripts cannot run a command, but they can make an HTTP request: a flow's
`runScript: ../common/fold.js` posts to http://127.0.0.1:<port>/fold?pose=<pose> (or
?keyframes=<json>), and this runs duo-fold.sh for the simulator and answers when it is done. It
listens on the loopback address only, runs one fold at a time, and is started and stopped by
device-run-flows.sh around a run on a device with two displays.
"""

import http.server
import os
import subprocess
import sys
import threading
import urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
POSES = {"closed", "book", "stand", "open"}
UDID = sys.argv[1]
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 7311
ONE_AT_A_TIME = threading.Lock()


class Fold(http.server.BaseHTTPRequestHandler):
    def do_POST(self):  # noqa: N802 (the handler's name is http.server's)
        url = urllib.parse.urlparse(self.path)
        query = urllib.parse.parse_qs(url.query)
        pose = query.get("pose", [""])[0]
        keyframes = query.get("keyframes", [""])[0]
        if url.path != "/fold" or (pose not in POSES and not keyframes):
            self.answer(400, "POST /fold?pose=closed|book|stand|open or /fold?keyframes=<json>\n")
            return
        args = ["keyframes", keyframes] if keyframes else [pose]
        with ONE_AT_A_TIME:
            done = subprocess.run(
                [os.path.join(HERE, "duo-fold.sh"), *args, UDID],
                capture_output=True,
                text=True,
                timeout=120,
                check=False,
            )
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
