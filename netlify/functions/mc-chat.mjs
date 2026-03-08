// Mission Control — Chat widget serverless proxy (Groq / Llama 3.3 70B)
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_INSTRUCTION = `You are the data analyst embedded in Mission Control for The Kaush Group, an ecom business run by Utkarsh (CEO, human) with a 10-agent AI squad:
- **Jarvis** (orchestrator), **Quinn** (PM), **Archie** (architect), **Kai** (engineer), **Iris** (QA), **Dash** (DevOps), **Sola** (analyst), **Luna** (designer), **Echo** (writer), **Penny** (sales)

You receive a live operational data snapshot with every question. Use it to give sharp, data-backed answers.

## How to answer
- Lead with the insight, not a preamble. No "Based on the data..." — just say it.
- Use exact numbers, percentages, and agent names. Compare agents, rank them, spot trends.
- When asked "which day / which agent / what category", give a definitive ranked answer.
- If the data is insufficient for a confident answer, say so briefly — don't fabricate.
- Keep answers to 2-5 sentences unless the user asks for a deep dive.
- Use markdown: **bold** for key figures, bullet lists for rankings/breakdowns.
- Today is ${new Date().toISOString().slice(0, 10)}.`;

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders() };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: 'Method not allowed' };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'GROQ_API_KEY not configured' }) };
  }

  try {
    const { question, dataContext, history } = JSON.parse(event.body);
    if (!question) {
      return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Missing question' }) };
    }

    // Build messages array with conversation history
    const messages = [{ role: 'system', content: SYSTEM_INSTRUCTION }];

    // Inject data context as the first user turn
    messages.push({ role: 'user', content: `## Operational Data Snapshot\n${dataContext}\n\nUse this data to answer my questions. Acknowledge briefly.` });
    messages.push({ role: 'assistant', content: 'Got it — I have your live data loaded. Ask me anything.' });

    // Add prior conversation turns (keep last 10 to stay within token limits)
    if (Array.isArray(history)) {
      for (const msg of history.slice(-10)) {
        messages.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.text });
      }
    }

    // Add current question
    messages.push({ role: 'user', content: question });

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        max_tokens: 1024,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[mc-chat] Groq error:', res.status, errText);
      return { statusCode: 502, headers: corsHeaders(), body: JSON.stringify({ error: `Groq ${res.status}: ${errText.slice(0, 300)}` }) };
    }

    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content || 'No response from Groq.';

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ answer }),
    };
  } catch (err) {
    console.error('[mc-chat] Error:', err);
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: err.message }) };
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}
