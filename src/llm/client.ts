import OpenAI from "openai";
import { config } from "../config.js";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/index.js";

// Primary: Groq
const groqClient = new OpenAI({
  apiKey: config.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// Fallback: OpenRouter
const openRouterClient = config.OPENROUTER_API_KEY
  ? new OpenAI({
      apiKey: config.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
    })
  : null;

export async function generateCompletion(
  messages: ChatCompletionMessageParam[],
  tools?: ChatCompletionTool[]
) {
  try {
    // Try primary Groq model first
    console.log("🤖 Asking Groq (Llama 3.3 70B)...");
    const response = await groqClient.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      tools,
      tool_choice: tools ? "auto" : "none",
    });
    return response.choices[0].message;
  } catch (error: any) {
    console.warn(`⚠️ Groq API failed: ${error.message}`);

    if (openRouterClient) {
      console.log(`Fallback: Using OpenRouter (${config.OPENROUTER_MODEL})...`);
      try {
        const fallbackResponse = await openRouterClient.chat.completions.create({
          model: config.OPENROUTER_MODEL,
          messages,
          tools,
          tool_choice: tools ? "auto" : "none",
        });
        return fallbackResponse.choices[0].message;
      } catch (fallbackError: any) {
        console.error(`❌ OpenRouter API also failed: ${fallbackError.message}`);
        throw new Error("All LLM providers failed.");
      }
    } else {
      throw error;
    }
  }
}
