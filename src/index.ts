import { bot } from "./bot";

await bot.api.setMyCommands([
  { command: "start", description: "Start the bot" },
]);

bot.start();
console.log("Bot is running...");
