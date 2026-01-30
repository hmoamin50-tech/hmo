import TelegramBot from "node-telegram-bot-api";

// إنشاء البوت (Webhook فقط)
const bot = new TelegramBot(process.env.BOT_TOKEN);

// دالة الاتصال بـ Gemini
async function askGemini(prompt) {
  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini HTTP Error:", data);
      return "حدث خطأ مع Gemini، حاول لاحقاً.";
    }

    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "لم أستطع توليد رد 🤖"
    );
  } catch (err) {
    console.error("Gemini Fetch Error:", err);
    return "تعذر الاتصال بـ Gemini 🤖";
  }
}

// أمر /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(
    chatId,
    "أهلاً 👋\nاكتب سؤالك وسأجيبك باستخدام Gemini 🤖"
  );
});

// أي رسالة أخرى
bot.on("message", async (msg) => {
  if (!msg.text || msg.text.startsWith("/")) return;

  const chatId = msg.chat.id;

  let typingMessageId = null;

  try {
    // إرسال رسالة "أفكر..." وإظهار المؤشر
    const typingMsg = await bot.sendMessage(chatId, "⏳ أفكّر...");
    typingMessageId = typingMsg.message_id;

    // الاتصال بـ Gemini
    const reply = await askGemini(msg.text);

    // حذف مؤشر الكتابة
    if (typingMessageId) {
      await bot.deleteMessage(chatId, typingMessageId);
    }

    // إرسال الرد النهائي
    await bot.sendMessage(chatId, reply);

  } catch (err) {
    console.error("Bot Error:", err);

    // إزالة مؤشر الكتابة عند حدوث خطأ
    if (typingMessageId) {
      try {
        await bot.deleteMessage(chatId, typingMessageId);
      } catch {}
    }

    await bot.sendMessage(chatId, "حدث خطأ 😢 حاول لاحقًا");
  }
});

// Webhook Handler (Vercel)
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
  res.status(200).send("Telegram + Gemini is running ✅");
}
