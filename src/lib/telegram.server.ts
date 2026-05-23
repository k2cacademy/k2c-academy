// Telegram Bot API helpers — server only.
// Uses the raw bot token from TELEGRAM_BOT_TOKEN (set in secrets).

import { createHash, timingSafeEqual } from "crypto";

const API = "https://api.telegram.org";

function botToken(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  return t;
}

export function adminChatId(): string {
  const c = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!c) throw new Error("TELEGRAM_ADMIN_CHAT_ID is not configured");
  return c;
}

export function deriveWebhookSecret(): string {
  return createHash("sha256")
    .update(`telegram-webhook::${botToken()}`)
    .digest("base64url");
}

export function verifyWebhookHeader(actual: string | null): boolean {
  if (!actual) return false;
  const expected = deriveWebhookSecret();
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type InlineKeyboard = { text: string; callback_data: string }[][];

async function tg<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API}/bot${botToken()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || (json as { ok?: boolean }).ok === false) {
    console.error(`Telegram ${method} failed`, res.status, json);
    throw new Error(`Telegram ${method} failed: ${res.status}`);
  }
  return (json as { result: T }).result;
}

export async function sendMessage(opts: {
  chat_id?: string;
  text: string;
  parse_mode?: "HTML" | "Markdown";
  reply_markup?: { inline_keyboard: InlineKeyboard };
}): Promise<{ message_id: number }> {
  return tg("sendMessage", {
    chat_id: opts.chat_id ?? adminChatId(),
    text: opts.text,
    parse_mode: opts.parse_mode ?? "HTML",
    reply_markup: opts.reply_markup,
    disable_web_page_preview: true,
  });
}

export async function sendPhoto(opts: {
  chat_id?: string;
  photo_url: string;
  caption: string;
  parse_mode?: "HTML" | "Markdown";
  reply_markup?: { inline_keyboard: InlineKeyboard };
}): Promise<{ message_id: number }> {
  return tg("sendPhoto", {
    chat_id: opts.chat_id ?? adminChatId(),
    photo: opts.photo_url,
    caption: opts.caption,
    parse_mode: opts.parse_mode ?? "HTML",
    reply_markup: opts.reply_markup,
  });
}

export async function answerCallbackQuery(opts: {
  callback_query_id: string;
  text?: string;
  show_alert?: boolean;
}): Promise<void> {
  await tg("answerCallbackQuery", opts as unknown as Record<string, unknown>);
}

export async function editMessageReplyMarkup(opts: {
  chat_id: string | number;
  message_id: number;
  reply_markup?: { inline_keyboard: InlineKeyboard };
}): Promise<void> {
  try {
    await tg("editMessageReplyMarkup", opts as unknown as Record<string, unknown>);
  } catch {
    // ignore — message may not allow edit
  }
}

export function formatWAT(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date) + " WAT";
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
