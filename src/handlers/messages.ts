import type { Bot } from "grammy";
import { db } from "../firebase";
import { t } from "../i18n";

export function registerMessageHandlers(bot: Bot) {
  bot.on("message:text", async (ctx) => {
    const user = ctx.from;
    const chatId = ctx.chat.id.toString();
    const userId = user.id.toString();

    // Create user record if not exists
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      await userRef.set({
        id: userId,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        language_code: user.language_code,
        created_at: new Date().toISOString(),
      });
    }

    // Store message under chatId collection
    const chatRef = db.collection("chats").doc(chatId).collection("messages");
    await chatRef.add({
      user_id: userId,
      text: ctx.message.text,
      date: new Date().toISOString(),
      message_id: ctx.message.message_id,
    });

    const lang = user.language_code;
    console.log(`Received message: ${ctx.message.text}`);
    return ctx.reply(t("contact", lang));
  });
}
