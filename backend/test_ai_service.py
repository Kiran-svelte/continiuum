import requests
import json

# Test the AI service
url = "http://localhost:8001/quick-check"
data = {
    "text": "I have a doctor appointment tomorrow",
    "user_id": 1
}

try:
    response = requests.post(url, json=data, timeout=10)
    print("Status Code:", response.status_code)
    print("Response:")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print("Error:", str(e))
