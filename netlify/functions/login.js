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
    const { email, password } = JSON.parse(event.body);
    
    const DATABASE_URL = process.env.DATABASE_URL;
    
    if (!DATABASE_URL) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Database configuration missing' })
      };
    }
    
    const sql = neon(DATABASE_URL);
    const passwordHash = hashPassword(password);
    
    const users = await sql`
      SELECT id, email, full_name, year_of_study, programme, role
      FROM users
      WHERE email = ${email.toLowerCase()} AND password_hash = ${passwordHash}
    `;
    
    if (users.length === 0) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid email or password' })
      };
    }
    
    const user = users[0];
    
    // Update last login
    await sql`
      UPDATE users SET last_login = CURRENT_TIMESTAMP
      WHERE id = ${user.id}
    `;
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.full_name,
          year: user.year_of_study,
          programme: user.programme,
          role: user.role
        }
      })
    };
    
  } catch (error) {
    console.error('Login error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Login failed', details: error.message })
    };
  }
};