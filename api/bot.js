import TelegramBot from "node-telegram-bot-api";

// تأكد من إضافة خيار { polling: false } لأننا نستخدم Webhook
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: false });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "أهلاً 👋 البوت شغال على Vercel");
});

export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      // معالجة البيانات القادمة من تيليجرام
      await bot.processUpdate(req.body);
      return res.status(200).json({ message: "ok" });
    }
    
    // رسالة تظهر عند فتح الرابط في المتصفح
    res.status(200).send("Bot is running ✅");
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
