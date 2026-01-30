import TelegramBot from "node-telegram-bot-api";

// التحقق من وجود مفاتيح API
if (!process.env.BOT_TOKEN) {
  throw new Error("❌ BOT_TOKEN غير موجود!");
}
if (!process.env.GEMINI_API_KEY) {
  throw new Error("❌ GEMINI_API_KEY غير موجود!");
}

// إنشاء البوت مع تهيئة صحيحة لـ Webhook
const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: false, // تعطيل البولينج لأننا نستخدم Webhook
});

// دالة الاتصال بـ Gemini
async function askGemini(prompt) {
  try {
    console.log("📤 Sending to Gemini:", prompt.substring(0, 100));
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          }
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("❌ Gemini API Error:", error);
      return "⚠️ حدث خطأ في الخدمة. يرجى المحاولة مرة أخرى.";
    }

    const data = await response.json();
    console.log("✅ Gemini response received");
    
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 
           "⚠️ لم أستطع الحصول على رد. يرجى المحاولة مرة أخرى.";
    
  } catch (error) {
    console.error("❌ Gemini Error:", error.message);
    return "❌ تعذر الاتصال بالذكاء الاصطناعي. يرجى المحاولة لاحقًا.";
  }
}

// معالجة أوامر البوت الأساسية
bot.onText(/\/start/, async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    "مرحباً! 👋\nأنا بوت مدعوم بذكاء Gemini الاصطناعي.\n\n" +
    "ما الذي تريد معرفته أو مناقشته اليوم؟\n\n" +
    "الأوامر المتاحة:\n" +
    "/start - عرض هذه الرسالة\n" +
    "/help - المساعدة\n" +
    "/test - اختبار الاتصال"
  );
});

bot.onText(/\/help/, async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    "💡 *كيفية الاستخدام:*\n" +
    "فقط اكتب سؤالك وسأجيبك باستخدام الذكاء الاصطناعي.\n\n" +
    "⚠️ *ملاحظات:*\n" +
    "- قد يستغرق الرد بضع ثوانٍ\n" +
    "- إذا لم أرد، حاول إعادة إرسال السؤال\n" +
    "- استخدم /test للتأكد من عمل البوت\n\n" +
    "📝 يمكنك سؤالي عن أي موضوع!",
    { parse_mode: "Markdown" }
  );
});

bot.onText(/\/test/, async (msg) => {
  const chatId = msg.chat.id;
  const testMsg = await bot.sendMessage(chatId, "🔍 جاري اختبار الاتصال...");
  
  try {
    // اختبار بسيط
    const testReply = await askGemini("قل مرحبا فقط");
    await bot.editMessageText(`✅ الاختبار ناجح!\n\nرد Gemini: ${testReply}`, {
      chat_id: chatId,
      message_id: testMsg.message_id
    });
  } catch (error) {
    await bot.editMessageText(`❌ فشل الاختبار: ${error.message}`, {
      chat_id: chatId,
      message_id: testMsg.message_id
    });
  }
});

// معالجة جميع الرسائل النصية
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  
  // تجاهل إذا كان نص الرسالة فارغاً أو أمراً
  if (!msg.text || msg.text.startsWith("/")) {
    return;
  }
  
  console.log(`📨 Message from ${chatId}: ${msg.text}`);
  
  try {
    // إرسال رسالة "جاري الكتابة" action
    await bot.sendChatAction(chatId, "typing");
    
    // إرسال رسالة الانتظار
    const waitMsg = await bot.sendMessage(chatId, "⏳ جاري التفكير والبحث عن أفضل إجابة...");
    
    // الحصول على رد من Gemini
    const geminiReply = await askGemini(msg.text);
    
    // حذف رسالة الانتظار
    try {
      await bot.deleteMessage(chatId, waitMsg.message_id);
    } catch (e) {
      console.log("⚠️ Could not delete wait message:", e.message);
    }
    
    // إرسال الرد (مع تقسيمه إذا كان طويلاً)
    const maxLength = 4096; // الحد الأقصى لطول رسالة التليجرام
    if (geminiReply.length > maxLength) {
      for (let i = 0; i < geminiReply.length; i += maxLength) {
        await bot.sendMessage(chatId, geminiReply.substring(i, i + maxLength));
      }
    } else {
      await bot.sendMessage(chatId, geminiReply);
    }
    
  } catch (error) {
    console.error("❌ Processing error:", error);
    
    // محاولة إرسال رسالة الخطأ
    try {
      await bot.sendMessage(
        chatId,
        `⚠️ عذراً، حدث خطأ أثناء معالجة طلبك.\n\n` +
        `تفاصيل الخطأ: ${error.message}\n\n` +
        `يرجى المحاولة مرة أخرى أو استخدام /test لفحص الاتصال.`
      );
    } catch (sendError) {
      console.error("❌ Failed to send error message:", sendError);
    }
  }
});

// معالج Webhook لـ Vercel
export default async function handler(req, res) {
  console.log("🌐 Webhook called with method:", req.method);
  
  if (req.method === "POST") {
    try {
      const update = req.body;
      console.log("📦 Update received:", update.message?.text || "No text content");
      
      // معالجة التحديث عبر البوت
      await bot.processUpdate(update);
      
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error("❌ Webhook processing error:", error);
      res.status(500).json({ 
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      });
    }
  } else {
    // صفحة HTML عند زيارة الرابط مباشرة
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Telegram Bot Status</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: white;
          }
          .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          }
          h1 {
            color: white;
            margin-bottom: 30px;
            text-align: center;
            font-size: 2.5em;
          }
          .status-item {
            background: rgba(255, 255, 255, 0.2);
            padding: 15px;
            border-radius: 10px;
            margin: 15px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .status-icon {
            font-size: 1.5em;
          }
          .success { color: #4ade80; }
          .error { color: #f87171; }
          .code {
            background: rgba(0, 0, 0, 0.3);
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            margin: 10px 0;
            word-break: break-all;
          }
          a {
            color: #93c5fd;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🤖 Telegram + Gemini Bot</h1>
          
          <div class="status-item">
            <span>البوت:</span>
            <span class="status-icon ${process.env.BOT_TOKEN ? 'success' : 'error'}">
              ${process.env.BOT_TOKEN ? '✅' : '❌'}
            </span>
          </div>
          
          <div class="status-item">
            <span>Gemini API:</span>
            <span class="status-icon ${process.env.GEMINI_API_KEY ? 'success' : 'error'}">
              ${process.env.GEMINI_API_KEY ? '✅' : '❌'}
            </span>
          </div>
          
          <h3>🔧 إعداد Webhook:</h3>
          <div class="code">
            https://api.telegram.org/bot${process.env.BOT_TOKEN || 'YOUR_TOKEN'}/setWebhook?url=${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}${req.url}
          </div>
          
          <h3>📊 فحص حالة Webhook:</h3>
          <div class="code">
            <a href="https://api.telegram.org/bot${process.env.BOT_TOKEN || 'YOUR_TOKEN'}/getWebhookInfo" target="_blank">
              https://api.telegram.org/bot${process.env.BOT_TOKEN || 'YOUR_TOKEN'}/getWebhookInfo
            </a>
          </div>
          
          <h3>🔄 إزالة Webhook (للتحول إلى Polling):</h3>
          <div class="code">
            https://api.telegram.org/bot${process.env.BOT_TOKEN || 'YOUR_TOKEN'}/deleteWebhook
          </div>
        </div>
      </body>
      </html>
    `);
  }
}
