const fs = require('fs');
const path = require('path');
const EmbeddingService = require('./EmbeddingService');

class VectorDBService {
    constructor() {
        this.collection = [];
        this.init();
    }

    init() {
        try {
            // Load the Leaves extracted vector DB
            // In a real scenario, we handle multiple models, but for now focusing on Leaves
            const vectorPath = path.join(__dirname, 'vector_db', 'leaves_vectors_chunk_0.json');

            if (fs.existsSync(vectorPath)) {
                console.log('Loading updated Vector DB from:', vectorPath);
                const data = fs.readFileSync(vectorPath, 'utf8');
                this.collection = JSON.parse(data);
                console.log(`VectorDB: Loaded ${this.collection.length} records into memory.`);
            } else {
                console.warn(`VectorDB: File not found at ${vectorPath}`);
                // Mock some data if missing just so it doesn't crash
                this.collection = [
                    {
                        text: "sick leave policy: 5 days allowed",
                        embedding: EmbeddingService.getEmbedding("sick leave policy: 5 days allowed"),
                        metadata: { decision: "Allowed", reasoning: "Standard policy" }
                    }
                ];
            }
        } catch (error) {
            console.error('VectorDB: Error loading JSON DB:', error.message);
        }
    }

    /**
     * Cosine Similarity
     */
    calculateSimilarity(vecA, vecB) {
        let dotProduct = 0.0;
        let normA = 0.0;
        let normB = 0.0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Search for similar documents
     * @param {string} query 
     * @param {number} nResults 
     */
    async search(query, nResults = 3) {
        const queryEmbedding = EmbeddingService.getEmbedding(query);

        // Calculate scores
        const scoredDocs = this.collection.map(doc => {
            return {
                ...doc,
                score: this.calculateSimilarity(queryEmbedding, doc.embedding)
            };
        });

        // Sort descending
        scoredDocs.sort((a, b) => b.score - a.score);

        // Return top N
        return scoredDocs.slice(0, nResults).map(doc => ({
            document: doc.text,
            metadata: doc.metadata,
            score: doc.score
        }));
    }
}

module.exports = new VectorDBService();
