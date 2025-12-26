"""
Enhanced Performance AI Service
Port: 8003
Endpoints:
- POST /analyze-review - Analyze performance review text
- POST /analyze-sentiment - Sentiment analysis for feedback
- POST /predict - Predict performance trends
- POST /ask - Ask performance-related questions
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
DATA_PATH = r"C:\xampp\htdocs\Company\training_data\performance_data.csv"
rag = None
try:
    rag = RAGEngine(DATA_PATH)
    if os.path.exists(DATA_PATH):
        rag.train()
        print("✅ Performance RAG loaded")
except Exception as e:
    print(f"⚠️ RAG Engine init failed: {e}")

print("=" * 60)
print("🎯 PERFORMANCE AI SERVICE - Port 8003")
print("=" * 60)


def extract_score(text, keyword, default=0):
    """Extract numeric score from text"""
    patterns = [
        rf'{keyword}[:\s]+(\d+(?:\.\d+)?)',
        rf'(\d+(?:\.\d+)?)[/\s]+{keyword}',
        rf'{keyword}[:\s]+(\d+)%'
    ]
    for pattern in patterns:
        match = re.search(pattern, text.lower())
        if match:
            return float(match.group(1))
    return default


@app.route('/analyze-review', methods=['POST'])
def analyze_review():
    """
    Analyze a performance review and provide AI insights.
    
    Expected payload:
    {
        "strengths": "Employee shows great leadership...",
        "areas_for_improvement": "Needs to improve communication...",
        "achievements": "Led project that increased revenue...",
        "overall_rating": 4.2
    }
    """
    try:
        data = request.json
        strengths = data.get('strengths', '')
        improvements = data.get('areas_for_improvement', '')
        achievements = data.get('achievements', '')
        rating = data.get('overall_rating', 3.0)
        
        # Build analysis
        analysis = {
            "rating_assessment": "On Track",
            "development_priority": "Medium",
            "promotion_readiness": "Not Yet",
            "key_themes": [],
            "ai_recommendations": [],
            "calibration_flag": False
        }
        
        # Determine rating assessment
        if rating >= 4.5:
            analysis["rating_assessment"] = "Exceptional Performer"
            analysis["promotion_readiness"] = "Ready for Promotion"
            analysis["development_priority"] = "Strategic Growth"
        elif rating >= 3.5:
            analysis["rating_assessment"] = "Strong Performer"
            analysis["promotion_readiness"] = "Developing"
            analysis["development_priority"] = "Medium"
        elif rating >= 2.5:
            analysis["rating_assessment"] = "Meeting Expectations"
            analysis["promotion_readiness"] = "Not Yet"
            analysis["development_priority"] = "High"
        else:
            analysis["rating_assessment"] = "Needs Improvement"
            analysis["promotion_readiness"] = "Performance Plan Required"
            analysis["development_priority"] = "Critical"
            analysis["calibration_flag"] = True
        
        # Extract key themes from text
        positive_keywords = ['leadership', 'innovative', 'proactive', 'collaborative', 
                           'efficient', 'reliable', 'growth', 'excellent', 'outstanding']
        improvement_keywords = ['communication', 'time management', 'delegation', 
                              'technical', 'presentation', 'conflict', 'prioritization']
        
        combined_text = f"{strengths} {achievements}".lower()
        analysis["key_themes"] = [k for k in positive_keywords if k in combined_text][:5]
        
        improvement_text = improvements.lower()
        development_areas = [k for k in improvement_keywords if k in improvement_text][:3]
        
        # Generate recommendations
        if development_areas:
            analysis["ai_recommendations"].append(f"Focus development on: {', '.join(development_areas)}")
        if 'leadership' in combined_text and rating >= 4.0:
            analysis["ai_recommendations"].append("Consider for leadership development program")
        if rating < 3.0:
            analysis["ai_recommendations"].append("Schedule performance improvement discussion")
        if not analysis["ai_recommendations"]:
            analysis["ai_recommendations"].append("Continue current development path")
        
        # Use LLM if available for deeper analysis
        if llm_service.is_available() and (strengths or achievements):
            try:
                prompt = f"""Analyze this performance review briefly:
Strengths: {strengths[:200]}
Achievements: {achievements[:200]}
Rating: {rating}/5

