const express = require("express");
const cors=require("cors");
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { getChatSession, setChatSession, deleteChatSession } = require("./utils/chat/redisClient.utils");
const { queryPinecone } = require("./utils/chat/pinecone.utils");
const CONSTANSTS = require("./constants/constants.js");

const app = express();
app.use(express.json());
app.use(cors()); 


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post("/api/chat", async (req, res) => {
  try {
    const { query, sessionId } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    const contextMatches = await queryPinecone(query);
    // console.log("Context Matches:", contextMatches);
    const contextText = contextMatches.map((match) =>`Title: ${match.title}\nSource: ${match.source}\nContent: ${match.document}`).join("\n\n");

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    let chat;
    let history;

    const existingHistory = await getChatSession(sessionId);
    
    if (existingHistory) {
      history = existingHistory;

      console.log(history);

      history = history.slice(-20)

      chat = model.startChat({
        history,
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.7,
        },
      });

    } else {
      const systemPrompt = CONSTANSTS.SYSTEM_PROMPT;

      history = [
        {
          role: "user",
          parts: [{ text: systemPrompt }],
        },
        {
          role: "model",
          parts: [
            {
              text: "I understand. I'll help you answer questions using the context from the database and provide clear, simple responses.",
            },
          ],
        },
      ];

      await setChatSession(sessionId, history);

      chat = model.startChat({
        history,
        generationConfig: {
          temperature: 0.7,
        },
      });
    }

    const messageWithContext = `Context from database:\n${contextText}\n\nUser question: ${query}`;

    const updatedHistoryWithUser = [...history, { role: "user", parts: [{ text: query }] }];
    await setChatSession(sessionId, updatedHistoryWithUser);
    
    const result = await chat.sendMessage(messageWithContext);
    const answer = result.response.text();
    
    const finalHistory = [...updatedHistoryWithUser, { role: "model", parts: [{ text: answer }] }];
    await setChatSession(sessionId, finalHistory);

    res.json({
      sessionId,
      answer,
      hasHistory: true,
    });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: "Failed to process request" });
  }
});


app.delete("/api/redis/:id",async(req,res)=>{
  try{
    await deleteChatSession(req.params.id);
    // console.log("chat session removed", req.params.id);
    res.json({ message: "Chat session removed successfully" });
  }
  catch(err){
    console.error("�� Error:", err);
    res.status(500).json({ error: "Failed to remove chat session" });
  }
})

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});