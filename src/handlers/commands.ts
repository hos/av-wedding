import type { Bot } from "grammy";
import { InlineKeyboard } from "grammy";
import { t } from "../i18n";

export function registerCommands(bot: Bot) {
  bot.command("start", (ctx) => {
    const lang = ctx.from?.language_code;
    const keyboard = new InlineKeyboard().text(
      t("btn_payment_options", lang),
      "show_payment_options",
    );
    return ctx.reply(t("welcome", lang), {
      reply_markup: keyboard,
    });
  });

  bot.command("help", (ctx) => {
    const lang = ctx.from?.language_code;
    return ctx.reply(t("help", lang));
  });
}
