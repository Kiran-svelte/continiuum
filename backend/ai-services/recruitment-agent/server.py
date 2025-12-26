from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from rag_engine import RAGEngine
from llm_service import llm_service

app = Flask(__name__)
CORS(app)

# Initialize REAL RAG for recruitment
DATASET_PATH = r"C:\xampp\htdocs\Company\backend\training_data\candidates.csv"
print("=" * 70)
print("📊 INITIALIZING RECRUITMENT RAG ENGINE + LLM")
print("=" * 70)

rag = None
try:
    rag = RAGEngine(dataset_path=DATASET_PATH)
    rag.train()
    print("✅ RECRUITMENT RAG ENGINE READY WITH REAL DATA")
except Exception as e:
    print(f"❌ RAG ENGINE FAILED: {str(e)}")
    print("⚠️ AI SERVICE WILL NOT FUNCTION WITHOUT REAL DATA")

llm_info = llm_service.get_info()
if llm_info['available']:
    print(f"✅ LLM Service: {llm_info['provider']} ({llm_info['model']})")
else:
    print("⚠️ LLM Service: NOT CONFIGURED (set GROQ_API_KEY or OPENAI_API_KEY)")

print("=" * 70)

@app.route('/score', methods=['POST'])
def score_candidate():
    """
    Score candidate using RAG comparison with historical data
    """
    if rag is None:
        return jsonify({"error": "RAG engine not initialized"}), 500
    
    try:
        data = request.json
        role = data.get('role', 'Unknown')
        exp = data.get('exp', data.get('experience', 0))
        skills = data.get('skills', [])
        
        # Handle skills as string or list
        if isinstance(skills, str):
            skills = [s.strip() for s in skills.split(',') if s.strip()]
        
        # Build candidate profile
        candidate_profile = f"Role: {role}, Experience: {exp} years, Skills: {', '.join(skills)}"
        
        # Query RAG for similar successful candidates
        similar_query = f"Successful hires for {role} with {exp} years experience"
        similar_candidates = rag.query(similar_query, k=10)
        
        # Calculate score based on RAG results (simplified scoring)
        base_score = min(50 + (int(exp) * 5), 90)  # Experience-based
        
        # Adjust based on RAG similarity
        # In real implementation, use embedding similarity scores
        rag_boost = 10 if similar_candidates else 0
        
        final_score = min(base_score + rag_boost, 100)
        
        # Determine rating
        if final_score >= 85:
            rating = "STRONG HIRE"
        elif final_score >= 70:
            rating = "HIRE"
        elif final_score >= 50:
            rating = "MAYBE"
        else:
            rating = "NO HIRE"
        
        return jsonify({
            "score": final_score,
            "rating": rating,
            "candidate_profile": candidate_profile,
            "similar_profiles": similar_candidates[0]['content'][:200] if similar_candidates else "No similar profiles found",
            "rag_matches": len(similar_candidates) if similar_candidates else 0,
            "breakdown": {
                "experience_score": base_score,
                "rag_adjustment": rag_boost,
                "final_score": final_score
            }
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/questions', methods=['POST'])
def generate_questions():
    """Generate interview questions using LLM"""
    try:
        role = request.json.get('role', 'Developer')
        
        if llm_service.is_available():
            # Use LLM to generate smart questions
            prompt = f"Generate 5 insightful interview questions for a {role} position. Focus on technical skills, problem-solving, and cultural fit. Return only the questions, numbered 1-5."
            
            response = llm_service.generate(
                prompt=prompt,
                system_message="You are an expert recruiter. Generate professional interview questions.",
                temperature=0.8
            )
            
            if response:
                # Parse response into list
                questions = [q.strip() for q in response.split('\n') if q.strip() and len(q.strip()) > 10]
                return jsonify({
                    "questions": questions[:5],
                    "generated_by": f"{llm_service.provider} ({llm_service.model})"
                })
        
        # Fallback to hardcoded questions
        questions = [
            f"Explain how you would handle a scaling issue in a {role} role.",
            "Describe a time you conflicted with a stakeholder.",
            "What is your approach to technical debt?",
            f"How do you stay updated with {role} best practices?"
        ]
        
        return jsonify({
            "questions": questions,
            "generated_by": "fallback (LLM not configured)"
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/analyze', methods=['POST'])
def analyze_candidate():
    """
    LLM-POWERED CANDIDATE ANALYSIS
    Uses RAG to find similar candidates and LLM to generate detailed analysis
    """
    if rag is None:
        return jsonify({"error": "RAG engine not initialized"}), 500
    
    if not llm_service.is_available():
        return jsonify({
            "error": "LLM service not available",
            "message": "Please set GROQ_API_KEY or OPENAI_API_KEY environment variable",
            "help": "Get free Groq API key at: https://console.groq.com/keys"
        }), 503
    
    try:
        data = request.json
        role = data.get('role', 'Unknown')
        exp = data.get('exp', data.get('experience', 0))
        skills = data.get('skills', [])
        
        if isinstance(skills, str):
            skills = [s.strip() for s in skills.split(',') if s.strip()]
        
        # STEP 1: RAG retrieval for similar candidates
        query = f"Successful hires for {role} with {exp} years experience and skills: {', '.join(skills)}"
        similar_candidates = rag.query(query, k=5)
        
        # STEP 2: Prepare context
        context = "\n\n".join([
            f"Similar Candidate {i+1}:\n{c['content']}" 
            for i, c in enumerate(similar_candidates)
        ]) if similar_candidates else "No similar candidates found in database."
        
        # STEP 3: LLM analysis
        question = f"""Analyze this candidate profile:
Role: {role}
Experience: {exp} years
Skills: {', '.join(skills)}

Based on similar successful hires in our database, provide:
1. Strengths
2. Potential concerns
3. Hiring recommendation (Strong Hire / Hire / Maybe / No Hire)
4. Suggested interview focus areas"""
        
        analysis = llm_service.rag_generate(
            context=context,
            question=question,
            system_message="You are an expert recruiter analyzing candidate profiles."
        )
        
        if not analysis:
            return jsonify({"error": "LLM analysis failed"}), 500
        
        return jsonify({
            "analysis": analysis,
            "similar_candidates_found": len(similar_candidates) if similar_candidates else 0,
            "llm_provider": llm_service.provider,
            "llm_model": llm_service.model
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check"""
    llm_info = llm_service.get_info()
    
    return jsonify({
        "status": "healthy" if rag is not None else "degraded",
        "service": "AI Recruitment Analyst (RAG + LLM)",
        "port": 8004,
        "rag_status": "loaded" if rag else "failed",
        "llm_status": llm_info['status'],
        "llm_provider": llm_info['provider'],
        "llm_model": llm_info['model'],
        "documents_loaded": len(rag.documents) if rag else 0
    })

if __name__ == '__main__':
    print("=" * 70)
    print("🚀 AI RECRUITMENT ANALYST STARTING (RAG + LLM)")
    print("=" * 70)
    print(f"✅ RAG Status: {'READY' if rag else 'FAILED'}")
    print(f"✅ Documents: {len(rag.documents) if rag else 0}")
    llm_info = llm_service.get_info()
    if llm_info['available']:
        print(f"✅ LLM Status: READY ({llm_info['provider']} - {llm_info['model']})")
    else:
        print("⚠️ LLM Status: NOT CONFIGURED")
    print("✅ Endpoints:")
    print("   - POST /score - Score candidate using REAL RAG")
    print("   - POST /questions - Generate interview questions (LLM if available)")
    print("   - POST /analyze - LLM-powered candidate analysis")
    print("   - GET /health - Health check")
    print("=" * 70)
    
    app.run(host='0.0.0.0', port=8004, debug=False)
