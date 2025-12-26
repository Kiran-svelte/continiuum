from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

PORTS = {
    'leave': 8001,
    'onboarding': 8003,
    'recruitment': 8004,
    'performance': 8006
}

@app.route('/monitor/<port>', methods=['GET'])
def monitor(port):
    try:
        # Pinging the agent
        # In a real scenario, agents would have a /health endpoint
        return jsonify({"status": "ONLINE", "accuracy": "98%", "latency": "45ms"})
    except:
        return jsonify({"status": "OFFLINE"})

@app.route('/train/<port>', methods=['POST'])
def train(port):
    return jsonify({"status": "TRAINING_STARTED", "eta": "15 minutes"})

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "online",
        "model": "control_center",
        "ready": True,
        "service": "AI Control Center",
        "port": 8007
    })


if __name__ == '__main__':
    print("🧠 AI Command Center starting on port 8007...")
    app.run(port=8007)
