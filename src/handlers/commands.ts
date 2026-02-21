import type { Bot } from "grammy";
import { InlineKeyboard } from "grammy";
import { t } from "../i18n";
import { clearAlbumMode } from "./album";

export function buildWelcomeKeyboard(lang?: string) {
  return new InlineKeyboard()
    .text(t("btn_payment_options", lang), "show_payment_options")
    .row()
    .text(t("btn_album", lang), "show_album");
}

export function registerCommands(bot: Bot) {
  bot.command("start", (ctx) => {
    const lang = ctx.from?.language_code;
    if (ctx.from) clearAlbumMode(ctx.from.id);
    return ctx.reply(t("welcome", lang), {
      reply_markup: buildWelcomeKeyboard(lang),
    });
  });

  bot.command("help", (ctx) => {
    const lang = ctx.from?.language_code;
    return ctx.reply(t("help", lang));
  });
}