Provide 2-3 actionable insights (50 words max total)."""
                
                llm_insights = llm_service.generate(
                    prompt=prompt,
                    system_message="You are an HR performance analyst. Be concise.",
                    temperature=0.3,
                    max_tokens=100
                )
                if llm_insights:
                    analysis["llm_insights"] = llm_insights
            except:
                pass
        
        return jsonify({
            "success": True,
            "analysis": analysis
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/analyze-sentiment', methods=['POST'])
def analyze_sentiment():
    """
    Analyze sentiment of feedback text.
    
    Expected payload:
    {
        "text": "Great work on the project..."
    }
    """
    try:
        text = request.json.get('text', '')
        
        if not text:
            return jsonify({"sentiment": "neutral", "confidence": 0})
        
        # Simple rule-based sentiment (works without LLM)
        positive_words = ['great', 'excellent', 'amazing', 'fantastic', 'outstanding',
                         'wonderful', 'impressive', 'exceptional', 'brilliant', 'superb',
                         'good', 'well done', 'proud', 'success', 'achievement', 'improved']
        negative_words = ['poor', 'bad', 'disappointing', 'lacking', 'needs improvement',
                         'failed', 'missed', 'below', 'inadequate', 'unsatisfactory',
                         'concern', 'issue', 'problem', 'weak', 'struggle']
        
        text_lower = text.lower()
        positive_count = sum(1 for w in positive_words if w in text_lower)
        negative_count = sum(1 for w in negative_words if w in text_lower)
        
        total = positive_count + negative_count
        if total == 0:
            sentiment = "neutral"
            confidence = 0.5
        elif positive_count > negative_count:
            sentiment = "positive"
            confidence = min(0.95, 0.5 + (positive_count / total) * 0.5)
        elif negative_count > positive_count:
            sentiment = "negative"
            confidence = min(0.95, 0.5 + (negative_count / total) * 0.5)
        else:
            sentiment = "mixed"
            confidence = 0.6
        
        return jsonify({
            "sentiment": sentiment,
            "confidence": round(confidence, 2),
            "positive_indicators": positive_count,
            "negative_indicators": negative_count
        })
        
    except Exception as e:
        return jsonify({"sentiment": "neutral", "error": str(e)})


@app.route('/predict', methods=['POST'])
def predict_performance():
    """
    Predict performance trends based on historical data.
    """
    try:
        data = request.json
        current_rating = data.get('rating', data.get('current_rating', 3.5))
        hours_worked = data.get('hours', 40)
        projects = data.get('projects', data.get('projects_completed', 0))
        tenure_months = data.get('tenure', 12)
        
        # Simple prediction logic
        trend_factors = 0
        
        # Rating momentum
        if current_rating >= 4.0:
            trend_factors += 1
        elif current_rating < 3.0:
            trend_factors -= 1
        
        # Work engagement
        if 35 <= hours_worked <= 50:
            trend_factors += 1
        elif hours_worked > 55:
            trend_factors -= 1  # Burnout risk
        
        # Project delivery
        if projects >= 3:
            trend_factors += 1
        
        # Tenure stability
        if tenure_months >= 12:
            trend_factors += 0.5
        
        # Determine trend
        if trend_factors >= 2:
            trend = "Improving"
            predicted = min(5.0, current_rating + 0.3)
        elif trend_factors <= -1:
            trend = "Declining"
            predicted = max(1.0, current_rating - 0.3)
        else:
            trend = "Stable"
            predicted = current_rating
        
        confidence = min(90, 60 + abs(trend_factors) * 10)
        
        return jsonify({
            "predicted_rating": round(predicted, 1),
            "current_rating": current_rating,
            "trend": trend,
            "confidence": confidence,
            "risk_factors": [],
            "recommendations": [
                "Continue tracking performance metrics",
                "Schedule regular check-ins"
            ]
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/ask', methods=['POST'])
def ask_performance():
    """
    Answer performance-related questions using RAG + LLM.
    """
    try:
        question = request.json.get('question', '')
        
        if not question:
            return jsonify({"answer": "Please provide a question."})
        
        # Try RAG first
        context = ""
        if rag and hasattr(rag, 'query'):
            try:
                results = rag.query(question, k=3)
                if results:
                    context = "\n".join([r.get('content', '') for r in results])
            except:
                pass
        
        # Try LLM
        if llm_service.is_available():
            if context:
                answer = llm_service.rag_generate(
                    context=context,
                    question=question,
                    system_message="You are an HR performance management expert."
                )
            else:
                answer = llm_service.generate(
                    prompt=question,
                    system_message="You are an HR performance management expert. Answer questions about employee performance, reviews, goals, and development.",
                    temperature=0.5
                )
            return jsonify({"answer": answer, "mode": "llm"})
        
        # Fallback responses
        fallback_answers = {
            "goal": "Performance goals should be SMART: Specific, Measurable, Achievable, Relevant, and Time-bound. Set 3-5 goals per review cycle.",
            "review": "Performance reviews should include: accomplishments, areas for improvement, development plans, and ratings. Schedule calibration sessions to ensure fairness.",
            "feedback": "Effective feedback is specific, timely, and actionable. Use the SBI model: Situation, Behavior, Impact.",
            "calibration": "Calibration ensures consistent rating standards across teams. Managers meet to discuss borderline cases and align expectations."
        }
        
        question_lower = question.lower()
        for key, answer in fallback_answers.items():
            if key in question_lower:
                return jsonify({"answer": answer, "mode": "fallback"})
        
        return jsonify({
            "answer": "I can help with questions about performance goals, reviews, feedback, and calibration. Please provide more details about what you'd like to know.",
            "mode": "fallback"
        })
        
    except Exception as e:
        return jsonify({"answer": f"Error processing question: {str(e)}", "mode": "error"})


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "online",
        "service": "Performance AI Service",
        "port": 8003,
        "rag_loaded": rag is not None,
        "llm_available": llm_service.is_available()
    })


if __name__ == '__main__':
    print("🎯 Performance AI Service starting on port 8003...")
    app.run(host='0.0.0.0', port=8003, debug=False)
