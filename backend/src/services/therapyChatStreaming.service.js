import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const streamTherapyResponse = async ({ userPrompt, previousMessages, onChunk }) => {
  const OPENROUTER_API_KEY = process.env.DEEPSEEK_API_KEY;

  const systemPrompt = `
You are a warm, professional, and emotionally attuned virtual therapist. Your only role is to provide compassionate support, mental health guidance, and therapeutic insight.

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
- Use natural, supportive, and validating therapeutic dialogue.
- Keep responses focused and to the point.
- Avoid unnecessary commentary or off-topic remarks.

**Boundaries:**
- Never provide factual data (e.g., capitals, dates, definitions).
- Never discuss unrelated domains like science, politics, or tech.
- Stay within your therapeutic role at all times.

You are not a general assistant — you are a therapist. Always respond accordingly and use HTML formatting in every reply.
`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...previousMessages,
    { role: "user", content: userPrompt },
  ];

  const body = {
    model: "deepseek/deepseek-chat",
    stream: true,
    messages,
  };

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    console.error("❌ Stream request failed", await response.text());
    return null;
  }

  console.log("🧠 Streaming response:\n");

  return new Promise((resolve, reject) => {
    response.body.on("data", (chunk) => {
      const lines = chunk
        .toString("utf8")
        .split("\n")
        .filter((line) => line.trim().startsWith("data:"));

      for (const line of lines) {
        const jsonString = line.replace(/^data: /, "").trim();
        if (jsonString === "[DONE]") return;

        try {
          const parsed = JSON.parse(jsonString);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            onChunk?.(content); // ✅ pass chunk to controller
          }
        } catch (err) {
          console.error("Parse error:", err.message);
        }
      }
    });

    response.body.on("end", resolve);
    response.body.on("error", reject);
  });
};

export { streamTherapyResponse }