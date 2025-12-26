module.exports = {
    OLLAMA_API_URL: process.env.OLLAMA_API_URL || 'http://localhost:11434',
    OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'llama3', // or your preferred model
    CHROMA_URL: process.env.CHROMA_URL || 'http://localhost:8000',
    EMBEDDING_MODEL: 'nomic-embed-text', // Common open source embedding model

    PATHS: {
        POLICIES: './src/data/policies',
        TRAINING: './src/data/training',
        VECTOR_DB: './src/data/vector_db'
    }
};
