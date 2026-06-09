const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { message, userId, history } = JSON.parse(event.body);
    
    const DATABASE_URL = process.env.DATABASE_URL;
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    
    if (!DATABASE_URL) {
      console.error('DATABASE_URL not set');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Database configuration missing' })
      };
    }
    
    const sql = neon(DATABASE_URL);
    
    // Save user message to Neon DB
    await sql`
      INSERT INTO chat_messages (user_id, message, sender, is_read)
      VALUES (${userId}, ${message}, 'user', false)
    `;
    
    let aiResponse = "I'm here with you. Could you tell me more about how you're feeling?";
    
    // Call Groq API if key is available
    if (GROQ_API_KEY) {
      try {
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { 
                role: 'system', 
                content: `You are Dr. Kamau Njoroge, a compassionate and professional university counsellor at Karatina University in Kenya.
                
Guidelines:
- Be warm, empathetic, and professional
- Keep responses to 2-4 sentences
- Ask thoughtful follow-up questions
- Use Kenyan cultural context (HELB loans, family expectations, CATs, semester pressure)
- If student mentions crisis (self-harm, suicide), immediately provide Befrienders Kenya: 0800 723 253 (free, 24/7)
- Never diagnose - provide support and coping strategies
- Maintain confidentiality and trust`
              },
              ...(history || []).slice(-10),
              { role: 'user', content: message }
            ],
            max_tokens: 500,
            temperature: 0.7
          })
        });
        
        const data = await groqResponse.json();
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
          aiResponse = data.choices[0].message.content;
        } else if (data.error) {
          console.error('Groq API error:', data.error);
          // Fallback to rule-based responses
          aiResponse = getFallbackResponse(message);
        }
      } catch (apiError) {
        console.error('Groq API error:', apiError);
        // Fallback to rule-based responses
        aiResponse = getFallbackResponse(message);
      }
    } else {
      // No Groq API key - use rule-based responses
      aiResponse = getFallbackResponse(message);
    }
    
    // Save AI response to Neon DB
    await sql`
      INSERT INTO chat_messages (user_id, message, sender, is_read)
      VALUES (${userId}, ${aiResponse}, 'ai', true)
    `;
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: aiResponse })
    };
    
  } catch (error) {
    console.error('Chat function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process message', details: error.message })
    };
  }
};

// Fallback rule-based responses when Groq API is unavailable
function getFallbackResponse(message) {
  const msg = message.toLowerCase();
  
  if (msg.includes('exam') || msg.includes('test') || msg.includes('study')) {
    return "Exam stress is very common at Karu. Breaking your study into 25-minute Pomodoro sessions can help. Which subject feels most overwhelming right now?";
  } else if (msg.includes('sleep') || msg.includes('tired')) {
    return "Sleep difficulties affect many students. Try keeping your phone away 30 minutes before bed. How many hours are you currently getting?";
  } else if (msg.includes('anxi') || msg.includes('worry') || msg.includes('nervous')) {
    return "Anxiety can feel overwhelming. Here's a grounding technique: name 5 things you can see, 4 you can touch, 3 you can hear. Want to try it with me?";
  } else if (msg.includes('sad') || msg.includes('depress') || msg.includes('hopeless')) {
    return "Thank you for trusting me with this. You don't have to carry this alone. How long have you been feeling this way?";
  } else if (msg.includes('lonely') || msg.includes('alone')) {
    return "Loneliness at university is more common than people admit. Would you like to explore some ways to connect with others on campus?";
  } else if (msg.includes('hello') || msg.includes('hi')) {
    return "Hello! How are you feeling today? I'm here to listen and support you.";
  } else if (msg.includes('helb') || msg.includes('money') || msg.includes('fees')) {
    return "Financial stress is real. Have you spoken to the financial aid office at Karatina University? They have support programs for students.";
  } else if (msg.includes('kill') || msg.includes('suicide') || msg.includes('die')) {
    return "⚠️ I'm very concerned. Please reach out immediately to Befrienders Kenya: 0800 723 253 (free, 24/7). You matter and there are people who want to help you.";
  }
  
  return "Thank you for sharing. Could you tell me more about how that's affecting your studies or daily life at Karatina University?";
}