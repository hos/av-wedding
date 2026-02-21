import type { Bot } from "grammy";
import { InlineKeyboard } from "grammy";
import { db, storage } from "../firebase";
import { t } from "../i18n";
import { isAdmin } from "../config";

const PAGE_SIZE = 5;

async function sendAdminList(
  bot: Bot,
  chatId: number | string,
  lang: string | undefined,
  page: number,
  editMessageId?: number,
) {
  const snapshot = await db
    .collection("confirmations")
    .orderBy("created_at", "desc")
    .get();

  const docs = snapshot.docs;
  const total = docs.length;

  if (total === 0) {
    const keyboard = new InlineKeyboard().text("🔄 Refresh", "admin_page_0");
    const text = t("admin_no_pending", lang);
    if (editMessageId) {
      await bot.api.editMessageText(chatId, editMessageId, text, {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      });
    } else {
      await bot.api.sendMessage(chatId, text, {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      });
    }
    return;
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.min(page, totalPages - 1);
  const start = currentPage * PAGE_SIZE;
  const pageDocs = docs.slice(start, start + PAGE_SIZE);

  // Build list text
  let listText = t("admin_menu_header", lang, { count: String(total) }) + "\n\n";

  for (let i = 0; i < pageDocs.length; i++) {
    const data = pageDocs[i]!.data();
    const methodLabel = t(`payment_${data.payment_method}`, "en");
    const statusIcon = data.status === "confirmed" ? "✅" : "⏳";
    const date = new Date(data.created_at).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    listText += t("admin_list_item", lang, {
      index: String(start + i + 1),
      username: data.username || "N/A",
      payment_method: methodLabel,
      status: statusIcon,
      date,
    }) + "\n";
  }

  if (totalPages > 1) {
    listText += `\n📄 Page ${currentPage + 1}/${totalPages}`;
  }

  // Build keyboard — one button per item to view details
  const keyboard = new InlineKeyboard();
  for (let i = 0; i < pageDocs.length; i++) {
    keyboard
      .text(
        `${start + i + 1}. @${pageDocs[i]!.data().username || "N/A"}`,
        `admin_view_${pageDocs[i]!.id}`,
      )
      .row();
  }

  // Pagination row: ⬅️ 🔄 ➡️
  if (currentPage > 0) {
    keyboard.text(t("btn_prev_page", lang), `admin_page_${currentPage - 1}`);
  }
  keyboard.text("🔄", `admin_page_${currentPage}`);
  if (currentPage < totalPages - 1) {
    keyboard.text(t("btn_next_page", lang), `admin_page_${currentPage + 1}`);
  }
  keyboard.row();
  keyboard.text(t("btn_back", lang), "admin_main");

  if (editMessageId) {
    await bot.api.editMessageText(chatId, editMessageId, listText, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  } else {
    await bot.api.sendMessage(chatId, listText, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  }
}

export function registerAdminHandlers(bot: Bot) {
  // /admin command — show main admin menu
  bot.command("admin", async (ctx) => {
    if (!ctx.from || !isAdmin(ctx.from.id)) {
      return ctx.reply(t("admin_not_authorized", ctx.from?.language_code));
    }
    const lang = ctx.from.language_code;
    const keyboard = new InlineKeyboard()
      .text(t("btn_admin_payments", lang), "admin_page_0")
      .row()
      .text(t("btn_admin_album", lang), "admin_album_0");

    await ctx.reply(t("admin_main_menu", lang), {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  });

  // Admin main menu callback
  bot.callbackQuery("admin_main", async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCallbackQuery({ text: t("admin_not_authorized", "en") });
      return;
    }
    const lang = ctx.from.language_code;
    const chatId = ctx.chat!.id;
    const keyboard = new InlineKeyboard()
      .text(t("btn_admin_payments", lang), "admin_page_0")
      .row()
      .text(t("btn_admin_album", lang), "admin_album_0");

    // Delete old message (could be a photo) and send fresh text
    try {
      await ctx.deleteMessage();
    } catch {
      // already deleted
    }
    await bot.api.sendMessage(chatId, t("admin_main_menu", lang), {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
    await ctx.answerCallbackQuery();
  });

  // Pagination
  bot.callbackQuery(/^admin_page_(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCallbackQuery({ text: t("admin_not_authorized", "en") });
      return;
    }
    const page = parseInt(ctx.match![1]!, 10);
    await sendAdminList(
      bot,
      ctx.chat!.id,
      ctx.from.language_code,
      page,
      ctx.msgId,
    );
    await ctx.answerCallbackQuery();
  });

  // View individual confirmation detail
  bot.callbackQuery(/^admin_view_(.+)$/, async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCallbackQuery({ text: t("admin_not_authorized", "en") });
      return;
    }

    const confirmId = ctx.match![1]!;
    const confirmRef = db.collection("confirmations").doc(confirmId);
    const confirmDoc = await confirmRef.get();

    if (!confirmDoc.exists) {
      await ctx.answerCallbackQuery({ text: "Confirmation not found." });
      return;
    }

    const data = confirmDoc.data()!;
    const lang = ctx.from.language_code;
    const methodLabel = t(`payment_${data.payment_method}`, "en");
    const statusLabel =
      data.status === "confirmed"
        ? t("status_confirmed", lang)
        : t("status_pending", lang);
    const date = new Date(data.created_at).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const text = t("admin_detail", lang, {
      first_name: data.first_name || "",
      last_name: data.last_name || "",
      username: data.username || "N/A",
      user_id: data.user_id,
      payment_method: methodLabel,
      status: statusLabel,
      date,
    });

    const keyboard = new InlineKeyboard();
    if (data.status === "pending") {
      keyboard
        .text(t("btn_admin_confirm", lang), `admin_confirm_${confirmId}`)
        .row();
    }
    keyboard.text(t("btn_back", lang), "admin_page_0");

    await ctx.editMessageText(text, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
    await ctx.answerCallbackQuery();
  });

  // Album submissions — one file per page with prev/next
  bot.callbackQuery(/^admin_album_(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCallbackQuery({ text: t("admin_not_authorized", "en") });
      return;
    }

    const index = parseInt(ctx.match![1]!, 10);
    const lang = ctx.from.language_code;
    const chatId = ctx.chat!.id;

    // Always delete the previous message (could be text or photo)
    try {
      await ctx.deleteMessage();
    } catch {
      // message may already be deleted
    }
    await ctx.answerCallbackQuery();

    const snapshot = await db
      .collection("album_submissions")
      .orderBy("created_at", "desc")
      .get();

    const docs = snapshot.docs;
    const total = docs.length;

    if (total === 0) {
      const keyboard = new InlineKeyboard()
        .text("🔄 Refresh", "admin_album_0")
        .row()
        .text(t("btn_back", lang), "admin_main");

      await bot.api.sendMessage(chatId, t("admin_album_empty", lang), {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      });
      return;
    }

    const current = Math.min(index, total - 1);
    const doc = docs[current]!;
    const data = doc.data();
    const date = new Date(data.created_at).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const keyboard = new InlineKeyboard();
    keyboard.text("📥 Download file", `admin_album_dl_${doc.id}`).row();

    if (current > 0) {
      keyboard.text(t("btn_prev_page", lang), `admin_album_${current - 1}`);
    }
    keyboard.text("🔄", `admin_album_${current}`);
    if (current < total - 1) {
      keyboard.text(t("btn_next_page", lang), `admin_album_${current + 1}`);
    }
    keyboard.row();
    keyboard.text(t("btn_back", lang), "admin_main");

    const isImage = data.file_type !== "PDF";

    if (isImage) {
      // Send photo with short caption + keyboard
      const bucket = storage.bucket();
      const file = bucket.file(data.storage_path);
      const [url] = await file.getSignedUrl({
        action: "read" as const,
        expires: Date.now() + 60 * 60 * 1000,
      });

      const caption = t("admin_album_caption", lang, {
        index: String(current + 1),
        total: String(total),
        username: data.username || "N/A",
        file_type: data.file_type || "file",
        date,
        caption: data.caption ? `\n💬 ${data.caption}` : "",
      });

      await bot.api.sendPhoto(chatId, url, {
        caption,
        parse_mode: "Markdown",
        reply_markup: keyboard,
      });
    } else {
      // PDF — send text message with full details
      const text = t("admin_album_detail", lang, {
        index: String(current + 1),
        total: String(total),
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        username: data.username || "N/A",
        user_id: data.user_id,
        file_type: data.file_type || "file",
        file_name: data.file_name || "—",
        storage_path: data.storage_path,
        caption: data.caption || "—",
        date,
      });

      await bot.api.sendMessage(chatId, text, {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      });
    }
  });

  // Download / send file to admin
  bot.callbackQuery(/^admin_album_dl_(.+)$/, async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCallbackQuery({ text: t("admin_not_authorized", "en") });
      return;
    }

    const docId = ctx.match![1]!;
    const doc = await db.collection("album_submissions").doc(docId).get();

    if (!doc.exists) {
      await ctx.answerCallbackQuery({ text: "Submission not found." });
      return;
    }

    const data = doc.data()!;
    const bucket = storage.bucket();
    const file = bucket.file(data.storage_path);

    // Generate a signed URL valid for 1 hour
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 60 * 1000,
    });

    const caption = `📖 Album submission from @${data.username || "N/A"}\nType: ${data.file_type}`;

    if (data.file_type === "PDF") {
      await ctx.replyWithDocument(url, { caption });
    } else {
      await ctx.replyWithPhoto(url, { caption });
    }

    await ctx.answerCallbackQuery();
  });
}
