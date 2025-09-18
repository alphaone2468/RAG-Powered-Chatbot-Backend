const express = require('express');
const https = require('https');
const { Pinecone } = require('@pinecone-database/pinecone');
const data = require("./data.json")

const app = express();
app.use(express.json());

// ✅ Setup Pinecone client
const pc = new Pinecone({
  apiKey: "pcsk_3ZJ6wm_Mwk7jmE6cCtypXB9tSgt16jNdfrBPPHAzcdkr5Y16i71RHoXKNdv6eQDGrbzwSr", // set in .env
});

// Reference to your index
const index = pc.index('news-index'); // use the index you created

async function insertIntoPinecone({ document, source, title, id }) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'jina-embeddings-v3',
      task: 'text-matching',
      input: [document], // only embedding the document text
    });

    const options = {
      hostname: 'api.jina.ai',
      path: '/v1/embeddings',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer jina_887b92a043214850b1ff64b2da9a1051jDmpw_fES40sziwJRQ35o9f1Crub`
      }
    };

    const jinaReq = https.request(options, (jinaRes) => {
      let response = '';

      jinaRes.on('data', (chunk) => {
        response += chunk;
      });

      jinaRes.on('end', async () => {
        try {
          const parsed = JSON.parse(response);
          console.log('Jina response:', parsed);
          const embedding = parsed.data[0].embedding;
          console.log('Embedding:', embedding);

          const vector = {
            id: id, // unique ID
            values: embedding,
            metadata: { document, source, title }
          };

          await index.upsert([vector]);

          resolve({ message: 'Inserted successfully', vector });
        } catch (err) {
          reject(err);
        }
      });
    });

    jinaReq.on('error', (error) => {
      reject(error);
    });

    jinaReq.write(data);
    jinaReq.end();
  });
}

// ---------- API Endpoint (calls function) ----------
app.get('/seed', async (req, res) => {
  try {

    let results = [];
    for (const doc of data) {
      const result = await insertIntoPinecone({
        id:doc.id,
        document: doc.document,
        source: doc.source,
        title: doc.title,
      });
      results.push(result);
      console.log("inserted document:", doc.id);
    }

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to insert document' });
  }
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
