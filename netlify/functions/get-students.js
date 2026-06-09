const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    const students = await sql`
      SELECT id, full_name, email, year_of_study, programme, created_at
      FROM users
      WHERE role = 'student'
      ORDER BY created_at DESC
    `;
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};