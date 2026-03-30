import os
import urllib.request
import urllib.error

from flask import Flask, render_template, redirect, request, url_for, Response

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

app = Flask(__name__)

if load_dotenv:
    load_dotenv()


def resolve_upstream_api_url():
    """Return the upstream backend URL (server-side only)."""
    explicit = os.getenv("THERON_API_BASE_URL")
    if explicit:
        return explicit.rstrip("/")
    return "http://localhost:8080/api"

# ---------------------------------------------------------------------------
# API proxy — forwards /api/<path> to the upstream backend (avoids CORS)
# ---------------------------------------------------------------------------
_PROXY_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]

@app.route('/api/', defaults={'path': ''}, methods=_PROXY_METHODS)
@app.route('/api/<path:path>', methods=_PROXY_METHODS)
def api_proxy(path):
    upstream = resolve_upstream_api_url()
    url = upstream + '/' + path
    if request.query_string:
        url += '?' + request.query_string.decode('utf-8')

    # Build upstream request
    body = request.get_data() or None
    headers = {
        key: value for key, value in request.headers
        if key.lower() not in ('host', 'content-length', 'transfer-encoding', 'connection')
    }

    req = urllib.request.Request(url, data=body, headers=headers, method=request.method)

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw_body = resp.read()
            status = resp.status
            # Forward safe headers back
            excluded = {
                'content-encoding', 'transfer-encoding', 'connection',
                'keep-alive', 'proxy-authenticate', 'proxy-authorization'
            }
            fwd_headers = [
                (k, v) for k, v in resp.headers.items()
                if k.lower() not in excluded
            ]
            return Response(raw_body, status=status, headers=fwd_headers)
    except urllib.error.HTTPError as exc:
        raw_body = exc.read()
        excluded = {
            'content-encoding', 'transfer-encoding', 'connection',
            'keep-alive', 'proxy-authenticate', 'proxy-authorization'
        }
        fwd_headers = [
            (k, v) for k, v in exc.headers.items()
            if k.lower() not in excluded
        ]
        return Response(raw_body, status=exc.code, headers=fwd_headers)
    except Exception as exc:
        return Response('{"error": "Proxy error"}', status=502, mimetype='application/json')


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/theron-capital')
def theron_capital():
    return render_template('capital.html')

@app.route('/theronseg')
def theronseg():
    return render_template('seg.html')

@app.route('/theron-tour')
def theron_tour():
    return render_template('tour.html')


@app.route('/theron-tour/destinos')
def theron_tour_trips():
    return render_template('theron-tour/trips-list.html')


@app.route('/theron-tour/destinos/<slug>')
def theron_tour_trip_detail(slug):
    return render_template('theron-tour/trip-detail.html', trip_slug=slug)


@app.route('/theron-tour/checkout/<slug>')
def theron_tour_checkout(slug):
    return render_template('theron-tour/checkout.html', trip_slug=slug)

@app.route('/theron-consultoria')
def theron_consultoria():
    return render_template('consultoria.html')


# ---------------------------------------------------------------------------
# Shared Authentication Routes
# ---------------------------------------------------------------------------
@app.route('/auth/login')
def auth_login():
    """Render shared login page."""
    return render_template('auth/login.html')


@app.route('/auth/signup')
def auth_signup():
    """Render shared signup page."""
    return render_template('auth/signup.html')


@app.errorhandler(404)
def page_not_found(e):
    return redirect(url_for('index'))

if __name__ == "__main__":
    app.run()