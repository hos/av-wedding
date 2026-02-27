import type { Bot } from "grammy";
import { InlineKeyboard } from "grammy";
import type { I18nContext } from "../i18n";
import { paymentOptions } from "../config";
import { buildWelcomeKeyboard } from "./commands";

export function registerCallbackHandlers(bot: Bot<I18nContext>) {
  // Show payment options list
  bot.callbackQuery("show_payment_options", async (ctx) => {
    const keyboard = new InlineKeyboard();

    for (const option of paymentOptions) {
      keyboard
        .text(ctx.t(`payment_${option.id}`), `payment_${option.id}`)
        .row();
    }
    keyboard.text(ctx.t("btn_back"), "back_to_welcome");

    await ctx.editMessageText(ctx.t("payment_header"), {
      reply_markup: keyboard,
    });
    await ctx.answerCallbackQuery();
  });

  // Individual payment option details
  for (const option of paymentOptions) {
    bot.callbackQuery(`payment_${option.id}`, async (ctx) => {
      const keyboard = new InlineKeyboard()
        .text(ctx.t("btn_confirm_payment"), `confirm_payment_${option.id}`)
        .row()
        .text(ctx.t("btn_back"), "show_payment_options");

      await ctx.editMessageText(
        ctx.t(`payment_${option.id}_details`, option.values as Record<string, string>),
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
    await ctx.editMessageText(ctx.t("welcome"), {
      reply_markup: buildWelcomeKeyboard(ctx.t),
    });
    await ctx.answerCallbackQuery();
  });
}
