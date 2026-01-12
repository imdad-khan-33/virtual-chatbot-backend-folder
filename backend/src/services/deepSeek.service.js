import axios from "axios";
import dotenv from "dotenv";
import { ApiError } from "../utils/ApiError.js";

// Load environment variables
dotenv.config();

export async function initialAssessment(questionsAndAnswers, username) {
  const OPENROUTER_API_KEY = process.env.DEEPSEEK_API_KEY;

  // 🔍 DEBUG LOGS (VERY IMPORTANT)
  console.log("====================================");
  console.log("Initial Assessment Started");
  console.log("Username:", username);
  console.log(
    "API KEY PRESENT:",
    !!OPENROUTER_API_KEY
  );
  console.log(
    "API KEY PREVIEW:",
    OPENROUTER_API_KEY
      ? OPENROUTER_API_KEY.slice(0, 10) + "********"
      : "NOT FOUND"
  );
  console.log("====================================");

  // ❌ If API key missing → mock response
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === "your-deepseek-api-key-here") {
    console.log("⚠️ Using MOCK response (API key missing or placeholder)");

    const mockResponse = {
      userName: username,
      severityLevel: "moderate",
      primaryConcerns: ["stress", "anxiety"],
      selfCareActivity: {
        description: "Daily Mindfulness &amp; Journaling Practice",
        details: [
          "Fixed element: 10 minutes every morning after waking up",
          "Variable element: Alternate between guided meditation and journaling",
          "Optional: Share one insight weekly with a trusted person"
        ],
        clinicalRationale:
          "Combining routine with flexibility improves emotional awareness."
      },
      sessionRecommendation: {
        frequency: "weekly",
        totalSessions: 8,
        schedule: "one session per week, total 8 sessions",
        reason:
          "Weekly sessions provide consistent emotional support and progress tracking."
      },
      fullText: `Hello ${username}, thank you for opening up. Healing is like watering a plant—small, regular care leads to steady growth.`
    };

    return { content: JSON.stringify(mockResponse) };
  }

  // 🧠 ENHANCED SYSTEM PROMPT WITH SEVERITY ANALYSIS
  const systemPrompt = `
You are a warm, highly skilled virtual therapist with expertise in mental health assessment and personalized treatment planning.

**CRITICAL RULE:** 
- Response MUST be ONLY the JSON object.
- DO NOT provide any conversational preamble.
- DO NOT provide any "Thought" or "Reasoning" process.
- DO NOT include anything outside the JSON structure.

**Required JSON Structure:**
{
  "userName": "${username}",
  "severityLevel": "mild/moderate/severe",
  "primaryConcerns": ["concern1", "concern2"],
  "selfCareActivity": {
    "description": "Personalized activity title",
    "details": ["specific step 1", "specific step 2", "specific step 3"],
    "clinicalRationale": "Evidence-based explanation."
  },
  "sessionRecommendation": {
    "frequency": "weekly/monthly",
    "totalSessions": [Recommend an exact number (e.g. 5, 7, 10, 15) based on clinical need],
    "duration": "Recommended duration per session (e.g., '30 mins', '45 mins')",
    "schedule": "one session per week/month, total X sessions",
    "reason": "Detailed explanation based on assessment."
  },
  "fullText": "Warm, supportive message with therapeutic metaphor."
}

**SEVERITY ASSESSMENT & SESSION PLANNING (GUIDELINES ONLY):**

1. **MILD (Typically 1-4 sessions)**
   - User shows minor stress or adjustment issues
   - Functioning well in daily life with occasional difficulties
   - Has good support systems
   - Shorter duration (1-2 sessions) acceptable for simple "check-ins" or guidance

2. **MODERATE (Typically 8-12 sessions)**
   - User shows moderate distress affecting daily functioning
   - Multiple areas of concern (work, relationships, sleep, mood)
   - Some coping difficulties but willing to engage

3. **SEVERE (Typically 12+ sessions)**
   - User shows significant distress or impairment
   - Multiple severe symptoms across different areas
   - Limited coping mechanisms
   - Connect with crisis resources if needed

**ANALYSIS CRITERIA:**
- Emotional intensity in responses
- Number of problem areas mentioned
- Impact on daily functioning (work, relationships, self-care)
- Duration of symptoms
- Presence of support systems
- Coping mechanisms mentioned
- Sleep and appetite patterns
- Suicidal ideation or self-harm (always recommend 12 sessions + crisis resources)

**SELF-CARE ACTIVITY GUIDELINES:**
- Must be specific, actionable, and realistic
- Should address primary concerns identified
- Include both fixed and flexible elements
- Consider user's current capacity and resources
`;

  // 🧾 Format user answers
  const formattedAssessment = questionsAndAnswers
    .map((qna) => `${qna.question}\n→ ${qna.answer}`)
    .join("\n\n");

  console.log("Formatted Assessment:\n", formattedAssessment);

  // 👤 USER PROMPT
  const userPrompt = `
Analyze this assessment for ${username} and return ONLY the JSON as per instructions.

User Assessment:
${formattedAssessment}
`;

  try {
    console.log("🚀 Sending request to OpenRouter API...");

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "tngtech/deepseek-r1t-chimera:free",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1
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

    console.log("✅ OpenRouter API Response RECEIVED");

    let assistantMessage = response.data?.choices?.[0]?.message?.content || "";

    // 🛡️ Pre-processing: Remove <thought> blocks if present
    assistantMessage = assistantMessage.replace(/<thought>[\s\S]*?<\/thought>/gi, "").trim();

    console.log("🧠 Assistant Response Preview (Post-processed):");
    console.log(assistantMessage.slice(0, 200) + "...");

    return { content: assistantMessage };

  } catch (error) {
    console.error("❌ OpenRouter API ERROR");
    console.error("Status:", error.response?.status);
    console.error("Data:", error.response?.data || error.message);

    // Return fallback response instead of throwing error
    console.log("⚠️ Using fallback response due to API error");
    const fallbackResponse = {
      userName: username,
      severityLevel: "moderate",
      primaryConcerns: ["general wellness", "stress management"],
      selfCareActivity: {
        description: "Daily Mindfulness &amp; Self-Care Practice",
        details: [
          "Start each morning with 10 minutes of mindful breathing",
          "Keep a gratitude journal - write 3 things you're thankful for",
          "Take short walks in nature when possible"
        ],
        clinicalRationale:
          "Regular mindfulness practice helps reduce stress and anxiety while improving emotional regulation."
      },
      sessionRecommendation: {
        frequency: "weekly",
        totalSessions: 6,
        schedule: "one session per week, total 6 sessions",
        reason:
          "Weekly sessions provide consistent support for building healthy coping mechanisms."
      },
      fullText: `Hello ${username}, thank you for completing the assessment. Your journey to wellness begins with small, consistent steps. I'm here to support you every step of the way.`
    };

    return { content: JSON.stringify(fallbackResponse) };
  }
}

