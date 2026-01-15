// api/bot.js
import fetch from "node-fetch";

/* ================== الإعدادات ================== */
const BOT_TOKEN = process.env.BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

/* ================== Rate Limiting ================== */
let requestCount = 0;
let lastReset = Date.now();
const LIMIT = 15;
const RESET_TIME = 60 * 1000;

function checkRateLimit() {
  const now = Date.now();
  if (now - lastReset > RESET_TIME) {
    requestCount = 0;
    lastReset = now;
  }
  if (requestCount >= LIMIT) return false;
  requestCount++;
  return true;
}

/* ================== Gemini ================== */
async function getGeminiResponse(text) {
  if (!checkRateLimit()) {
    throw new Error("RATE_LIMIT");
  }

  const payload = {
    contents: [
      {
        parts: [{ text }]
      }
    ]
  };

  const response = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": GEMINI_API_KEY // ✅ نفس HTML
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "Gemini Error");
  }

  const data = await response.json();
  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    "لم أستطع توليد رد واضح."
  );
}

/* ================== Telegram ================== */
async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown"
    })
  });
}

async function sendTyping(chatId) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      action: "typing"
    })
  });
}

/* ================== ردود سريعة ================== */
function quickReply(text, name) {
  if (text.includes("مرحبا") || text.includes("اهلا"))
    return `مرحباً ${name} 😊`;
  if (text.includes("شكرا")) return `العفو ${name} 🌸`;
  return `أنا هنا للمساعدة ${name} 🤖`;
}

/* ================== Handler ================== */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method === "GET") {
    return res.status(200).json({
      status: "OK",
      bot: "Telegram Gemini Bot",
      rate: `${requestCount}/${LIMIT}`
    });
  }

  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const update = req.body;
  if (!update.message) return res.status(200).end();

  const chatId = update.message.chat.id;
  const text = update.message.text || "";
  const name = update.message.from.first_name || "صديقي";

  try {
    if (text === "/start") {
      await sendMessage(
        chatId,
        `👋 أهلاً ${name}\n\n🤖 أنا بوت ذكاء اصطناعي\nاكتب سؤالك مباشرة`
      );
      return res.status(200).end();
    }

    if (text === "/simple") {
      await sendMessage(chatId, quickReply("مرحبا", name));
      return res.status(200).end();
    }

    if (text.startsWith("/")) return res.status(200).end();

    await sendTyping(chatId);

    try {
      const reply = await getGeminiResponse(text);
      await sendMessage(chatId, reply);
    } catch (err) {
      if (err.message === "RATE_LIMIT") {
        await sendMessage(
          chatId,
          "⚠️ ضغط عالي على الخادم\nحاول بعد دقيقة"
        );
      } else {
        await sendMessage(
          chatId,
          "⚠️ تم استخدام الرد السريع\n\n" + quickReply(text, name)
        );
      }
    }
  } catch (e) {
    await sendMessage(chatId, "❌ حدث خطأ غير متوقع");
  }

  return res.status(200).end();
}
