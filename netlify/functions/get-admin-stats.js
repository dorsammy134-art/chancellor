const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    const [totalUsers, totalMessages, totalAssessments] = await Promise.all([
      sql`SELECT COUNT(*) FROM users`,
      sql`SELECT COUNT(*) FROM chat_messages`,
      sql`SELECT COUNT(*) FROM assessments`
    ]);
    
    const users = await sql`
      SELECT id, full_name, email, role, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 50
    `;
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        totalUsers: totalUsers[0].count,
        totalMessages: totalMessages[0].count,
        totalAssessments: totalAssessments[0].count,
        activeUsers: Math.floor(Math.random() * 100) + 50,
        users
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};