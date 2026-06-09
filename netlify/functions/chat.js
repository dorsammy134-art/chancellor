// netlify/functions/chat.js
// This runs on Netlify's servers - your API key stays SECURE here!

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { message, history } = JSON.parse(event.body);
    
    // Get your API key from Netlify environment variables
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    
    if (!GROQ_API_KEY) {
      console.error('GROQ_API_KEY not set in environment variables');
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          response: "I'm here to help. Could you tell me more about what's on your mind?" 
        })
      };
    }

    // Prepare conversation history for context
    const messages = [
      {
        role: 'system',
        content: `You are Dr. Kamau Njoroge, a compassionate and professional university counsellor at Karatina University in Kenya. 
You are speaking with a student through a confidential mental health support platform.

Your guidelines:
- Be warm, empathetic, and professional
- Keep responses to 2-4 sentences
- Ask thoughtful follow-up questions
- If a student mentions crisis (self-harm, suicide), immediately provide the Befrienders Kenya crisis line: 0800 723 253 (free, 24/7)
- Use Kenyan cultural context where appropriate
- Never diagnose, but provide psychoeducation and coping strategies
- Maintain confidentiality and trust

You are available 24/7 to support students.`
      }
    ];
    
    // Add conversation history for context
    if (history && history.length > 0) {
      for (const msg of history.slice(-8)) { // Last 8 messages for context
        messages.push({
          role: msg.from === 'user' ? 'user' : 'assistant',
          content: msg.text
        });
      }
    }
    
    // Add the current message
    messages.push({ role: 'user', content: message });

    // Call Groq API (FREE tier - 100k tokens/day)
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', // Free, powerful model
        messages: messages,
        max_tokens: 500,
        temperature: 0.7
      })
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('Groq API Error:', data.error);
      throw new Error(data.error.message);
    }
    
    const aiResponse = data.choices?.[0]?.message?.content || 
                       "I'm here with you. Could you tell me more about how you're feeling?";

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: aiResponse })
    };
    
  } catch (error) {
    console.error('Function Error:', error);
    return {
      statusCode: 200, // Return 200 with fallback to avoid breaking the chat
      body: JSON.stringify({ 
        response: "I'm here to support you. Could you please rephrase or tell me more about what you're experiencing?" 
      })
    };
  }
};