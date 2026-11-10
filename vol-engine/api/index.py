from http.server import BaseHTTPRequestHandler
import json
import urllib.parse
from vol_engine.volatility import calculate_alpha, price_everlasting

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

        spot = float(params.get('spot', [142.5])[0])
        strike = float(params.get('strike', [140.0])[0])
        iv_bps = int(params.get('iv_bps', [5200])[0])
        tau = int(params.get('tau', [86400])[0])
        is_call = params.get('side', ['call'])[0].lower() == 'call'

        alpha = calculate_alpha(iv_bps, tau)
        price = price_everlasting(spot, strike, alpha, is_call)

        response = {
            "status": "healthy",
            "service": "vol-engine",
            "model": "Euler-Cauchy Closed-Form Solver",
            "parameters": {
                "spot": spot,
                "strike": strike,
                "ivBps": iv_bps,
                "tauSeconds": tau,
                "isCall": is_call
            },
            "output": {
                "alpha": round(alpha, 4),
                "markPrice": round(price, 4)
            }
        }
        self.wfile.write(json.dumps(response).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
