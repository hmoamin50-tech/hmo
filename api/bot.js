// api/start.js   أو api/index.js

import TelegramBot from "node-telegram-bot-api";

const token = process.env.BOT_TOKEN;

if (!token) {
  throw new Error("BOT_TOKEN غير موجود في المتغيرات البيئية");
}

const bot = new TelegramBot(token);

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || "صديقي";

  try {
    await bot.sendMessage(chatId, `مرحبا يا ${firstName} 👋`);
  } catch (err) {
    console.error("خطأ في إرسال الرسالة:", err);
  }
});

// للرسائل الأخرى (اختياري — يمكنك حذفه)
bot.on("message", async (msg) => {
  if (!msg.text || msg.text.startsWith("/")) return;

  const chatId = msg.chat.id;
  await bot.sendMessage(chatId, "أرسل /start لتحية 😄");
});

// Vercel Handler
export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      // طباعة للـ logs (مفيد للتصحيح)
      console.log("تم استلام تحديث:", JSON.stringify(req.body, null, 2));

      await bot.processUpdate(req.body);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("خطأ في معالجة التحديث:", err);
      return res.status(500).json({ error: "خطأ داخلي" });
    }
  }

  // GET → للتحقق من أن الـ endpoint حي
  res.status(200).send("البوت شغال ✓\nاستخدم /start");
}
