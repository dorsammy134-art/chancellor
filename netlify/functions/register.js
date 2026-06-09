const { neon } = require('@neondatabase/serverless');
const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { fullName, email, yearOfStudy, programme, password } = JSON.parse(event.body);
    
    const DATABASE_URL = process.env.DATABASE_URL;
    
    if (!DATABASE_URL) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Database configuration missing' })
      };
    }
    
    const sql = neon(DATABASE_URL);
    
    // Check if user already exists
    const existing = await sql`
      SELECT id FROM users WHERE email = ${email.toLowerCase()}
    `;
    
    if (existing.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'User already exists. Please sign in.' })
      };
    }
    
    const passwordHash = hashPassword(password);
    
    // Create new user
    const result = await sql`
      INSERT INTO users (email, full_name, password_hash, year_of_study, programme)
      VALUES (${email.toLowerCase()}, ${fullName}, ${passwordHash}, ${yearOfStudy || null}, ${programme || null})
      RETURNING id, email, full_name
    `;
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        user: result[0],
        message: 'Account created successfully!'
      })
    };
    
  } catch (error) {
    console.error('Registration error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Registration failed', details: error.message })
    };
  }
};