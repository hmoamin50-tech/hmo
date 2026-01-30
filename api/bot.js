// api/index.js

import TelegramBot from "node-telegram-bot-api";

const bot = new TelegramBot(process.env.BOT_TOKEN);

// Vercel Webhook Handler
export default async function handler(req, res) {
  if (req.method === "POST") {
    await bot.processUpdate(req.body);
    return res.status(200).send("ok");
  }

  res.status(200).send("Bot is running ✅");
}

// أمر /start فقط
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "أهلاً 👋");
});
