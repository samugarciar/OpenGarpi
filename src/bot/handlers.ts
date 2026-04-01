import { Bot } from "grammy";
import { processUserMessage } from "../agent/loop.js";
import { MemoryManager } from "../db/memory.js";
import { transcribeAudio } from "../llm/client.js";
import { config } from "../config.js";
import fs from "fs";
import os from "os";
import path from "path";


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

  // Handle voice messages
  bot.on("message:voice", async (ctx) => {
    const userId = ctx.from!.id;

    // Show "record_voice" action while processing audio
    await ctx.replyWithChatAction("record_voice");

    try {
      const file = await ctx.getFile();
      if (!file.file_path) {
        throw new Error("No file path received from Telegram.");
      }

      const fileUrl = `https://api.telegram.org/file/bot${config.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to download audio file: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      const tmpFilePath = path.join(os.tmpdir(), `${ctx.message.voice.file_id}.ogg`);
      fs.writeFileSync(tmpFilePath, Buffer.from(buffer));

      // Small typing simulation since Groq transcription and Llama reasoning takes time
      const typingInterval = setInterval(() => {
         ctx.replyWithChatAction("typing").catch(() => {});
      }, 4000);

      let transcription = "";
      try {
        transcription = await transcribeAudio(tmpFilePath);
      } finally {
        fs.unlinkSync(tmpFilePath); // Clean up temp file
      }

      const agentResponse = await processUserMessage(userId, transcription);
      
      clearInterval(typingInterval);
      
      const finalReply = `🗨️ _${transcription}_\n\n${agentResponse}`;
      
      try {
        await ctx.reply(finalReply, { parse_mode: "Markdown" });
      } catch (replyError: any) {
        console.warn("Markdown parsing failed, falling back to plain text.", replyError.message);
        await ctx.reply(finalReply); // plain text
      }
    } catch (e) {
      console.error("Error processing voice message:", e);
      await ctx.reply("Hubo un error inesperado al escuchar tu audio.");
    }
  });
}
