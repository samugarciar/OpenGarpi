import { MemoryManager } from "../db/memory.js";
import { generateCompletion } from "../llm/client.js";
import { tools, executeTool } from "./tools.js";

const MAX_ITERATIONS = 5;

const systemPrompt = `You are OpenGarpi, a personal AI agent running locally via Telegram.
You are helpful, concise, and smart.
You have tools at your disposal that you can use when requested.`;

export async function processUserMessage(userId: number, text: string): Promise<string> {
  // 1. Add user message to memory
  await MemoryManager.addMessage(userId, { role: "user", content: text });

  // 2. Loop until text response or max iterations
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    // Inject system prompt dynamically at start of history
    const history = await MemoryManager.getHistory(userId, 30);
    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
    ] as any;

    try {
      const response = await generateCompletion(messages, tools);

      if (response.tool_calls && response.tool_calls.length > 0) {
        // AI decided to call tools
        await MemoryManager.addMessage(userId, response); // Save assistant message with tool calls

        for (const toolCall of response.tool_calls) {
          if (toolCall.type === "function") {
            const funcName = toolCall.function.name;
            const funcArgs = JSON.parse(toolCall.function.arguments);
            
            console.log(`🔨 Executing tool [${i+1}/${MAX_ITERATIONS}]: ${funcName}`, funcArgs);
            const toolResult = await executeTool(funcName, funcArgs);
            
            // Save tool result to DB
            await MemoryManager.addMessage(userId, {
              role: "tool",
              tool_call_id: toolCall.id,
              content: toolResult,
            });
          }
        }
        // Loop again because the assistant needs to answer using the tool result
        continue;
      } else {
        // AI answered with text
        const finalAnswer = response.content || "Lo siento, no tengo respuesta a eso.";
        await MemoryManager.addMessage(userId, response); // Save assistant text response
        return finalAnswer;
      }

    } catch (error: any) {
        console.error("Error in agent loop:", error);
        return "Hubo un error al procesar tu mensaje. Revisa los logs.";
    }
  }

  // If we hit the max iterations without returning
  return "He llegado al límite máximo de iteraciones pensando en tu solicitud. Por favor formula la pregunta de otra forma.";
}
