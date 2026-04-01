import type { ChatCompletionTool } from "openai/resources/index.js";

// Tool Registry
export const tools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_current_time",
      description: "Gets the current time and date",
      parameters: {
        type: "object",
        properties: {}, // No params needed
        required: [],
      },
    },
  },
];

// Tool Executor
export async function executeTool(name: string, args: Record<string, any>): Promise<string> {
  switch (name) {
    case "get_current_time":
      return new Date().toISOString();
    default:
      console.warn(`Unknown tool called: ${name}`);
      return `Error: Unknown tool ${name}`;
  }
}
