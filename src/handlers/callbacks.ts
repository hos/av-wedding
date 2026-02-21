import type { Bot } from "grammy";
import { InlineKeyboard } from "grammy";
import { t } from "../i18n";
import { paymentOptions } from "../config";
import { buildWelcomeKeyboard } from "./commands";

export function registerCallbackHandlers(bot: Bot) {
  // Show payment options list
  bot.callbackQuery("show_payment_options", async (ctx) => {
    const lang = ctx.from?.language_code;
    const keyboard = new InlineKeyboard();

    for (const option of paymentOptions) {
      keyboard
        .text(t(`payment_${option.id}`, lang), `payment_${option.id}`)
        .row();
    }
    keyboard.text(t("btn_back", lang), "back_to_welcome");

    await ctx.editMessageText(t("payment_header", lang), {
      reply_markup: keyboard,
    });
    await ctx.answerCallbackQuery();
  });

  // Individual payment option details
  for (const option of paymentOptions) {
    bot.callbackQuery(`payment_${option.id}`, async (ctx) => {
      const lang = ctx.from?.language_code;
      const keyboard = new InlineKeyboard()
        .text(t("btn_confirm_payment", lang), `confirm_payment_${option.id}`)
        .row()
        .text(t("btn_back", lang), "show_payment_options");

      await ctx.editMessageText(
        t(`payment_${option.id}_details`, lang, option.values as Record<string, string>),
        {
          reply_markup: keyboard,
          parse_mode: "Markdown",
        },
      );
      await ctx.answerCallbackQuery();
    });
  }

  // Back to welcome
  bot.callbackQuery("back_to_welcome", async (ctx) => {
    const lang = ctx.from?.language_code;

    await ctx.editMessageText(t("welcome", lang), {
      reply_markup: buildWelcomeKeyboard(lang),
    });
    await ctx.answerCallbackQuery();
  });
}
