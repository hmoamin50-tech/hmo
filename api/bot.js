// api/index.js

import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";

dotenv.config();

// ======================
// إعدادات Gemini (تحديث 2026)
// ======================
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-latest:generateContent";

// ======================
// تهيئة البوت (Webhook mode - بدون polling)
// ======================
const bot = new TelegramBot(process.env.BOT_TOKEN);

// ======================
// تخزين المحادثات (في الذاكرة - مناسب لـ Vercel Serverless)
// ======================
const userConversations = new Map();

// ======================
// تنظيف المحادثات القديمة (كل 30 دقيقة)
// ======================
function cleanupOldConversations() {
  const now = Date.now();
  const limit = 30 * 60 * 1000; // 30 دقيقة

  for (const [userId, data] of userConversations.entries()) {
    if (now - data.lastActivity > limit) {
      userConversations.delete(userId);
    }
  }
}

// ======================
// إرسال الرسالة إلى Gemini API
// ======================
async function sendMessageToGemini(userId, text) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY غير موجود في المتغيرات البيئية");
  }

  // إنشاء محادثة جديدة إذا لم تكن موجودة
  if (!userConversations.has(userId)) {
    userConversations.set(userId, {
      messages: [
        {
          role: "user",
          parts: [{ text: "أنت مساعد ذكي، أجب باللغة العربية الفصحى دائمًا." }],
        },
      ],
      lastActivity: Date.now(),
    });
  }

  const conversation = userConversations.get(userId);

  // إضافة رسالة المستخدم
  conversation.messages.push({
    role: "user",
    parts: [{ text }],
  });

  conversation.lastActivity = Date.now();

  // تنظيف المحادثات القديمة
  cleanupOldConversations();

  const payload = {
    contents: conversation.messages,
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
    },
  };

  try {
    const response = await fetch(
      `\( {GEMINI_API_URL}?key= \){GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Gemini HTTP ${response.status}`);
    }

    const data = await response.json();

    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "عذرًا، لم أتمكن من توليد رد مناسب.";

    // حفظ رد النموذج في المحادثة
    conversation.messages.push({
      role: "model",
      parts: [{ text: reply }],
    });

    // الحفاظ على حجم المحادثة معقولاً (آخر 9 رسائل + system prompt)
    if (conversation.messages.length > 10) {
      conversation.messages = [
        conversation.messages[0], // system prompt
        ...conversation.messages.slice(-9),
      ];
    }

    return reply;
  } catch (err) {
    console.error("Gemini Error:", err);
    throw err;
  }
}

// ======================
// أوامر البوت
// ======================
bot.onText(/\/start/, async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    `🎉 أهلاً وسهلاً يا ${msg.from.first_name || "صديقي"}!

أنا بوت ذكاء اصطناعي مدعوم بـ Gemini 🤖

يمكنك طرح أي سؤال، طلب ترجمة، كتابة نصوص، مساعدة برمجية، أو حتى الدردشة العامة.

أرسل رسالتك الآن 🚀`
  );
});

bot.onText(/\/help/, async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    `🆘 **الأوامر المتاحة:**

/start - بدء الاستخدام
/help  - عرض هذه الرسالة
/clear - مسح سجل المحادثة
/info  - معلومات عن البوت`,
    { parse_mode: "Markdown" }
  );
});

bot.onText(/\/clear/, async (msg) => {
  userConversations.delete(msg.from.id);
  await bot.sendMessage(msg.chat.id, "🧹 تم مسح سجل المحادثة بنجاح.");
});

bot.onText(/\/info/, async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    `🤖 **معلومات البوت**

• النموذج: Gemini 2.5 Flash (latest)
• اللغة الرئيسية: العربية الفصحى
• عدد المحادثات النشطة حاليًا: ${userConversations.size}
• تم التحديث: يناير 2026`,
    { parse_mode: "Markdown" }
  );
});

// ======================
// معالجة الرسائل العادية (غير الأوامر)
// ======================
bot.on("message", async (msg) => {
  // تجاهل الرسائل بدون نص أو التي تبدأ بـ /
  if (!msg.text || msg.text.startsWith("/")) return;

  try {
    await bot.sendChatAction(msg.chat.id, "typing");

    const reply = await sendMessageToGemini(msg.from.id, msg.text);

    await bot.sendMessage(msg.chat.id, reply, {
      parse_mode: reply.includes("```") ? "MarkdownV2" : undefined,
    });
  } catch (err) {
    console.error("Message handler error:", err);
    await bot.sendMessage(
      msg.chat.id,
      `❌ حدث خطأ أثناء المعالجة:\n${err.message || "غير معروف"}`
    );
  }
});

// ======================
// Webhook Handler لـ Vercel
// ======================
export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      // معالجة التحديث من Telegram
      await bot.processUpdate(req.body);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Webhook error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }

  // رد بسيط للطلبات GET (مفيد للتحقق من Vercel)
  res.status(200).send("Telegram Gemini Bot is running 🚀\nTime: " + new Date().toISOString());
}
