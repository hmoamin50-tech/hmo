import TelegramBot from "node-telegram-bot-api";

// إنشاء البوت (Webhook فقط)
const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: false
});

// دالة الاتصال بـ Gemini
async function askGemini(prompt) {
  try {
    console.log("Sending prompt to Gemini:", prompt.substring(0, 50) + "...");
    
    // استخدم نموذج gemini-pro أو gemini-1.5-flash (أكثر استقرارًا)
    const MODEL_NAME = "gemini-pro";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        }
      }),
    });

    console.log("Gemini response status:", response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API Error:", errorData);
      return `⚠️ خطأ في API: ${response.status} - ${JSON.stringify(errorData.error || errorData)}`;
    }

    const data = await response.json();
    console.log("Gemini response data:", JSON.stringify(data).substring(0, 200));
    
    // محاولات مختلفة لاستخراج النص
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ||
                 data.candidates?.[0]?.content?.text ||
                 data.text ||
                 "لم أستطع استخراج النص من الرد 🤖";
    
    return text.trim() || "⚠️ الرد جاء فارغًا من Gemini";
    
  } catch (err) {
    console.error("Gemini Fetch Error:", err);
    return `❌ تعذر الاتصال بـ Gemini: ${err.message}`;
  }
}

// أمر /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(
    chatId,
    "أهلاً 👋\nاكتب سؤالك وسأجيبك باستخدام Gemini 🤖\n\nلتجربة الاتصال: /test"
  );
});

// أمر /test لاختبار الاتصال بـ Gemini
bot.onText(/\/test/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId, "🔍 جاري اختبار الاتصال بـ Gemini...");
  
  const testPrompt = "أجب بكلمة 'نجاح' فقط";
  const reply = await askGemini(testPrompt);
  
  await bot.sendMessage(chatId, `نتيجة الاختبار: ${reply}`);
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
    console.log(`Processing message from ${chatId}: ${msg.text}`);
    const reply = await askGemini(msg.text);
    console.log(`Reply for ${chatId}: ${reply.substring(0, 50)}...`);

    // حذف مؤشر الكتابة
    if (typingMessageId) {
      try {
        await bot.deleteMessage(chatId, typingMessageId);
      } catch (e) {
        console.log("Could not delete typing message:", e.message);
      }
    }

    // إرسال الرد النهائي (اقسّم إذا كان طويلاً)
    if (reply.length > 4096) {
      for (let i = 0; i < reply.length; i += 4096) {
        await bot.sendMessage(chatId, reply.substring(i, i + 4096));
      }
    } else {
      await bot.sendMessage(chatId, reply);
    }

  } catch (err) {
    console.error("Bot Error:", err);

    // إزالة مؤشر الكتابة عند حدوث خطأ
    if (typingMessageId) {
      try {
        await bot.deleteMessage(chatId, typingMessageId);
      } catch (e) {}
    }

    await bot.sendMessage(
      chatId, 
      `⚠️ حدث خطأ: ${err.message}\n\nيرجى المحاولة مرة أخرى أو استخدام /test لفحص الاتصال.`
    );
  }
});

// Webhook Handler (Vercel)
export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      console.log("Webhook received:", JSON.stringify(req.body).substring(0, 200));
      await bot.processUpdate(req.body);
      return res.status(200).send("ok");
    } catch (err) {
      console.error("Webhook Error:", err);
      return res.status(500).send("error");
    }
  }

  // عند فتح الرابط في المتصفح
  res.status(200).send(`
    Telegram + Gemini is running ✅
    <br><br>
    <a href="https://console.cloud.google.com/apis/credentials" target="_blank">🔗 تحقق من Google Cloud Console</a>
    <br>
    <a href="https://makersuite.google.com/app/apikey" target="_blank">🔗 تحقق من API Keys</a>
  `);
          }
