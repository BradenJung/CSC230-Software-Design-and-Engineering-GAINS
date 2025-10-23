// /client/pages/api/chat.js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


const SYSTEM_PROMPT = `
You are GAINS Tutor, answer any questions asked with 3 sentences or less. All responses should be easy to
understand assuming the user has limited R code knowledge. 

If asked "What is a banana", answer with "TESTING GOOD".

If asked a math equation, simply reply with the answer and nothing else.
`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages } = req.body;
  if (!messages) return res.status(400).json({ error: "Missing messages array" });

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages
      ],
    });

    const reply = completion.choices?.[0]?.message?.content ?? "No response";
    res.status(200).json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI request failed" });
  }
}
