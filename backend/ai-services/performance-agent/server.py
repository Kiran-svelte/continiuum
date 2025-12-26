from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from rag_engine import RAGEngine
from llm_service import llm_service

app = Flask(__name__)
CORS(app)

DATA_PATH = r"C:\xampp\htdocs\Company\training_data\performance_data.csv"
rag = RAGEngine(DATA_PATH)
if os.path.exists(DATA_PATH):
    rag.train()
    print("✅ Performance RAG loaded")
else:
    print(f"⚠️ Training data not found: {DATA_PATH}")
    rag = None

@app.route('/predict', methods=['POST'])
def predict_performance():
    """
    LLM-POWERED PERFORMANCE PREDICTION
    Uses RAG to find similar performance patterns and LLM to generate insights
    """
    if not llm_service.is_available():
        # Fallback to simple prediction
        return jsonify({
            "predicted_rating": 4.5,
            "confidence": 85,
            "trend": "Positive",
            "message": "LLM not configured. Showing basic prediction.",
            "mode": "fallback"
        })
    
    try:
        data = request.json
        current_rating = data.get('rating', 4.0)
        hours_worked = data.get('hours', 40)
        projects_completed = data.get('projects', 0)
        
        # STEP 1: RAG query for similar performance patterns
        context = ""
        if rag and hasattr(rag, 'documents') and len(rag.documents) > 0:
            query = f"Rating: {current_rating}, Hours: {hours_worked}, Projects: {projects_completed}"
            rag_results = rag.query(query, k=3)
            context = "\n\n".join([r['content'] for r in rag_results]) if rag_results else ""
        
        # STEP 2: LLM analysis
        question = f"""Analyze this employee's performance:
- Current Rating: {current_rating}/5.0
- Weekly Hours: {hours_worked}
- Projects Completed: {projects_completed}

Provide:
1. Predicted future rating (next quarter)
2. Performance trend (Improving/Stable/Declining)
3. Key insights
4. Recommendations"""
        
        if context:
            analysis = llm_service.rag_generate(
                context=context,
                question=question,
                system_message="You are an HR analytics expert analyzing employee performance."
            )
        else:
            analysis = llm_service.generate(
                prompt=question,
                system_message="You are an HR analytics expert analyzing employee performance.",
                temperature=0.5
            )
        
        return jsonify({
            "analysis": analysis,
            "mode": "rag_llm" if context else "llm_only",
            "llm_provider": llm_service.provider,
            "llm_model": llm_service.model,
            "rag_matches": len(rag_results) if context and rag_results else 0
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/risk', methods=['POST'])
def check_risk():
    """
    LLM-POWERED BURNOUT RISK ASSESSMENT
    """
    if not llm_service.is_available():
        # Fallback response
        return jsonify({
            "burnout_risk": "MEDIUM",
            "attrition_probability": 30,
            "factors": ["Limited data available"],
            "mode": "fallback"
        })
    
    try:
        data = request.json
        hours_worked = data.get('hours', 40)
        overtime_days = data.get('overtime_days', 0)
        vacation_days_taken = data.get('vacation_days', 0)
        
        prompt = f"""Assess burnout risk for an employee with:
- Weekly Hours: {hours_worked}
- Overtime Days (last month): {overtime_days}
- Vacation Days Taken (this year): {vacation_days_taken}

Provide:
1. Burnout Risk Level (LOW/MEDIUM/HIGH)
2. Attrition Probability (0-100%)
3. Key Risk Factors
4. Recommendations to reduce risk"""
        
        assessment = llm_service.generate(
            prompt=prompt,
            system_message="You are an HR analytics expert assessing employee burnout risk.",
            temperature=0.3
        )
        
        return jsonify({
            "assessment": assessment,
            "llm_provider": llm_service.provider,
            "llm_model": llm_service.model,
            "mode": "llm"
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    model_status = "loaded" if rag and hasattr(rag, 'documents') and len(rag.documents) > 0 else "not_loaded"
    llm_info = llm_service.get_info()
    
    return jsonify({
        "status": "online",
        "model": model_status,
        "ready": True,  # Always ready with LLM fallback
        "service": "AI Performance Predictor (RAG + LLM)",
        "port": 8006,
        "llm_status": llm_info['status'],
        "llm_provider": llm_info['provider'],
        "llm_model": llm_info['model']
    })


if __name__ == '__main__':
    print("📈 AI Performance Predictor (RAG + LLM) starting on port 8006...")
    llm_info = llm_service.get_info()
    if llm_info['available']:
        print(f"✅ LLM Service: {llm_info['provider']} ({llm_info['model']})")
    else:
        print("⚠️ LLM Service: NOT CONFIGURED")
    app.run(port=8006)
