import urllib.request
import time
import json

def measure_endpoints(email, password, endpoints):
    print(f"Logging in as {email}...")
    login_data = json.dumps({
        "email": email,
        "password": password
    }).encode('utf-8')

    req = urllib.request.Request("http://127.0.0.1:8000/api/v1/auth/login", data=login_data)
    req.add_header('Content-Type', 'application/json')
    try:
        res = urllib.request.urlopen(req)
    except Exception as e:
        print(f"Login failed: {e}")
        return
        
    headers = dict(res.getheaders())
    cookie = None
    for k, v in headers.items():
        if k.lower() == 'set-cookie' and 'texflow_session=' in v:
            cookie = v.split(';')[0]
            break

    if not cookie:
        print("Failed to get cookie")
        return

    for ep in endpoints:
        url = f"http://127.0.0.1:8000{ep}"
        start = time.time()
        try:
            req = urllib.request.Request(url)
            req.add_header('Cookie', cookie)
            res = urllib.request.urlopen(req)
            body = res.read()
            end = time.time()
            print(f"GET {ep}: {end - start:.3f}s (size: {len(body)} bytes)")
        except Exception as e:
            end = time.time()
            print(f"GET {ep}: Failed - {e} in {end - start:.3f}s")

staff_endpoints = [
    "/api/v1/overview",
    "/api/v1/orders",
    "/api/v1/production/board",
    "/api/v1/yarn",
    "/api/v1/rolls",
    "/api/v1/dispatch",
    "/api/v1/people"
]

buyer_endpoints = [
    "/api/v1/buyer/orders"
]

print("--- Staff Measurement ---")
measure_endpoints("owner@everest.demo", "everest2026", staff_endpoints)

print("\n--- Buyer Measurement ---")
measure_endpoints("buyer.madras@everest.demo", "everest2026", buyer_endpoints)
