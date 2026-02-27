import type { Bot } from "grammy";
import { InlineKeyboard } from "grammy";
import type { I18nContext } from "../i18n";
import { clearAlbumMode } from "./album";

export function buildWelcomeKeyboard(t: I18nContext["t"]) {
  return new InlineKeyboard()
    .text(t("btn_payment_options"), "show_payment_options")
    .row()
    .text(t("btn_album"), "show_album");
}

export function registerCommands(bot: Bot<I18nContext>) {
  bot.command("start", (ctx) => {
    if (ctx.from) clearAlbumMode(ctx.from.id);
    return ctx.reply(ctx.t("welcome"), {
      reply_markup: buildWelcomeKeyboard(ctx.t),
    });
  });

  bot.command("help", (ctx) => {
    return ctx.reply(ctx.t("help"));
  });
}
