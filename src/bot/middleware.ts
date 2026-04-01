import { Context, NextFunction } from "grammy";
import { config } from "../config.js";

// Whitelist middleware: silently ignors non-whitelisted user IDs
export async function whitelistMiddleware(ctx: Context, next: NextFunction) {
  const userId = ctx.from?.id;

  if (!userId) {
    console.log("⚠️ Unknown sender ID. Ignoring.");
    return; // Stop processing
  }

  if (!config.ALLOWED_USER_IDS.includes(userId)) {
    console.log(`🛡️ Blocked unauthorized access attempt from User ID: ${userId} (${ctx.from?.username || "no-username"})`);
    // We ignore silently
    return;
  }

  // Allowed!
  await next();
}
