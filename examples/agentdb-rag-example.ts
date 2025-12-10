/**
 * AgentDB RAG Pipeline Example
 *
 * This example demonstrates how to use the AgentDB vector search module
 * to build a Retrieval Augmented Generation (RAG) system.
 *
 * Features demonstrated:
 * - Document ingestion with automatic chunking
 * - Semantic search with OpenAI embeddings
 * - Context retrieval for LLM augmentation
 * - Hybrid search with metadata filtering
 * - Multi-query retrieval for better coverage
 */

import {
  setupRAG,
  createOpenAIProvider,
  createRAGPipeline,
  createDocumentProcessor,
  createVectorStore,
  type RAGConfig,
  type DocumentMetadata,
  DEFAULTS,
} from '../src/lib/agentdb';

// ============================================================================
// Example 1: Quick Setup with setupRAG()
// ============================================================================

async function quickSetupExample() {
  console.log('=== Quick Setup Example ===\n');

  // The simplest way to get started - just provide a database path
  const rag = await setupRAG({
    dbPath: '.agentdb/knowledge.db',
    openaiApiKey: process.env.OPENAI_API_KEY,
    // Optional customization
    chunkSize: 1000,
    chunkOverlap: 200,
    defaultLimit: 5,
    defaultMinScore: 0.7,
  });

  // Ingest some documents
  await rag.ingestText(
    `Machine learning is a subset of artificial intelligence that enables
    computers to learn from data without being explicitly programmed.
    It uses algorithms to identify patterns in data and make predictions
    or decisions based on those patterns.`,
    {
      source: 'ml-intro.txt',
      category: 'technology',
      topic: 'machine-learning',
    }
  );

  await rag.ingestText(
    `Deep learning is a subset of machine learning that uses neural networks
    with many layers (hence "deep") to analyze complex patterns in data.
    It has revolutionized fields like computer vision and natural language
    processing.`,
    {
      source: 'dl-intro.txt',
      category: 'technology',
      topic: 'deep-learning',
    }
  );

  // Query for relevant context
  const context = await rag.query({
    query: 'What is the relationship between AI and machine learning?',
    topK: 3,
    minScore: 0.7,
    includeSources: true,
  });

  console.log('Query Results:');
  console.log('- Chunks found:', context.chunks.length);
  console.log('- Token count:', context.tokenCount);
  console.log('- Search time:', context.searchMetadata.searchTimeMs, 'ms');
  console.log('\nContext for LLM:');
  console.log(context.contextText);

  await rag.close();
}

// ============================================================================
// Example 2: Custom Configuration with createRAGPipeline()
// ============================================================================

async function customConfigExample() {
  console.log('\n=== Custom Configuration Example ===\n');

  // Create a custom embedding provider
  const embeddingProvider = createOpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY,
    model: 'text-embedding-ada-002',
  });

  // Full configuration control
  const config: RAGConfig = {
    vectorStore: {
      dbPath: '.agentdb/custom-rag.db',
      dimensions: DEFAULTS.OPENAI_DIMENSIONS, // 1536
      quantization: 'scalar', // 4x memory reduction
      cacheSize: 2000,
      enableHNSW: true,
      hnswM: 16,
      hnswEfSearch: 100,
    },
    embedding: embeddingProvider.getConfig(),
    chunking: {
      chunkSize: 500,
      chunkOverlap: 100,
      strategy: 'semantic', // Smart chunking based on document structure
      minChunkSize: 50,
    },
    searchDefaults: {
      limit: 10,
      minScore: 0.75,
      useMMR: true, // Maximal Marginal Relevance for diverse results
      mmrLambda: 0.7, // Balance between relevance and diversity
    },
  };

  const rag = await createRAGPipeline(config, embeddingProvider);

  // Ingest structured documentation
  const docs = [
    {
      text: `# API Reference

## Authentication
All API requests require authentication using Bearer tokens.
Include the token in the Authorization header.

## Endpoints
- GET /api/users - List all users
- POST /api/users - Create a new user
- GET /api/users/:id - Get user by ID`,
      metadata: { source: 'api-docs.md', category: 'documentation', type: 'api' },
    },
    {
      text: `# Getting Started Guide

## Installation
Run \`npm install our-sdk\` to install the SDK.

## Quick Start
1. Import the SDK
2. Initialize with your API key
3. Make your first API call`,
      metadata: { source: 'getting-started.md', category: 'documentation', type: 'guide' },
    },
  ];

  await rag.ingestTexts(docs);

  // Query with metadata filtering
  const apiContext = await rag.query({
    query: 'How do I authenticate API requests?',
    topK: 3,
    filters: { type: 'api' }, // Only search API documentation
  });

  console.log('API Documentation Results:');
  console.log(apiContext.contextText);

  await rag.close();
}

