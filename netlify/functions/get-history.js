const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const userId = event.queryStringParameters.userId;
    
    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'User ID required' })
      };
    }
    
    const DATABASE_URL = process.env.DATABASE_URL;
    
    if (!DATABASE_URL) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Database configuration missing' })
      };
    }
    
    const sql = neon(DATABASE_URL);
    
    const messages = await sql`
      SELECT id, message, sender, created_at
      FROM chat_messages
      WHERE user_id = ${userId}
      ORDER BY created_at ASC
      LIMIT 100
    `;
    
    return {
      statusCode: 200,
      body: JSON.stringify({ messages })
    };
    
  } catch (error) {
    console.error('Get history error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to load history' })
    };
  }
};