import TelegramBot from "node-telegram-bot-api";

const bot = new TelegramBot(process.env.BOT_TOKEN);

// دالة إرسال السؤال إلى Gemini
async function askGemini(text) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text }]
          }
        ]
      })
    }
  );

  const data = await res.json();
  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    "لم أفهم سؤالك 🤔"
  );
}

// /start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "أهلاً 👋\nاكتب أي سؤال وسأجيبك باستخدام Gemini 🤖"
  );
});

// أي رسالة أخرى
bot.on("message", async (msg) => {
  if (!msg.text || msg.text.startsWith("/")) return;

  const chatId = msg.chat.id;

  try {
    const reply = await askGemini(msg.text);
    await bot.sendMessage(chatId, reply);
  } catch (e) {
    console.error(e);
    await bot.sendMessage(chatId, "حدث خطأ 😢");
  }
});

// Webhook Handler (Vercel)
export default async function handler(req, res) {
  if (req.method === "POST") {
    await bot.processUpdate(req.body);
    return res.status(200).send("ok");
  }

  res.status(200).send("Bot + Gemini is running ✅");
}
