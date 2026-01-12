import axios from "axios";
import { ApiError } from "../utils/ApiError.js";

export const getAiTherapyResponse = async ({ userPrompt, previousMessages, userContext = null }) => {
  const OPENROUTER_API_KEY = process.env.DEEPSEEK_API_KEY;
  if (!OPENROUTER_API_KEY) {
    throw new ApiError(500, "DeepSeek API key not configured");
  }

  // 🧠 Build context-aware system prompt
  let contextSection = "";
  if (userContext) {
    contextSection = `

**USER CONTEXT (Use this to personalize your responses):**
${userContext.severityLevel ? `- Severity Level: ${userContext.severityLevel}` : ''}
${userContext.primaryConcerns ? `- Primary Concerns: ${userContext.primaryConcerns.join(', ')}` : ''}
${userContext.currentSession ? `- Current Session: ${userContext.currentSession} of ${userContext.totalSessions}` : ''}
${userContext.selfCareActivity ? `- Recommended Self-Care: ${userContext.selfCareActivity}` : ''}

**IMPORTANT:** 
- Reference their specific concerns naturally in your responses when relevant
- Acknowledge their progress through sessions if applicable
- Tailor coping strategies to their severity level
- Be mindful of their primary concerns when offering guidance
`;
  }

  const systemPrompt = `
You are a warm, professional, and emotionally attuned virtual therapist. Your only role is to provide compassionate support, mental health guidance, and therapeutic insight.
${contextSection}
**Core Principles:**
- Respond ONLY to therapy-related topics such as:
  - Emotional health
  - Anxiety, stress, or depression
  - Self-esteem and self-care
  - Boundaries and relationships
  - Mental wellness and behavioral patterns
  - Coping strategies and thought processing

- If the user asks any non-therapy related question (e.g., trivia, facts, tech help, news), gently redirect with:
  <p>I'm here to support your mental and emotional wellbeing. I don't provide information on that topic. Is there something you're feeling or thinking you'd like to talk about?</p>

**Response Format:**
- Format all responses in clean, readable HTML for web display.
- Use the following tags:
  - <p> for paragraphs
  - <strong> for emphasis
  - <ul> or <ol> with <li> for bullet or numbered lists
  - <br> only for soft line breaks inside a paragraph (if needed)
- Do not include any raw line breaks or newline characters (\\n) in the output. Use HTML tags only.

**Response Style:**
- Natural, supportive, and validating therapeutic dialogue.
- Focused and to the point.
- Avoid unnecessary commentary or off-topic remarks.
- **NEVER repeat the same sentence or message content twice in one response.**
${userContext ? '- Reference their assessment context naturally when relevant' : ''}

**Boundaries:**
- Never provide factual data (e.g., capitals, dates, definitions).
- Never discuss unrelated domains like science, politics, or tech.
- Stay within your therapeutic role at all times.

You are not a general assistant — you are a therapist. Always respond accordingly and use HTML formatting in every reply.
`;


  const messages = [
    { role: "system", content: systemPrompt },
    ...previousMessages.map(msg => ({ role: msg.role, content: msg.content })),
    { role: "user", content: userPrompt },
  ];
  try {
    console.log("📡 Calling OpenRouter for Therapy Chat (Gemini Flash)...");
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "google/gemini-2.0-flash-lite-preview-02-05:free",
        messages,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:5173",
          "X-Title": "Virtual Therapist"
        },
        timeout: 60000 // 60 second timeout
      }
    );

    let therapyChatResponse = response.data.choices?.[0]?.message?.content || "";
    console.log("✅ Received response from AI");

    // Remove <thought> tags
    therapyChatResponse = therapyChatResponse.replace(/<thought>[\s\S]*?<\/thought>/gi, "").trim();

    // Deduplicate if needed (simple check for identical repeated paragraphs/sentences)
    const sentences = therapyChatResponse.split(/(?<=[.?!])\s+/);
    const uniqueSentences = [...new Set(sentences)];
    if (uniqueSentences.length < sentences.length) {
      therapyChatResponse = uniqueSentences.join(" ");
    }

    return therapyChatResponse;
  } catch (error) {
    console.error("❌ ========================================");
    console.error("❌ OpenRouter API FAILED - Detailed Error:");
    console.error("❌ ========================================");

    if (error.response) {
      // API responded with error
      console.error("❌ Status Code:", error.response.status);
      console.error("❌ Error Data:", JSON.stringify(error.response.data, null, 2));
      console.error("❌ Headers:", error.response.headers);
    } else if (error.request) {
      // Request made but no response
      console.error("❌ No response received from API");
      console.error("❌ Request:", error.request);
    } else {
      // Error in setting up request
      console.error("❌ Error Message:", error.message);
    }

    console.error("❌ Full Error:", error);
    console.error("❌ ========================================");

    // Return a supportive fallback message instead of throwing error
    console.log("⚠️ Using fallback therapeutic response");
    return `<p>I hear you, and I'm here to support you. Sometimes our connection experiences a brief interruption, but your feelings and thoughts are important.</p><p>Could you share a bit more about what's on your mind? I'm listening and want to understand what you're experiencing.</p>`;
  }
};



export const generateTitleFromPrompt = async (userPrompt) => {
  const OPENROUTER_API_KEY = process.env.DEEPSEEK_API_KEY;
  if (!OPENROUTER_API_KEY) {
    throw new ApiError(500, "DeepSeek API key not configured");
  }

  const titleSystemPrompt = `
You are an assistant that generates short, relevant titles for therapy sessions based on the user's first message.
- Respond with a concise and emotionally relevant title (2–5 words).
- Do not include quotes, punctuation, or extra text.
- No formatting, just raw text.
- Base the title on the emotional or mental theme of the prompt.

Example:
User prompt: "I've been feeling really anxious about work lately"
Title: Anxiety About Work Stress
`;

  const messages = [
    { role: "system", content: titleSystemPrompt },
    { role: "user", content: userPrompt },
  ];

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "google/gemini-2.0-flash-lite-preview-02-05:free",
        messages,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const rawTitle = response.data.choices?.[0]?.message?.content?.trim();
    return rawTitle || "Therapy Session";
  } catch (error) {
    console.error("Title Generation Error:", error.response?.data || error.message);
    return "Therapy Session";
  }
};
