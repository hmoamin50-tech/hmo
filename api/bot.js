import TelegramBot from "node-telegram-bot-api";

// إنشاء البوت (Webhook – بدون polling)
const bot = new TelegramBot(process.env.BOT_TOKEN);

/**
 * إرسال السؤال إلى Gemini
 */
async function askGemini(text) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text }],
          },
        ],
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("Gemini API Error:", data);
    throw new Error("Gemini API failed");
  }

  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    "لم أستطع توليد رد 🤖"
  );
}

// أمر /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(
    chatId,
    "أهلاً 👋\nاكتب أي سؤال وسأجيبك باستخدام Gemini 🤖"
  );
});

// أي رسالة أخرى
bot.on("message", async (msg) => {
  if (!msg.text || msg.text.startsWith("/")) return;

  const chatId = msg.chat.id;

  try {
    // رسالة مؤقتة (اختياري)
    await bot.sendMessage(chatId, "⏳ أفكّر...");

    const reply = await askGemini(msg.text);
    await bot.sendMessage(chatId, reply);
  } catch (error) {
    console.error("Bot Error:", error);
    await bot.sendMessage(chatId, "حدث خطأ 😢 حاول لاحقًا");
  }
});

// Vercel Webhook Handler
export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      await bot.processUpdate(req.body);
      return res.status(200).send("ok");
    } catch (err) {
      console.error("Webhook Error:", err);
      return res.status(500).send("error");
    }
  }

  // عند فتح الرابط في المتصفح
  res.status(200).send("Telegram Bot + Gemini is running ✅");
}
