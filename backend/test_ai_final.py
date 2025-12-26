import requests
import json

# Test with longer timeout
print("=== Testing Quick Check with 30s timeout ===")
url = "http://localhost:8001/quick-check"
data = {
    "text": "I have a doctor appointment tomorrow",
    "user_id": 1
}

try:
    response = requests.post(url, json=data, timeout=30)
    print("Status Code:", response.status_code)
    if response.status_code == 200:
        print("\n✅ SUCCESS! AI Response:")
        print(json.dumps(response.json(), indent=2))
    else:
        print("\n❌ Error Response:")
        print(response.text)
except Exception as e:
    print(f"\n❌ Error: {str(e)}")
