import requests
import json

# Test 1: Health check
print("=== Testing Health Endpoint ===")
try:
    response = requests.get("http://localhost:8001/health", timeout=5)
    print("Status Code:", response.status_code)
    print("Response:", response.json())
except Exception as e:
    print("Error:", str(e))

print("\n=== Testing Quick Check Endpoint ===")
# Test 2: Quick check
url = "http://localhost:8001/quick-check"
data = {
    "text": "I need tomorrow off for a doctor appointment",
    "user_id": 1
}

try:
    response = requests.post(url, json=data, timeout=10)
    print("Status Code:", response.status_code)
    print("Response Text:", response.text[:500])  # First 500 chars
    if response.status_code == 200:
        print("JSON Response:")
        print(json.dumps(response.json(), indent=2))
except Exception as e:
    print("Error:", str(e))
