import type { Bot } from "grammy";
import { InlineKeyboard } from "grammy";
import { db } from "../firebase";
import { t, type I18nContext } from "../i18n";
import { paymentOptions, adminIds } from "../config";

export function registerConfirmationHandlers(bot: Bot<I18nContext>) {
  // User clicks "I've sent the payment" on a payment method
  for (const option of paymentOptions) {
    bot.callbackQuery(`confirm_payment_${option.id}`, async (ctx) => {
      const user = ctx.from;
      const userId = user.id.toString();
      const date = new Date().toISOString();

      // Create confirmation request in Firestore
      const confirmRef = await db.collection("confirmations").add({
        user_id: userId,
        username: user.username ?? "",
        first_name: user.first_name ?? "",
        last_name: user.last_name ?? "",
        language_code: user.language_code,
        payment_method: option.id,
        status: "pending",
        created_at: date,
        confirmed_at: null,
        confirmed_by: null,
      });

      const paymentMethodLabel = t(`payment_${option.id}`, "en");

      // Notify all admin users
      for (const adminId of adminIds) {
        try {
          const adminKeyboard = new InlineKeyboard().text(
            t("btn_admin_confirm", "en"),
            `admin_confirm_${confirmRef.id}`,
          );

          await bot.api.sendMessage(
            adminId,
            t("admin_confirm_request", "en", {
              first_name: user.first_name ?? "",
              last_name: user.last_name ?? "",
              username: user.username ?? "N/A",
              user_id: userId,
              payment_method: paymentMethodLabel,
              date,
            }),
            {
              parse_mode: "Markdown",
              reply_markup: adminKeyboard,
            },
          );
        } catch (err) {
          console.error(`Failed to notify admin ${adminId}:`, err);
        }
      }

      // Confirm to the user
      await ctx.editMessageText(ctx.t("confirm_request_sent"));
      await ctx.answerCallbackQuery();
    });
  }

  // Admin clicks "Confirm payment received"
  bot.callbackQuery(/^admin_confirm_(.+)$/, async (ctx) => {
    const confirmId = ctx.match![1]!;
    const admin = ctx.from;

    const confirmRef = db.collection("confirmations").doc(confirmId);
    const confirmDoc = await confirmRef.get();

    if (!confirmDoc.exists || confirmDoc.data()?.status !== "pending") {
      await ctx.answerCallbackQuery({
        text: t("confirm_already_processed", "en"),
      });
      return;
    }

    const data = confirmDoc.data()!;

    // Update Firestore
    await confirmRef.update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      confirmed_by: admin.id.toString(),
    });

    // Update the admin message to show it's confirmed
    const confirmedText = t("payment_confirmed_admin", "en", {
      username: data.username || "N/A",
      user_id: data.user_id,
      admin_name: admin.first_name ?? admin.username ?? "Admin",
    });
    await ctx.editMessageText(confirmedText, { parse_mode: "Markdown" });

    // Notify the user that payment is confirmed — use fresh language from Firestore
    let userLang = data.language_code;
    try {
      const userDoc = await db.collection("users").doc(data.user_id).get();
      if (userDoc.exists) {
        userLang = userDoc.data()?.language_code ?? userLang;
      }
    } catch {}
    try {
      await bot.api.sendMessage(
        data.user_id,
        t("payment_confirmed_user", userLang),
      );
    } catch (err) {
      console.error(`Failed to notify user ${data.user_id}:`, err);
    }

    await ctx.answerCallbackQuery();
  });
}
