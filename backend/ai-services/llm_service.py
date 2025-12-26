# Simplified - LLM only for friendly messages, not decisions

class LLMService:
    """LLM Service wrapper for friendly messages"""
    
    def __init__(self):
        self._available = True
    
    def is_available(self):
        """Check if LLM service is available"""
        return self._available
    
    def generate_friendly_denial(self, reason):
        """Make denial messages polite (optional)"""
        templates = [
            f"I understand you need time off, but {reason.lower()}. Could we find another date?",
            f"Due to {reason.lower()}, I can't approve this leave. You have other options though!",
            f"Team coverage wouldn't allow this ({reason.lower()}). How about next week?"
        ]
        import random
        return random.choice(templates)
    
    def ask_ai_simple(self, question):
        """Only for simple Q&A, NOT for leave decisions"""
        return "For leave approvals, our constraint system automatically checks all company policies."

# Create singleton instance
llm_service = LLMService()

def generate_friendly_denial(reason):
    """
    Make denial messages polite (optional)
    """
    # In production, call OpenAI/Gemini
    # For now, use templates
    templates = [
        f"I understand you need time off, but {reason.lower()}. Could we find another date?",
        f"Due to {reason.lower()}, I can't approve this leave. You have other options though!",
        f"Team coverage wouldn't allow this ({reason.lower()}). How about next week?"
    ]
    import random
    return random.choice(templates)

def ask_ai_simple(question):
    """
    Only for simple Q&A, NOT for leave decisions
    """
    # This is only for questions like "How do I cancel leave?"
    # NOT for "Should this be approved?"
    return "For leave approvals, our constraint system automatically checks all company policies."