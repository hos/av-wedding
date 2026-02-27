import { Bot } from "grammy";
import { db } from "./firebase";
import { i18nMiddleware, type I18nContext } from "./i18n";
import { registerCommands } from "./handlers/commands";
import { registerCallbackHandlers } from "./handlers/callbacks";
import { registerConfirmationHandlers } from "./handlers/confirmations";
import { registerAlbumHandlers } from "./handlers/album";
import { registerAdminHandlers } from "./handlers/admin";
import { registerMessageHandlers } from "./handlers/messages";

const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error("BOT_TOKEN is not set in .env");
}

export const bot = new Bot<I18nContext>(token);

// Middleware: add ctx.t() bound to user's language
bot.use(i18nMiddleware());

// Middleware: update user's language_code in Firestore on every interaction
bot.use(async (ctx, next) => {
  const user = ctx.from;
  if (user) {
    const userId = user.id.toString();
    const userRef = db.collection("users").doc(userId);
    await userRef.set(
      {
        id: userId,
        username: user.username ?? "",
        first_name: user.first_name ?? "",
        last_name: user.last_name ?? "",
        language_code: user.language_code ?? "en",
      },
      { merge: true },
    );
  }
  await next();
});

registerCommands(bot);
registerCallbackHandlers(bot);
registerConfirmationHandlers(bot);
registerAlbumHandlers(bot);
registerAdminHandlers(bot);
registerMessageHandlers(bot);

bot.catch((err) => {
  console.error("Bot error:", err);
});
