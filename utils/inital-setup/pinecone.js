const { Pinecone } = require('@pinecone-database/pinecone');

async function createIndex() {
  try {
    const pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    const indexName = 'news-index';

    // Check if index already exists
    const existing = await pc.listIndexes();
    if (existing.indexes.some(idx => idx.name === indexName)) {
      console.log(`ℹ️ Index '${indexName}' already exists.`);
      return;
    }

    // ✅ Create index in AWS us-east-1 free tier
    await pc.createIndex({
      name: indexName,
      dimension: 1024, // jina-embeddings-v3 output
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1'
        }
      }
    });

    console.log(`✅ Index '${indexName}' created in AWS us-east-1 with 1024 dimensions.`);
  } catch (err) {
    console.error('❌ Error creating index:', err);
  }
}

createIndex();