// ============================================================================
// Example 3: Advanced Search Patterns
// ============================================================================

async function advancedSearchExample() {
  console.log('\n=== Advanced Search Patterns Example ===\n');

  const rag = await setupRAG({
    dbPath: '.agentdb/advanced.db',
    openaiApiKey: process.env.OPENAI_API_KEY,
  });

  // Ingest diverse content
  const documents = [
    { text: 'Python is excellent for data science and machine learning.', metadata: { lang: 'python' } },
    { text: 'JavaScript powers modern web applications and Node.js servers.', metadata: { lang: 'javascript' } },
    { text: 'Rust provides memory safety without garbage collection.', metadata: { lang: 'rust' } },
    { text: 'Python has extensive libraries like NumPy and Pandas for data analysis.', metadata: { lang: 'python' } },
    { text: 'TypeScript adds static typing to JavaScript for better developer experience.', metadata: { lang: 'typescript' } },
  ];

  await rag.ingestTexts(documents);

  // 1. Basic semantic search
  console.log('1. Basic Semantic Search:');
  const basicResult = await rag.query({
    query: 'programming language for data science',
    topK: 2,
    minScore: 0.5,
  });
  console.log('Found:', basicResult.chunks.map((c) => c.document.content).join('\n'));

  // 2. Hybrid search with keywords
  console.log('\n2. Hybrid Search (semantic + keywords):');
  const hybridResult = await rag.hybridQuery(
    { query: 'programming language', topK: 3, minScore: 0.3 },
    ['Python', 'data'] // Must contain these keywords
  );
  console.log('Found:', hybridResult.chunks.map((c) => c.document.content).join('\n'));

  // 3. Multi-query retrieval
  console.log('\n3. Multi-Query Retrieval:');
  const multiResult = await rag.multiQuery(
    ['web development', 'frontend programming', 'JavaScript frameworks'],
    { topK: 3, minScore: 0.3 }
  );
  console.log('Found:', multiResult.chunks.map((c) => c.document.content).join('\n'));

  await rag.close();
}

// ============================================================================
// Example 4: Using VectorStore Directly
// ============================================================================

async function vectorStoreDirectExample() {
  console.log('\n=== Direct VectorStore Usage Example ===\n');

  const embeddingProvider = createOpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Create vector store directly for more control
  const store = createVectorStore({
    dbPath: '.agentdb/vectors.db',
    dimensions: DEFAULTS.OPENAI_DIMENSIONS,
    quantization: 'binary', // 32x memory reduction
    cacheSize: 1000,
  });

  await store.initialize();
  store.setEmbeddingProvider(embeddingProvider);

  // Store documents with pre-computed embeddings
  const text1 = 'The quick brown fox jumps over the lazy dog.';
  const embedding1 = (await embeddingProvider.embed(text1)).embedding;

  await store.store({
    id: 'doc-1',
    content: text1,
    embedding: embedding1,
    metadata: {
      source: 'test.txt',
      category: 'example',
    },
  });

  // Search by text (uses embedding provider)
  const results = await store.searchByText('fast animal jumping', {
    limit: 5,
    minScore: 0.5,
  });

  console.log('Search Results:');
  results.results.forEach((r) => {
    console.log(`- [${r.score.toFixed(3)}] ${r.document.content}`);
  });

  // Get store statistics
  const stats = await store.getStats();
  console.log('\nStore Statistics:');
  console.log('- Total documents:', stats.totalDocuments);
  console.log('- Index type:', stats.indexType);
  console.log('- Cache hit rate:', (stats.cacheHitRate * 100).toFixed(1), '%');

  await store.close();
}