export async function analyzeMoodHistory(moodHistory, username) {
  const OPENROUTER_API_KEY = process.env.DEEPSEEK_API_KEY;

  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === "your-deepseek-api-key-here") {
    return {
      content: JSON.stringify({
        summary: "Your mood seems stable, but keeping a regular log will help identify patterns.",
        triggers: ["Routine changes", "Lack of sleep"],
        tips: ["Try a 5-minute breathing exercise", "Ensure 7+ hours of sleep today"],
        analysis: "Based on pichle kuch dinon ka data, aapka mood behtar ho raha hai."
      })
    };
  }

  const systemPrompt = `
You are a supportive AI therapist assistant. Analyze the user's mood history and notes to identify patterns, triggers, and provide actionable tips.

**Required JSON Structure:**
{
  "summary": "Short summary of recent mood trends",
  "triggers": ["potential trigger 1", "potential trigger 2"],
  "tips": ["actionable tip 1", "actionable tip 2"],
  "analysis": "Detailed emotional analysis in a warm tone"
}

Keep the tone warm and empathetic. If mood is low, prioritize immediate calming tips.
`;

  const formattedHistory = moodHistory
    .map((m) => `Date: ${new Date(m.date).toDateString()}, Mood: ${m.mood}/10, Note: ${m.note || "No note"}`)
    .join("\n");

  const userPrompt = `
User: ${username}
Mood History:
${formattedHistory}

Analyze this and return ONLY the JSON.
`;

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "tngtech/deepseek-r1t-chimera:free",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    let assistantMessage = response.data?.choices?.[0]?.message?.content || "";
    assistantMessage = assistantMessage.replace(/<thought>[\s\S]*?<\/thought>/gi, "").trim();

    return { content: assistantMessage };
  } catch (error) {
    return {
      content: JSON.stringify({
        summary: "We couldn't analyze your history right now, but stay positive!",
        triggers: ["Unknown"],
        tips: ["Drink water", "Take a deep breath"],
        analysis: "AI analysis is temporarily unavailable."
      })
    };
  }
}

