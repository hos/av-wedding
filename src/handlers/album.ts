import type { Bot } from "grammy";
import { InlineKeyboard } from "grammy";
import { db, storage } from "../firebase";
import { t, type I18nContext } from "../i18n";
import { adminIds } from "../config";

/** Track users who are in "album upload" mode */
const albumMode = new Set<number>();

export function isInAlbumMode(userId: number): boolean {
  return albumMode.has(userId);
}

export function clearAlbumMode(userId: number): void {
  albumMode.delete(userId);
}

export function registerAlbumHandlers(bot: Bot<I18nContext>) {
  // Show album intro
  bot.callbackQuery("show_album", async (ctx) => {
    const keyboard = new InlineKeyboard()
      .text(ctx.t("btn_album_guidelines"), "show_album_guidelines")
      .row()
      .text(ctx.t("btn_send_album_file"), "album_start_upload")
      .row()
      .text(ctx.t("btn_back"), "back_to_welcome");

    await ctx.editMessageText(ctx.t("album_intro"), {
      reply_markup: keyboard,
      parse_mode: "Markdown",
    });
    await ctx.answerCallbackQuery();
  });

  // Show guidelines
  bot.callbackQuery("show_album_guidelines", async (ctx) => {
    const keyboard = new InlineKeyboard()
      .text(ctx.t("btn_send_album_file"), "album_start_upload")
      .row()
      .text(ctx.t("btn_back"), "show_album");

    await ctx.editMessageText(ctx.t("album_guidelines"), {
      reply_markup: keyboard,
      parse_mode: "Markdown",
    });
    await ctx.answerCallbackQuery();
  });

  // Enter album upload mode
  bot.callbackQuery("album_start_upload", async (ctx) => {
    albumMode.add(ctx.from.id);

    await ctx.editMessageText(ctx.t("album_awaiting_file"));
    await ctx.answerCallbackQuery();
  });

  // Handle photo uploads (when in album mode)
  bot.on("message:photo", async (ctx) => {
    if (!isInAlbumMode(ctx.from.id)) return;

    const user = ctx.from;
    const userId = user.id.toString();

    // Get the highest resolution photo
    const photo = ctx.message.photo[ctx.message.photo.length - 1]!;
    const file = await ctx.api.getFile(photo.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;

    // Download and upload to Firebase Storage
    const response = await fetch(fileUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    const ext = file.file_path?.split(".").pop() ?? "jpg";
    const storagePath = `album/${userId}/${Date.now()}.${ext}`;

    const bucket = storage.bucket();
    const fileRef = bucket.file(storagePath);
    await fileRef.save(buffer, {
      contentType: `image/${ext}`,
      metadata: { userId, username: user.username ?? "" },
    });

    // Save record in Firestore
    await db.collection("album_submissions").add({
      user_id: userId,
      username: user.username ?? "",
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
      file_type: "photo",
      storage_path: storagePath,
      caption: ctx.message.caption ?? "",
      created_at: new Date().toISOString(),
    });

    // Notify admins
    await notifyAdmins(bot, user, "photo");

    await ctx.reply(ctx.t("album_file_received"));
  });

  // Reject video uploads with friendly message
  bot.on("message:video", async (ctx) => {
    if (!isInAlbumMode(ctx.from.id)) return;
    await ctx.reply(ctx.t("album_file_error"));
  });

  // Handle document uploads (PDF, images sent as files)
  bot.on("message:document", async (ctx) => {
    if (!isInAlbumMode(ctx.from.id)) return;

    const user = ctx.from;
    const userId = user.id.toString();
    const doc = ctx.message.document;

    // Validate file type
    const mime = doc.mime_type ?? "";
    const isImage = mime.startsWith("image/");
    const isPdf = mime === "application/pdf";

    if (!isImage && !isPdf) {
      await ctx.reply(ctx.t("album_file_error"));
      return;
    }

    const file = await ctx.api.getFile(doc.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;

    // Download and upload to Firebase Storage
    const response = await fetch(fileUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    const ext = doc.file_name?.split(".").pop() ?? (isPdf ? "pdf" : "jpg");
    const storagePath = `album/${userId}/${Date.now()}_${doc.file_name ?? `file.${ext}`}`;

    const bucket = storage.bucket();
    const fileRef = bucket.file(storagePath);
    await fileRef.save(buffer, {
      contentType: mime,
      metadata: { userId, username: user.username ?? "" },
    });

    // Save record in Firestore
    const fileType = isPdf ? "PDF" : "image";
    await db.collection("album_submissions").add({
      user_id: userId,
      username: user.username ?? "",
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
      file_type: fileType,
      file_name: doc.file_name ?? "",
      storage_path: storagePath,
      caption: ctx.message.caption ?? "",
      created_at: new Date().toISOString(),
    });

    // Notify admins
    await notifyAdmins(bot, user, fileType);

    await ctx.reply(ctx.t("album_file_received"));
  });
}

async function notifyAdmins(
  bot: Bot,
  user: { id: number; first_name?: string; last_name?: string; username?: string },
  fileType: string,
) {
  const date = new Date().toISOString();
  for (const adminId of adminIds) {
    try {
      await bot.api.sendMessage(
        adminId,
        t("album_admin_notification", "en", {
          first_name: user.first_name ?? "",
          last_name: user.last_name ?? "",
          username: user.username ?? "N/A",
          file_type: fileType,
          date,
        }),
        { parse_mode: "Markdown" },
      );
    } catch (err) {
      console.error(`Failed to notify admin ${adminId} about album:`, err);
    }
  }
}
