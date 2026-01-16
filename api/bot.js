import fetch from "node-fetch";

/* ========== الإعدادات ========== */
const BOT_TOKEN = process.env.BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ADMIN_ID = process.env.ADMIN_ID;

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

/* ========== Rate Limit ========== */
let requestCount = 0;
let lastReset = Date.now();
const LIMIT = 20;
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
const userState = new Map(); // chatId => { type, question }

/* ========== Gemini ========== */
function buildPrompt(type) {
  return `
أنت مولد أسئلة للعبة دردشة.
أنشئ سؤالاً واحداً فقط.
نوع السؤال: ${type}
الشروط:
- سؤال واحد فقط
- بدون ترقيم
- بدون شرح
- قصير وجذاب
`;
}

async function getGeminiResponse(text) {
  if (!checkRateLimit()) throw new Error("RATE_LIMIT");

  const response = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": GEMINI_API_KEY
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }]
    })
  });

  const data = await response.json();
  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    "❓ لم يتم توليد سؤال"
  );
}

/* ========== Telegram Helpers ========== */
async function sendMessage(chatId, text, extra = {}) {
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

/* ========== أزرار ========== */
function gameMenu() {
  return Object.entries(GAME_TYPES).map(([key, title]) => [
    { text: title, callback_data: `game_${key}` }
  ]);
}

/* ========== إرسال للأدمن ========== */
async function sendToAdmin(user, question, answer) {
  const msg = `
📥 *لعبة الأسئلة*

👤 المستخدم:
${user.first_name || ""} ${user.last_name || ""}
@${user.username || "—"}
ID: ${user.id}

❓ السؤال:
${question}

💬 الإجابة:
${answer}
`;
  await sendMessage(ADMIN_ID, msg);
}

/* ========== Handler ========== */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method === "GET") {
    return res.status(200).json({ status: "OK" });
  }

  if (req.method !== "POST") return res.status(405).end();

  const update = req.body;

  /* ====== أزرار ====== */
  if (update.callback_query) {
    const cq = update.callback_query;
    const chatId = cq.message.chat.id;
    const user = cq.from;
    const data = cq.data;

    // اختيار نوع
    if (data.startsWith("game_")) {
      const typeKey = data.replace("game_", "");
      const prompt = buildPrompt(GAME_TYPES[typeKey]);
      const question = await getGeminiResponse(prompt);

      userState.set(chatId, { type: typeKey, question });

      await sendMessage(chatId, question, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔄 سؤال آخر", callback_data: "next_q" }],
            [{ text: "🔙 تغيير النوع", callback_data: "back_menu" }]
          ]
        }
      });
    }

    // سؤال آخر
    if (data === "next_q") {
      const state = userState.get(chatId);
      if (!state) return res.status(200).end();

      const prompt = buildPrompt(GAME_TYPES[state.type]);
      const question = await getGeminiResponse(prompt);

      state.question = question;
      userState.set(chatId, state);

      await sendMessage(chatId, question, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔄 سؤال آخر", callback_data: "next_q" }],
            [{ text: "🔙 تغيير النوع", callback_data: "back_menu" }]
          ]
        }
      });
    }

    // رجوع
    if (data === "back_menu") {
      await sendMessage(chatId, "🎮 اختر نوع اللعبة:", {
        reply_markup: { inline_keyboard: gameMenu() }
      });
    }

    return res.status(200).end();
  }

  /* ====== الرسائل ====== */
  if (!update.message) return res.status(200).end();

  const chatId = update.message.chat.id;
  const text = update.message.text || "";
  const user = update.message.from;

  if (text === "/start") {
    await sendMessage(chatId, "🎮 اختر نوع اللعبة:", {
      reply_markup: { inline_keyboard: gameMenu() }
    });
    return res.status(200).end();
  }

  // إجابة المستخدم
  const state = userState.get(chatId);
  if (state && text && !text.startsWith("/")) {
    await sendTyping(chatId);

    await sendToAdmin(user, state.question, text);

    await sendMessage(
      chatId,
      "✅ تم تسجيل إجابتك\nاضغط سؤال آخر أو غيّر النوع 👇",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔄 سؤال آخر", callback_data: "next_q" }],
            [{ text: "🔙 تغيير النوع", callback_data: "back_menu" }]
          ]
        }
      }
    );
  }

  return res.status(200).end();
}
