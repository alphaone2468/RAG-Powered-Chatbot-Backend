const https = require("https");
const { Pinecone } = require("@pinecone-database/pinecone");

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});
const index = pc.index("news-index");

function getJinaEmbedding(text) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: "jina-embeddings-v3",
      task: "text-matching",
      input: [text],
    });

    const options = {
      hostname: "api.jina.ai",
      path: "/v1/embeddings",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.JINA_API_KEY}`,
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          const embedding = parsed.data[0].embedding;
          resolve(embedding);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on("error", (err) => reject(err));
    req.write(data);
    req.end();
  });
}

// ---- Pinecone Query ----
async function queryPinecone(query) {
  try {
    if (!query) {
      throw new Error("Query is required");
    }

    const queryVector = await getJinaEmbedding(query);

    const results = await index.query({
      vector: queryVector,
      topK: 3,
      includeMetadata: true,
    });

    return results.matches.map((m) => ({
      id: m.id,
      score: m.score,
      document: m.metadata.document,
      source: m.metadata.source,
      title: m.metadata.title,
    }));
  } catch (err) {
    console.error("❌ Error searching:", err);
    throw err;
  }
}

module.exports = {
  getJinaEmbedding,
  queryPinecone,
};
