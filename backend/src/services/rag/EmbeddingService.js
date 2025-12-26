const crypto = require('crypto');

class EmbeddingService {
    /**
     * Generate a deterministic embedding vector matching the Python SimpleEmbedding
     * @param {string} text 
     * @param {number} dimensions 
     * @returns {number[]}
     */
    getEmbedding(text, dimensions = 384) {
        // Hash for deterministic embedding
        const hash = crypto.createHash('sha256').update(text).digest();

        let vector = [];
        for (let i = 0; i < dimensions; i++) {
            const byteVal = hash[i % hash.length];
            // Normalize to [-1, 1]
            vector.push((byteVal / 255.0) * 2 - 1);
        }

        // Normalize vector (L2 norm)
        const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));

        if (magnitude > 0) {
            vector = vector.map(val => val / magnitude);
        }

        return vector;
    }
}

module.exports = new EmbeddingService();
