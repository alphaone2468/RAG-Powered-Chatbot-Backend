const { createClient } = require('redis');
const CONSTANSTS = require('../constants/constants');

const client = createClient({
  url: process.env.REDIS_URL,
});

client.on('connect', () => {
  console.log('Connected to Redis');
});

client.on('error', (err) => {
  console.error('Redis Client Error:', err);
  process.exit(1);
});

client.connect();

const getChatSession = async (sessionId) => {
  try {
    const data = await client.get(`chat_session:${sessionId}`);
    const ttl = await client.ttl(`chat_session:${sessionId}`);
    if(ttl<500){
      updateChatSession(sessionId);
    }
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting chat session:', error);
    return null;
  }
};

const setChatSession = async (sessionId, history) => {
  try {
    await client.setEx(
      `chat_session:${sessionId}`,
      CONSTANSTS.CHAT_SESSION_TTL,
      JSON.stringify(history)
    );
  } catch (error) {
    console.error('Error setting chat session:', error);
    throw error;
  }
};

const deleteChatSession = async (sessionId) => {
  try {
    await client.del(`chat_session:${sessionId}`);
  } catch (error) {
    console.error('Error deleting chat session:', error);
    throw error;
  }
};

const updateChatSession = async (sessionId) => {
  try {
    await client.expire(`chat_session:${sessionId}`, CONSTANSTS.CHAT_SESSION_TTL);
  } catch (error) {
    console.error('Error updating chat session:', error);
    throw error;
  }
}

module.exports = {
  getChatSession,
  setChatSession,
  deleteChatSession,
};
