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
      intermediary_bank_name: "CITIBANK NA, NEW YORK",
      intermediary_bank_swift: "CITIUS33XXX",
      beneficiary_bank_name: "Ameriabank CJSC",
      beneficiary_bank_swift: "ARMIAM22",
      account_number: "1570077430300101",
      recipient_name: "MARIA VASILKOVA",
      payment_details: "Personal transfer - wedding",
    },
  },
  {
    id: "visa",
    values: {
      visa_card_number: "4083 0600 3101 8175",
      cardholder_name: "MARIA VASILKOVA",
    },
  },
  {
    id: "revolut",
    values: {},
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
