from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from rag_engine import RAGEngine
from llm_service import llm_service

app = Flask(__name__)
CORS(app)

DATA_PATH = r"C:\xampp\htdocs\Company\training_data\onboarding_data.csv"
rag = RAGEngine(DATA_PATH)
if os.path.exists(DATA_PATH):
    rag.train()
    print("✅ Onboarding RAG loaded")
else:
    print(f"⚠️ Training data not found: {DATA_PATH}")
    rag = None

@app.route('/ask', methods=['POST'])
def ask():
    """
    LLM-POWERED ONBOARDING ASSISTANT
    Uses RAG to retrieve relevant onboarding info and LLM to generate helpful responses
    """
    question = request.json.get('question', '')
    
    if not question:
        return jsonify({"error": "No question provided"}), 400
    
    # If no RAG data, use LLM only
    if rag is None or not hasattr(rag, 'documents') or len(rag.documents) == 0:
        if llm_service.is_available():
            answer = llm_service.generate(
                prompt=question,
                system_message="You are a helpful onboarding assistant. Provide general guidance about starting a new job.",
                temperature=0.7
            )
            return jsonify({
                "answer": answer or "I don't have specific onboarding information available.",
                "mode": "llm_only",
                "llm_provider": llm_service.provider
            })
        else:
            return jsonify({
                "answer": "Onboarding information is not available. Please contact HR.",
                "mode": "fallback"
            })
    
    # RAG + LLM mode
    if llm_service.is_available():
        # STEP 1: Retrieve context from RAG
        rag_results = rag.query(question, k=3)
        
        if not rag_results:
            # No RAG matches, use LLM only
            answer = llm_service.generate(
                prompt=question,
                system_message="You are a helpful onboarding assistant.",
                temperature=0.7
            )
            return jsonify({
                "answer": answer,
                "mode": "llm_only",
                "rag_matches": 0
            })
        
        # STEP 2: Combine RAG context
        context = "\n\n".join([r['content'] for r in rag_results])
        
        # STEP 3: Generate answer using LLM
        answer = llm_service.rag_generate(
            context=context,
            question=question,
            system_message="You are a helpful onboarding assistant. Use the provided information to answer questions about the onboarding process."
        )
        
        return jsonify({
            "answer": answer or context,  # Fallback to raw context if LLM fails
            "mode": "rag_llm",
            "rag_matches": len(rag_results),
            "llm_provider": llm_service.provider,
            "llm_model": llm_service.model
        })
    else:
        # RAG only mode (no LLM)
        rag_results = rag.query(question)
        answer = rag_results[0]['content'] if rag_results else "No information found."
        
        return jsonify({
            "answer": answer,
            "mode": "rag_only",
            "message": "LLM not configured. Showing raw RAG results."
        })

@app.route('/next-steps', methods=['GET'])
def next_steps():
    """Get onboarding next steps"""
    return jsonify({
        "steps": [
            {"id": 1, "task": "Complete IT Setup", "due": "Today", "status": "pending"},
            {"id": 2, "task": "Attend Security Training", "due": "Tomorrow", "status": "pending"},
            {"id": 3, "task": "Meet Your Team", "due": "This Week", "status": "pending"},
            {"id": 4, "task": "Complete HR Paperwork", "due": "This Week", "status": "pending"}
        ]
    })

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    model_status = "loaded" if rag and hasattr(rag, 'documents') and len(rag.documents) > 0 else "not_loaded"
    llm_info = llm_service.get_info()
    
    return jsonify({
        "status": "online",
        "model": model_status,
        "ready": model_status == "loaded",
        "service": "AI Onboarding Assistant (RAG + LLM)",
        "port": 8003,
        "llm_status": llm_info['status'],
        "llm_provider": llm_info['provider'],
        "llm_model": llm_info['model']
    })


if __name__ == '__main__':
    print("🤖 AI Onboarding Assistant (RAG + LLM) starting on port 8003...")
    llm_info = llm_service.get_info()
    if llm_info['available']:
        print(f"✅ LLM Service: {llm_info['provider']} ({llm_info['model']})")
    else:
        print("⚠️ LLM Service: NOT CONFIGURED")
    app.run(port=8003)
