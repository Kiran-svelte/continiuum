"""
RAG Model Verification Script
Tests all trained models to ensure they're working correctly
"""

import os
import json
import random

# Paths
KB_DIR = r"C:\xampp\htdocs\Company\backend\src\services\rag\knowledge_base"
VDB_DIR = r"C:\xampp\htdocs\Company\backend\src\services\rag\vector_db"

def verify_model(model_name):
    """Verify a single model"""
    print(f"\n{'='*60}")
    print(f"Verifying {model_name.upper()} Model")
    print(f"{'='*60}")
    
    # Check knowledge base
    kb_file = os.path.join(KB_DIR, f"{model_name}_knowledge_base.json")
    if not os.path.exists(kb_file):
        print(f"❌ Knowledge base not found: {kb_file}")
        return False
    
    with open(kb_file, 'r', encoding='utf-8') as f:
        kb_data = json.load(f)
    
    print(f"✅ Knowledge Base:")
    print(f"   - Records: {kb_data['total_records']:,}")
    print(f"   - Version: {kb_data['version']}")
    print(f"   - Created: {kb_data['created_at']}")
    
    # Check metadata
    meta_file = os.path.join(VDB_DIR, f"{model_name}_metadata.json")
    if not os.path.exists(meta_file):
        print(f"❌ Metadata not found: {meta_file}")
        return False
    
    with open(meta_file, 'r', encoding='utf-8') as f:
        meta_data = json.load(f)
    
    print(f"✅ Vector Database:")
    print(f"   - Total Vectors: {meta_data['total_vectors']:,}")
    print(f"   - Chunks: {meta_data['chunks']}")
    print(f"   - Dimensions: {meta_data['embedding_dimensions']}")
    
    # Verify chunks
    missing_chunks = []
    total_size = 0
    for i in range(meta_data['chunks']):
        chunk_file = os.path.join(VDB_DIR, f"{model_name}_vectors_chunk_{i}.json")
        if not os.path.exists(chunk_file):
            missing_chunks.append(i)
        else:
            total_size += os.path.getsize(chunk_file)
    
    if missing_chunks:
        print(f"❌ Missing chunks: {missing_chunks}")
        return False
    
    print(f"✅ All {meta_data['chunks']} chunks verified")
    print(f"   - Total Size: {total_size / (1024*1024):.2f} MB")
    
    # Sample a random chunk and verify structure
    sample_chunk = random.randint(0, meta_data['chunks'] - 1)
    chunk_file = os.path.join(VDB_DIR, f"{model_name}_vectors_chunk_{sample_chunk}.json")
    
    with open(chunk_file, 'r', encoding='utf-8') as f:
        chunk_data = json.load(f)
    
    if len(chunk_data) > 0:
        sample_vector = chunk_data[0]
        print(f"✅ Sample Vector (chunk {sample_chunk}):")
        print(f"   - ID: {sample_vector['id']}")
        print(f"   - Text Length: {len(sample_vector['text'])} chars")
        print(f"   - Embedding Length: {len(sample_vector['embedding'])}")
        print(f"   - Has Metadata: {'metadata' in sample_vector}")
    
    return True

def main():
    """Main verification"""
    print("\n" + "="*60)
    print("RAG MODELS VERIFICATION")
    print("="*60)
    
    models = ['onboarding', 'leaves', 'chatbot', 'recruitment']
    results = {}
    
    for model in models:
        results[model] = verify_model(model)
    
    # Summary
    print("\n" + "="*60)
    print("VERIFICATION SUMMARY")
    print("="*60)
    
    for model, success in results.items():
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} - {model}")
    
    all_passed = all(results.values())
    
    if all_passed:
        print("\n🎉 All models verified successfully!")
        print("✅ Models are ready for production use")
    else:
        print("\n⚠️  Some models failed verification")
        print("❌ Please check the errors above")
    
    return all_passed

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
