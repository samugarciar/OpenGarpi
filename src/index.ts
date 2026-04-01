import { Bot } from "grammy";
import { config } from "./config.js";
import { whitelistMiddleware } from "./bot/middleware.js";
import { setupHandlers } from "./bot/handlers.js";

async function main() {
  console.log("🚀 Iniciando OpenGarpi...");
  
  const bot = new Bot(config.TELEGRAM_BOT_TOKEN);

  // Apply Security Whitelist globally
  bot.use(whitelistMiddleware);

  // Setup message handlers
  setupHandlers(bot);

  // Error handling
  bot.catch((err) => {
    console.error(`Bot Error in ${err.ctx.update.update_id}:`, err.error);
  });

  // Start the bot
  console.log("✅ Bot listo. Esperando mensajes...");
  await bot.start({
    onStart: (botInfo) => {
      console.log(`🤖 Loggeado como @${botInfo.username}`);
      console.log(`🔒 Allowed User IDs: ${config.ALLOWED_USER_IDS.join(", ")}`);
    }
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
