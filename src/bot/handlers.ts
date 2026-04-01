import { Bot } from "grammy";
import { processUserMessage } from "../agent/loop.js";
import { MemoryManager } from "../db/memory.js";

export function setupHandlers(bot: Bot) {
  // Command to clear memory
  bot.command("start", async (ctx) => {
    await ctx.reply("¡Hola! Soy OpenGarpi, tu agente personal. Estoy listo para ayudarte.");
  });

  bot.command("clear", async (ctx) => {
    const userId = ctx.from!.id;
    await MemoryManager.clearHistory(userId);
    await ctx.reply("🧹 Memoria limpiada. Empezamos desde cero.");
  });

  // Handle all text messages
  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text;
    const userId = ctx.from!.id;

    // Show "typing..." action while processing
    await ctx.replyWithChatAction("typing");

    try {
      // Small typing simulation to keep telegram action alive since Llama reasoning takes time
      const typingInterval = setInterval(() => {
         ctx.replyWithChatAction("typing").catch(() => {});
      }, 4000);

      const response = await processUserMessage(userId, text);
      
      clearInterval(typingInterval);
      
      try {
        await ctx.reply(response, { parse_mode: "Markdown" });
      } catch (replyError: any) {
        console.warn("Markdown parsing failed, falling back to plain text.", replyError.message);
        await ctx.reply(response);
      }
    } catch (e) {
      console.error("Error processing user message:", e);
      await ctx.reply("Hubo un error inesperado al procesar tu solicitud.");
    }
  });
}
