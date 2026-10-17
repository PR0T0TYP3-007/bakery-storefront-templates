"""Static dev server for the templates.

Identical to `python -m http.server` except that it tells the browser never to
cache. Without this, edited CSS and ES modules are served from the browser's
heuristic cache and you end up debugging a page that no longer exists on disk.

    python devserver.py [port] [directory]
"""

import pathlib
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4321
DIRECTORY = sys.argv[2] if len(sys.argv) > 2 else "."


class NoCacheHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".json": "application/json",
        ".woff2": "font/woff2",
        ".svg": "image/svg+xml",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def send_error(self, code, message=None, explain=None):
        """Serve /404.html for missing paths, matching Cloudflare and Netlify.

        Without this the dev server shows Python's default error page, so a
        custom 404 looks broken locally and fine in production — or worse,
        the other way round.
        """
        if code == 404:
            root = pathlib.Path(self.directory) / "404.html"
            if root.is_file():
                body = root.read_bytes()
                self.send_response(404)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
        super().send_error(code, message, explain)

    def log_message(self, fmt, *args):
        # Keep the console readable: only report problems.
        if args and str(args[1]).startswith(("4", "5")):
            super().log_message(fmt, *args)


if __name__ == "__main__":
    handler = partial(NoCacheHandler, directory=DIRECTORY)
    with ThreadingHTTPServer(("127.0.0.1", PORT), handler) as httpd:
        print(f"Serving {DIRECTORY} on http://localhost:{PORT} (no-store)")
        httpd.serve_forever()
