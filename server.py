# server.py — run a tiny static server that ensures .js is served as application/javascript
import http.server
import mimetypes

# Ensure .js files are served with the JavaScript MIME type
mimetypes.add_type('application/javascript', '.js')

# Use the standard handler which uses mimetypes above
Handler = http.server.SimpleHTTPRequestHandler

if __name__ == '__main__':
    port = 5500
    print(f'Serving on http://localhost:{port} (Ctrl-C to stop)')
    http.server.test(HandlerClass=Handler, port=port)