// ============================================================================
// Example 5: Document Processing
// ============================================================================

async function documentProcessingExample() {
  console.log('\n=== Document Processing Example ===\n');

  // Different chunking strategies
  const strategies = ['fixed', 'sentence', 'paragraph', 'semantic'] as const;

  const longDocument = `
# Introduction to Machine Learning

Machine learning is a branch of artificial intelligence that focuses on building systems that learn from data.

## Types of Machine Learning

### Supervised Learning
Supervised learning uses labeled data to train models. Common algorithms include linear regression, decision trees, and neural networks.

### Unsupervised Learning
Unsupervised learning finds patterns in unlabeled data. Clustering and dimensionality reduction are key techniques.

### Reinforcement Learning
Reinforcement learning trains agents through rewards and penalties. It's used in robotics and game playing.

## Applications

Machine learning powers many modern applications:
- Image recognition
- Natural language processing
- Recommendation systems
- Autonomous vehicles
`;

  for (const strategy of strategies) {
    const processor = createDocumentProcessor({
      chunkSize: 200,
      chunkOverlap: 50,
      strategy,
      minChunkSize: 30,
    });

    const doc = processor.createDocument(longDocument, { source: 'ml-intro.md' });
    const chunks = processor.chunk(doc);

    console.log(`\n${strategy.toUpperCase()} Strategy: ${chunks.length} chunks`);
    chunks.slice(0, 2).forEach((chunk, i) => {
      console.log(`  Chunk ${i + 1} (${chunk.content.length} chars): "${chunk.content.slice(0, 50)}..."`);
    });
  }
}

// ============================================================================
// Example 6: Building a Simple Chatbot with RAG
// ============================================================================

async function ragChatbotExample() {
  console.log('\n=== RAG Chatbot Example ===\n');

  const rag = await setupRAG({
    dbPath: '.agentdb/chatbot.db',
    openaiApiKey: process.env.OPENAI_API_KEY,
  });

  // Ingest knowledge base
  const knowledgeBase = [
    {
      text: 'Our company was founded in 2020 and is headquartered in San Francisco.',
      metadata: { category: 'company', topic: 'about' },
    },
    {
      text: 'We offer three pricing plans: Free, Pro ($10/month), and Enterprise (custom pricing).',
      metadata: { category: 'pricing', topic: 'plans' },
    },
    {
      text: 'Our support hours are Monday to Friday, 9 AM to 6 PM PST. Email support@example.com.',
      metadata: { category: 'support', topic: 'contact' },
    },
    {
      text: 'To reset your password, go to Settings > Security > Reset Password.',
      metadata: { category: 'support', topic: 'account' },
    },
  ];

  await rag.ingestTexts(knowledgeBase);

  // Simulate chatbot queries
  const userQueries = [
    'How much does the Pro plan cost?',
    'When can I contact support?',
    'How do I change my password?',
  ];

  for (const query of userQueries) {
    console.log(`User: ${query}`);

    const context = await rag.query({
      query,
      topK: 2,
      minScore: 0.6,
      includeSources: false,
    });

    // In a real chatbot, you would send this context to an LLM
    // Here we just show what context was retrieved
    console.log(`Bot Context: ${context.contextText}\n`);

    // Example LLM prompt you would construct:
    // const prompt = `Answer the user's question using only the following context.
    // If the answer is not in the context, say "I don't have that information."
    //
    // Context:
    // ${context.contextText}
    //
    // User Question: ${query}
    //
    // Answer:`;
  }

  await rag.close();
}

// ============================================================================
// Run Examples
// ============================================================================

async function main() {
  console.log('AgentDB RAG Pipeline Examples');
  console.log('============================\n');

  if (!process.env.OPENAI_API_KEY) {
    console.log('Note: Set OPENAI_API_KEY environment variable to run these examples.\n');
    console.log('Example: export OPENAI_API_KEY=sk-your-key-here\n');

    // Run the document processing example which doesn't need API
    await documentProcessingExample();
    return;
  }

  try {
    await quickSetupExample();
    await customConfigExample();
    await advancedSearchExample();
    await vectorStoreDirectExample();
    await documentProcessingExample();
    await ragChatbotExample();
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run if called directly
main().catch(console.error);
