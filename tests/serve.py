import functools
import http.server
import sys


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, *args):
        pass


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8799
root = sys.argv[2] if len(sys.argv) > 2 else '.'
handler = functools.partial(NoCache, directory=root)
class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 128


Server(('127.0.0.1', port), handler).serve_forever()
