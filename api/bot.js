// api/bot.js
import fetch from "node-fetch";

/* ========== الإعدادات ========== */
const BOT_TOKEN = process.env.BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ADMIN_ID = process.env.ADMIN_ID || "none";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

/* ========== أنواع اللعبة ========== */
const GAME_TYPES = {
  comedy: "😂 أسئلة كوميدية",
  truth: "🔥 صراحة وجرأة",
  free: "🗣️ تحدث بدون حواجز",
  love: "❤️ أسئلة غرامية",
  couples: "💞 أسئلة للعشاق",
  funny: "🤣 مضحكة",
  daily: "📔 يوميات",
  personality: "🧠 شخصية"
};

/* ========== حالة المستخدم ========== */
const userState = new Map();

/* ========== الأسئلة الافتراضية ========== */
const DEFAULT_QUESTIONS = {
  comedy: [
    "إذا كنت ستتحول إلى حيوان ليوم واحد، ماذا تختار؟",
    "ما أغرب تصرف قمت به وأنت وحدك؟",
    "ما أسوأ لقب أطلق عليك؟"
  ],
  truth: [
    "ما سر لم تخبر به أحداً؟",
    "ما أكثر شيء تخجل منه؟",
    "ما أسوأ قرار اتخذته؟"
  ],
  free: [
    "ما أكثر شيء يؤلمك بصمت؟",
    "ما حلمك الذي لم يتحقق بعد؟"
  ],
  love: [
    "ما تعريفك للحب الحقيقي؟",
    "ما أكثر تصرف رومانسي قمت به؟"
  ],
  couples: [
    "ما أول شيء جذبك في شريكك؟",
    "ما ذكرى لا تنساها معه؟"
  ],
  funny: [
    "ما أكثر موقف محرج مررت به؟",
    "ما أسوأ هدية تلقيتها؟"
  ],
  daily: [
    "ما أول شيء تفعله صباحاً؟",
    "ما أفضل جزء في يومك؟"
  ],
  personality: [
    "كيف تصف نفسك بثلاث كلمات؟",
    "ما أكثر صفة تحبها بنفسك؟"
  ]
};

/* ========== ردود عشوائية ========== */
const RESPONSES = [
  "🌟 إجابة جميلة!",
  "💫 رائع!",
  "🎯 نقطة قوية!",
  "✨ تفكير جميل!",
  "💎 إجابة مميزة!"
];

const randomResponse = () =>
  RESPONSES[Math.floor(Math.random() * RESPONSES.length)];

/* ========== Telegram Helpers ========== */
async function sendMessage(chatId, text, extra = {}) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        ...extra
      })
    });
  } catch {}
}

async function sendTyping(chatId, seconds = 2) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action: "typing" })
    });
    await new Promise(r => setTimeout(r, seconds * 1000));
  } catch {}
}

async function answerCallbackQuery(id) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: id })
    });
  } catch {}
}

/* ========== Gemini مع Retry + Timeout ========== */
async function getGeminiResponse(prompt, retries = 3, timeoutMs = 8000) {
  for (let i = 1; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      clearTimeout(timer);

      if (!res.ok) throw new Error();

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text.trim();

    } catch {
      if (i === retries) return null;
      await new Promise(r => setTimeout(r, i * 1000));
    }
  }
  return null;
}

/* ========== توليد سؤال ========== */
function buildPrompt(type) {
  return `أنشئ سؤالاً واحداً قصيراً للعبة جماعية.
النوع: ${type}
اللغة: العربية`;
}

async function generateQuestion(typeKey) {
  const q = await getGeminiResponse(buildPrompt(GAME_TYPES[typeKey]));
  if (q) return q;

  const list = DEFAULT_QUESTIONS[typeKey];
  return list[Math.floor(Math.random() * list.length)];
}

/* ========== القوائم ========== */
const gameMenu = () => ([
  [{ text: "😂 كوميديا", callback_data: "game_comedy" }, { text: "🔥 صراحة", callback_data: "game_truth" }],
  [{ text: "🗣️ بدون حواجز", callback_data: "game_free" }, { text: "❤️ غرامية", callback_data: "game_love" }],
  [{ text: "💞 عشاق", callback_data: "game_couples" }, { text: "🤣 مضحكة", callback_data: "game_funny" }],
  [{ text: "📔 يوميات", callback_data: "game_daily" }, { text: "🧠 شخصية", callback_data: "game_personality" }],
  [{ text: "🎲 عشوائي", callback_data: "game_random" }]
]);

const afterButtons = () => ([
  [{ text: "🔄 سؤال جديد", callback_data: "next_question" }],
  [{ text: "🔙 تغيير النوع", callback_data: "change_type" }]
]);

/* ========== Handler ========== */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).end();

  const update = req.body;

  /* ==== أزرار ==== */
  if (update.callback_query) {
    const c = update.callback_query;
    const chatId = c.message.chat.id;
    await answerCallbackQuery(c.id);

    let type = c.data.replace("game_", "");
    if (c.data === "game_random") {
      const keys = Object.keys(GAME_TYPES);
      type = keys[Math.floor(Math.random() * keys.length)];
    }

    if (GAME_TYPES[type]) {
      await sendTyping(chatId, 2);
      const q = await generateQuestion(type);
      userState.set(chatId, { type, question: q });

      await sendMessage(chatId, `❓ *${q}*\n\n✍️ اكتب إجابتك`, {
        reply_markup: { inline_keyboard: afterButtons() }
      });
    }

    if (c.data === "next_question") {
      const s = userState.get(chatId);
      if (!s) return res.end();

      await sendTyping(chatId, 2);
      const q = await generateQuestion(s.type);
      s.question = q;

      await sendMessage(chatId, `❓ *${q}*`, {
        reply_markup: { inline_keyboard: afterButtons() }
      });
    }

    if (c.data === "change_type") {
      await sendMessage(chatId, "🎮 اختر نوع اللعبة:", {
        reply_markup: { inline_keyboard: gameMenu() }
      });
    }

    return res.end();
  }

  /* ==== رسائل ==== */
  const msg = update.message;
  if (!msg) return res.end();

  const chatId = msg.chat.id;
  const text = msg.text || "";

  if (text === "/start") {
    await sendMessage(chatId, "🎮 *مرحباً بك!*\nاختر نوع الأسئلة:", {
      reply_markup: { inline_keyboard: gameMenu() }
    });
    return res.end();
  }

  const state = userState.get(chatId);
  if (state && !text.startsWith("/")) {
    await sendMessage(
      chatId,
      `${randomResponse()}\n\n📌 *سؤالك:* ${state.question}\n✍️ *إجابتك:* ${text}`,
      { reply_markup: { inline_keyboard: afterButtons() } }
    );
  }

  return res.end();
}
