import TelegramBot from "node-telegram-bot-api";

const bot = new TelegramBot(process.env.BOT_TOKEN);

/**
 * الاتصال بـ Gemini (نفس payload الذي استخدمته في HTML)
 */
async function askGemini(prompt) {
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("Gemini Error:", data);
    throw new Error(data.error?.message || "Gemini API Error");
  }

  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    "لم يتم توليد رد 🤖"
  );
}

// /start
bot.onText(/\/start/, async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    "أهلاً 👋\nاكتب سؤالك وسأجيبك باستخدام Gemini 🤖"
  );
});

// أي رسالة
bot.on("message", async (msg) => {
  if (!msg.text || msg.text.startsWith("/")) return;

  const chatId = msg.chat.id;

  try {
    await bot.sendMessage(chatId, "⏳ أفكّر...");
    const reply = await askGemini(msg.text);
    await bot.sendMessage(chatId, reply);
  } catch (e) {
    console.error(e);
    await bot.sendMessage(chatId, "حدث خطأ 😢");
  }
});

// Webhook – Vercel
export default async function handler(req, res) {
  if (req.method === "POST") {
    await bot.processUpdate(req.body);
    return res.status(200).send("ok");
  }

  res.status(200).send("Telegram + Gemini is running ✅");
}
