import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";

dotenv.config();

// ======================
// إعدادات Gemini
// ======================
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// ======================
// تهيئة البوت (Webhook)
// ======================
const bot = new TelegramBot(process.env.BOT_TOKEN);

// ======================
// تخزين المحادثات
// ======================
const userConversations = new Map();

// ======================
// تنظيف المحادثات القديمة
// ======================
function cleanupOldConversations() {
  const now = Date.now();
  const limit = 30 * 60 * 1000;

  for (const [userId, data] of userConversations.entries()) {
    if (now - data.lastActivity > limit) {
      userConversations.delete(userId);
    }
  }
}

// ======================
// إرسال الرسالة إلى Gemini
// ======================
async function sendMessageToGemini(userId, text) {
  if (!userConversations.has(userId)) {
    userConversations.set(userId, {
      messages: [
        {
          role: "user",
          parts: [{ text: "أنت مساعد ذكي، أجب باللغة العربية الفصحى." }],
        },
      ],
      lastActivity: Date.now(),
    });
  }

  const conversation = userConversations.get(userId);
  conversation.messages.push({
    role: "user",
    parts: [{ text }],
  });

  conversation.lastActivity = Date.now();
  cleanupOldConversations();

  const payload = {
    contents: conversation.messages,
  };

  const response = await fetch(
    `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Gemini API Error");
  }

  const reply =
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    "عذرًا، لم أستطع توليد رد.";

  conversation.messages.push({
    role: "model",
    parts: [{ text: reply }],
  });

  if (conversation.messages.length > 10) {
    conversation.messages = [
      conversation.messages[0],
      ...conversation.messages.slice(-8),
    ];
  }

  return reply;
}

// ======================
// أوامر البوت
// ======================
bot.onText(/\/start/, async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    `🎉 أهلاً بك!
أنا بوت ذكاء اصطناعي مدعوم بـ Gemini 🤖

✨ يمكنك:
• طرح أي سؤال
• الترجمة
• كتابة النصوص
• المساعدة البرمجية

🚀 أرسل رسالتك الآن`
  );
});

bot.onText(/\/help/, async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    `🆘 الأوامر:
    
/start - بدء البوت
/help - المساعدة
/clear - مسح المحادثة
/info - معلومات البوت`,
    { parse_mode: "Markdown" }
  );
});

bot.onText(/\/clear/, async (msg) => {
  userConversations.delete(msg.from.id);
  await bot.sendMessage(msg.chat.id, "🧹 تم مسح المحادثة.");
});

bot.onText(/\/info/, async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    `🤖 **معلومات البوت**

• النموذج: Gemini 2.5 Flash
• اللغة: العربية
• المستخدمين النشطين: ${userConversations.size}`,
    { parse_mode: "Markdown" }
  );
});

// ======================
// الرسائل العادية
// ======================
bot.on("message", async (msg) => {
  if (!msg.text || msg.text.startsWith("/")) return;

  try {
    await bot.sendChatAction(msg.chat.id, "typing");
    const reply = await sendMessageToGemini(msg.from.id, msg.text);
    await bot.sendMessage(msg.chat.id, reply);
  } catch (err) {
    await bot.sendMessage(
      msg.chat.id,
      `❌ حدث خطأ:\n${err.message}`
    );
  }
});

// ======================
// Webhook Handler (Vercel)
// ======================
export default async function handler(req, res) {
  if (req.method === "POST") {
    await bot.processUpdate(req.body);
    return res.status(200).send("OK");
  }
  res.status(200).send("🤖 Telegram Gemini Bot is running");
}
