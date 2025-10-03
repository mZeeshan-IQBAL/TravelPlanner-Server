import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY, // Store in .env for security
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000", // Replace with your site URL
    "X-Title": "TravelPlanner",              // Replace with your app/site name
  },
});

async function main() {
  try {
    const completion = await openai.chat.completions.create({
      model: "openai/gpt-oss-20b:free",
      messages: [
        {
          role: "user",
          content: "What is the meaning of life?",
        },
      ],
    });

    console.log(completion.choices[0].message);
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
