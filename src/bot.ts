import { Bot } from "grammy";
import { registerCommands } from "./handlers/commands";
import { registerCallbackHandlers } from "./handlers/callbacks";
import { registerConfirmationHandlers } from "./handlers/confirmations";
import { registerAdminHandlers } from "./handlers/admin";
import { registerMessageHandlers } from "./handlers/messages";

const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error("BOT_TOKEN is not set in .env");
}

export const bot = new Bot(token);

registerCommands(bot);
registerCallbackHandlers(bot);
registerConfirmationHandlers(bot);
registerAdminHandlers(bot);
registerMessageHandlers(bot);

bot.catch((err) => {
  console.error("Bot error:", err);
});
