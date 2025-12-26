const axios = require('axios');
const { OLLAMA_API_URL, OLLAMA_MODEL } = require('../../config/constants');
const VectorDBService = require('./VectorDBService');

class RagEngine {
    /**
     * Process a query using RAG
     * @param {string} query User question
     * @param {string} contextCategory Folder/Tag to filter (e.g. 'leaves', 'onboarding')
     */
    async processQuery(query, contextCategory = 'general') {
        // 1. Retrieve relevant info
        const retrievedDocs = await VectorDBService.search(query, 3);
        const contextText = retrievedDocs.map(doc => doc.document).join("\n\n");

        // 2. Construct Prompt
        const prompt = `
      You are an HR AI Assistant for our company.
      Use the following context to answer the user's question. 
      If the answer is not in the context, say "I don't have enough information in my knowledge base."
      
      CONTEXT:
      ${contextText}
      
      USER QUESTION:
      ${query}
      
      ANSWER:
    `;

        // 3. Call LLM
        try {
            const response = await axios.post(`${OLLAMA_API_URL}/api/generate`, {
                model: OLLAMA_MODEL,
                prompt: prompt,
                stream: false
            });

            return {
                answer: response.data.response,
                sources: retrievedDocs.map(d => d.metadata)
            };
        } catch (error) {
            console.error("RAG Engine Error:", error.message);
            return {
                answer: "I am having trouble connecting to my AI brain. Please try again later.",
                sources: []
            };
        }
    }
}

module.exports = new RagEngine();
