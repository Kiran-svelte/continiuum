"""
Enhanced Recruitment AI Service
Port: 8004
Endpoints:
- POST /screen-candidate - AI screening of candidates
- POST /check-bias - Check for bias in interview feedback
- POST /score - Score candidate against job requirements
- POST /ask - Ask recruitment-related questions
- GET /health - Health check
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os
import re

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from rag_engine import RAGEngine
from llm_service import llm_service

app = Flask(__name__)
CORS(app)

# Initialize RAG engine
DATA_PATH = r"C:\xampp\htdocs\Company\backend\training_data\candidates.csv"
rag = None
try:
    rag = RAGEngine(DATA_PATH)
    if os.path.exists(DATA_PATH):
        rag.train()
        print("✅ Recruitment RAG loaded")
except Exception as e:
    print(f"⚠️ RAG Engine init failed: {e}")

print("=" * 60)
print("🎯 RECRUITMENT AI SERVICE - Port 8004")
print("=" * 60)

# Bias detection keywords
POTENTIAL_BIAS_TERMS = {
    'gender': ['he', 'she', 'him', 'her', 'man', 'woman', 'male', 'female', 'guy', 'girl'],
    'age': ['young', 'old', 'mature', 'senior', 'junior', 'experienced', 'fresh', 'millennial', 'boomer'],
    'appearance': ['attractive', 'well-dressed', 'presentable', 'professional looking'],
    'culture': ['culture fit', 'not a fit', 'wouldn\'t fit in', 'different background'],
    'vague_negative': ['gut feeling', 'something off', 'not sure about', 'weird vibe']
}


def calculate_skill_match(candidate_skills, job_skills):
    """Calculate skill match percentage"""
    if not job_skills:
        return 0
    
    candidate_skills_lower = [s.lower() for s in candidate_skills] if candidate_skills else []
    job_skills_lower = [s.lower() for s in job_skills] if job_skills else []
    
    matches = 0
    for job_skill in job_skills_lower:
        for cand_skill in candidate_skills_lower:
            # Check for partial match
            if job_skill in cand_skill or cand_skill in job_skill:
                matches += 1
                break
    
    return min(100, (matches / len(job_skills_lower)) * 100)


def check_text_for_bias(text):
    """Check text for potential bias indicators"""
    if not text:
        return {"has_bias": False, "flags": [], "categories": []}
    
    text_lower = text.lower()
    flags = []
    categories = set()
    
    for category, terms in POTENTIAL_BIAS_TERMS.items():
        for term in terms:
            if term in text_lower:
                flags.append(term)
                categories.add(category)
    
    return {
        "has_bias": len(flags) > 0,
        "flags": list(set(flags)),
        "categories": list(categories),
        "severity": "high" if len(categories) > 1 else "medium" if len(flags) > 0 else "none"
    }


@app.route('/screen-candidate', methods=['POST'])
def screen_candidate():
    """
    AI screening of a candidate against job requirements.
    
    Expected payload:
    {
        "candidate": {
            "skills": ["Python", "JavaScript"],
            "years_of_experience": 5,
            "education": "BS Computer Science",
            "current_role": "Software Engineer"
        },
        "job": {
            "skills_required": ["Python", "React", "AWS"],
            "requirements": "5+ years experience..."
        }
    }
    """
    try:
        data = request.json
        candidate = data.get('candidate', {})
        job = data.get('job', {})
        
        # Parse job skills
        job_skills = job.get('skills_required', [])
        if isinstance(job_skills, str):
            try:
                import json
                job_skills = json.loads(job_skills)
            except:
                job_skills = [s.strip() for s in job_skills.split(',')]
        
        # Get candidate info
        candidate_skills = candidate.get('skills', [])
        experience = candidate.get('years_of_experience', 0)
        education = candidate.get('education', '')
        current_role = candidate.get('current_role', '')
        
        # Calculate match score
        skill_score = calculate_skill_match(candidate_skills, job_skills)
        
        # Experience score (assuming 5 years is ideal)
        exp_score = min(100, (experience / 5) * 100) if experience else 0
        
        # Education score
        edu_score = 70  # Default
        if 'phd' in education.lower() or 'doctorate' in education.lower():
            edu_score = 100
        elif 'master' in education.lower() or 'ms ' in education.lower() or 'mba' in education.lower():
            edu_score = 90
        elif 'bachelor' in education.lower() or 'bs ' in education.lower() or 'ba ' in education.lower():
            edu_score = 80
        
        # Calculate overall match
        match_score = (skill_score * 0.5) + (exp_score * 0.3) + (edu_score * 0.2)
        
        # Generate analysis
        analysis_parts = []
        if skill_score >= 70:
            analysis_parts.append(f"Strong skill alignment ({skill_score:.0f}% match)")
        elif skill_score >= 40:
            analysis_parts.append(f"Partial skill alignment ({skill_score:.0f}% match)")
        else:
            analysis_parts.append(f"Limited skill overlap ({skill_score:.0f}% match)")
        
        if experience >= 5:
            analysis_parts.append(f"{experience} years experience meets requirements")
        elif experience >= 3:
            analysis_parts.append(f"{experience} years experience - slightly below preferred")
        else:
            analysis_parts.append(f"May need additional training ({experience} years exp)")
        
        # Recommendation
        if match_score >= 75:
            recommendation = "STRONGLY RECOMMEND - Move to interview"
            priority = "high"
        elif match_score >= 55:
            recommendation = "RECOMMEND - Consider for phone screen"
            priority = "medium"
        elif match_score >= 35:
            recommendation = "MAYBE - Review application in detail"
            priority = "low"
        else:
            recommendation = "NOT RECOMMENDED - Skills mismatch"
            priority = "none"
        
        return jsonify({
            "match_score": round(match_score, 1),
            "skill_score": round(skill_score, 1),
            "experience_score": round(exp_score, 1),
            "education_score": edu_score,
            "analysis": ". ".join(analysis_parts),
            "recommendation": recommendation,
            "priority": priority,
            "screening_complete": True
        })
        
    except Exception as e:
        return jsonify({
            "match_score": 50,
            "analysis": f"Screening error: {str(e)}",
            "recommendation": "REVIEW MANUALLY",
            "screening_complete": False
        })


@app.route('/check-bias', methods=['POST'])
def check_bias():
    """
    Check interview feedback for potential bias.
    
    Expected payload:
    {
        "feedback": {
            "strengths": "Great technical skills...",
            "concerns": "Not sure about culture fit...",
            "detailed_notes": "..."
        }
    }
    """
    try:
        data = request.json
        feedback = data.get('feedback', {})
        
        # Combine all feedback text
        all_text = " ".join([
            str(feedback.get('strengths', '')),
            str(feedback.get('concerns', '')),
            str(feedback.get('detailed_notes', '')),
            str(feedback.get('recommendation', ''))
        ])
        
        bias_result = check_text_for_bias(all_text)
        
        # Add recommendations if bias detected
        if bias_result['has_bias']:
            recommendations = []
            if 'gender' in bias_result['categories']:
                recommendations.append("Remove gender-specific pronouns. Focus on objective qualifications.")
            if 'age' in bias_result['categories']:
                recommendations.append("Avoid age-related terms. Evaluate based on skills and experience.")
            if 'culture' in bias_result['categories']:
                recommendations.append("Define specific behaviors instead of 'culture fit'. What skills are lacking?")
            if 'vague_negative' in bias_result['categories']:
                recommendations.append("Provide specific, measurable concerns instead of subjective feelings.")
            
            bias_result['recommendations'] = recommendations
            bias_result['warning'] = "Please review and revise feedback to focus on objective, job-related criteria."
        else:
            bias_result['recommendations'] = []
            bias_result['message'] = "No obvious bias indicators detected."
        
        return jsonify(bias_result)
        
    except Exception as e:
        return jsonify({
            "has_bias": False,
            "error": str(e),
            "message": "Could not complete bias check"
        })


@app.route('/score', methods=['POST'])
def score_candidate():
    """
    Score a candidate (simplified endpoint).
    """
    try:
        data = request.json
        role = data.get('role', '')
        skills = data.get('skills', [])
        exp = data.get('exp', data.get('experience', 0))
        
        # Simple scoring
        base_score = 50
        if exp >= 5:
            base_score += 20
        elif exp >= 3:
            base_score += 10
        
        if len(skills) >= 5:
            base_score += 20
        elif len(skills) >= 3:
            base_score += 10
        
        return jsonify({
            "score": min(100, base_score),
            "role": role,
            "recommendation": "Review candidate" if base_score >= 60 else "May not meet requirements"
        })
        
    except Exception as e:
        return jsonify({"score": 50, "error": str(e)})


@app.route('/generate-questions', methods=['POST'])
def generate_questions():
    """
    Generate interview questions based on job role and candidate.
    """
    try:
        data = request.json
        role = data.get('role', 'Software Engineer')
        skills = data.get('skills', [])
        interview_type = data.get('type', 'technical')
        
        # Base questions by type
        questions = {
            "technical": [
                f"Describe your experience with {skills[0] if skills else 'your primary technology'}.",
                "Walk me through a challenging technical problem you solved recently.",
                "How do you approach debugging complex issues?",
                "Describe your testing methodology.",
                "How do you stay current with technology trends?"
            ],
            "behavioral": [
                "Tell me about a time you had to work with a difficult team member.",
                "Describe a situation where you had to meet a tight deadline.",
                "How do you handle disagreements about technical decisions?",
                "Tell me about a project you're particularly proud of.",
                "How do you prioritize competing tasks?"
            ],
            "cultural": [
                "What type of work environment helps you do your best work?",
                "How do you prefer to receive feedback?",
                "Describe your ideal team collaboration style.",
                "What motivates you in your work?",
                "How do you handle ambiguity in projects?"
            ]
        }
        
        selected_questions = questions.get(interview_type, questions['technical'])
        
        return jsonify({
            "questions": selected_questions,
            "interview_type": interview_type,
            "role": role,
            "count": len(selected_questions)
        })
        
    except Exception as e:
        return jsonify({"questions": [], "error": str(e)})


@app.route('/ask', methods=['POST'])
def ask_recruitment():
    """
    Answer recruitment-related questions using RAG + LLM.
    """
    try:
        question = request.json.get('question', '')
        context = request.json.get('context', '')
        
        if not question:
            return jsonify({"answer": "Please provide a question."})
        
        # Try RAG first
        rag_context = ""
        if rag and hasattr(rag, 'query'):
            try:
                results = rag.query(question, k=3)
                if results:
                    rag_context = "\n".join([r.get('content', '') for r in results])
            except:
                pass
        
        combined_context = f"{context}\n{rag_context}".strip()
        
        # Try LLM
        if llm_service.is_available():
            if combined_context:
                answer = llm_service.rag_generate(
                    context=combined_context,
                    question=question,
                    system_message="You are an HR recruitment expert."
                )
            else:
                answer = llm_service.generate(
                    prompt=question,
                    system_message="You are an HR recruitment expert. Answer questions about hiring, interviewing, candidate evaluation, and recruitment best practices.",
                    temperature=0.5
                )
            return jsonify({"answer": answer, "mode": "llm"})
        
        # Fallback responses
        fallback_answers = {
            "interview": "Structured interviews with consistent questions for all candidates reduce bias and improve hiring outcomes. Use scorecards to document responses objectively.",
            "screening": "Effective screening focuses on job-relevant qualifications. Use skills assessments and structured phone screens before in-person interviews.",
            "bias": "To reduce bias: use structured interviews, diverse interview panels, blind resume reviews, and standardized evaluation criteria.",
            "offer": "Competitive offers include: market-rate salary, benefits package, growth opportunities, and clear job expectations. Always get approval before extending."
        }
        
        question_lower = question.lower()
        for key, answer in fallback_answers.items():
            if key in question_lower:
                return jsonify({"answer": answer, "mode": "fallback"})
        
        return jsonify({
            "answer": "I can help with questions about recruiting, interviewing, candidate screening, and hiring decisions. Please provide more details about what you'd like to know.",
            "mode": "fallback"
        })
        
    except Exception as e:
        return jsonify({"answer": f"Error processing question: {str(e)}", "mode": "error"})


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "online",
        "service": "Recruitment AI Service",
        "port": 8004,
        "rag_loaded": rag is not None,
        "llm_available": llm_service.is_available()
    })


if __name__ == '__main__':
    print("🎯 Recruitment AI Service starting on port 8004...")
    app.run(host='0.0.0.0', port=8004, debug=False)
