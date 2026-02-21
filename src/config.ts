/**
 * Payment options configuration.
 * Each option has an id (used as callback data and locale key suffix)
 * and interpolation values for the locale templates.
 *
 * To add a new payment option:
 * 1. Add an entry here
 * 2. Add matching locale keys: payment_<id>, payment_<id>_details
 */
export const paymentOptions = [
  {
    id: "bank",
    values: {
      bank_name: "PLACEHOLDER_BANK_NAME",
      recipient_name: "PLACEHOLDER_RECIPIENT_NAME",
      iban: "GE00TB0000000000000000",
      swift: "TBCBGE22",
      account_number: "PLACEHOLDER_ACCOUNT_NUMBER",
    },
  },
  {
    id: "visa",
    values: {
      visa_card_number: "4000 0000 0000 0000",
      cardholder_name: "PLACEHOLDER CARDHOLDER NAME",
      revolut_username: "PLACEHOLDER_REVOLUT_USERNAME",
    },
  },
  {
    id: "telegram_wallet",
    values: {},
  },
  {
    id: "crypto",
    values: {
      trc20_wallet_address: "T0000000000000000000000000000000000",
    },
  },
] as const;

/** Admin user IDs from env (comma-separated Telegram user IDs) */
export const adminIds = new Set(
  (process.env.ADMIN_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
);

export function isAdmin(userId: number | string): boolean {
  return adminIds.has(String(userId));
}
