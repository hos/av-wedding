import { bot } from "./bot";

await bot.api.setMyCommands([
  { command: "start", description: "Start the bot" },
]);

bot.start();
console.log("Bot is running...");

const port = Number(process.env.PORT ?? 3012);

Bun.serve({
  port,
  fetch(req) {
    const { pathname } = new URL(req.url);
    if (pathname === "/health") {
      return new Response("ok", {
        status: 200,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Health endpoint ready on http://localhost:${port}/health`);
