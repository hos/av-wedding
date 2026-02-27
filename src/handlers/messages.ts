import type { Bot } from "grammy";
import { db } from "../firebase";
import type { I18nContext } from "../i18n";
import { adminIds } from "../config";
import { isInAlbumMode } from "./album";

export function registerMessageHandlers(bot: Bot<I18nContext>) {
  bot.on("message:text", async (ctx) => {
    // Skip default reply if user is in album upload mode
    if (isInAlbumMode(ctx.from.id)) return;

    const user = ctx.from;
    const chatId = ctx.chat.id.toString();
    const userId = user.id.toString();

    // Store message under chatId collection
    const chatRef = db.collection("chats").doc(chatId).collection("messages");
    await chatRef.add({
      user_id: userId,
      text: ctx.message.text,
      date: new Date().toISOString(),
      message_id: ctx.message.message_id,
    });

    console.log(`Received message: ${ctx.message.text}`);

    // Forward the message to admins
    const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
    const adminText = `💬 *New message*\n\nFrom: ${name}\nUsername: @${user.username || "N/A"}\nUser ID: \`${userId}\`\n\n"${ctx.message.text}"`;
    for (const adminId of adminIds) {
      try {
        await bot.api.sendMessage(adminId, adminText, {
          parse_mode: "Markdown",
        });
      } catch (err) {
        console.error(`Failed to forward message to admin ${adminId}:`, err);
      }
    }

    return ctx.reply(ctx.t("contact"));
  });
}
