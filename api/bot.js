import TelegramBot from "node-telegram-bot-api";

// التحقق من التوكنات
console.log("🔍 BOT_TOKEN exists:", !!process.env.BOT_TOKEN);
console.log("🔍 GEMINI_API_KEY exists:", !!process.env.GEMINI_API_KEY);

// إنشاء البوت
const bot = new TelegramBot(process.env.BOT_TOKEN, {
  webHook: true,
  onlyFirstMatch: true
});

// قائمة النماذج التي تعمل
const WORKING_MODELS = [
  "gemini-1.5-flash",
  "gemini-1.5-flash-001",
  "gemini-1.5-flash-latest",
  "gemini-1.0-pro-001"
];

// دالة محسنة للاتصال بـ Gemini
async function askGemini(prompt, modelIndex = 0) {
  if (modelIndex >= WORKING_MODELS.length) {
    return "❌ جميع النماذج فشلت. يرجى التحقق من API Key.";
  }

  const model = WORKING_MODELS[modelIndex];
  console.log(`🔄 محاولة النموذج: ${model}`);
  
  try {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    console.log(`📤 إرسال إلى Gemini (${model}):`, prompt.substring(0, 100));
    
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
          topP: 0.8,
          topK: 40
        }
      }),
      timeout: 30000 // 30 ثانية timeout
    });

    console.log(`📥 استجابة Gemini (${model}):`, response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ خطأ ${response.status} مع النموذج ${model}:`, errorText.substring(0, 200));
      
      // تجربة النموذج التالي
      return await askGemini(prompt, modelIndex + 1);
    }

    const data = await response.json();
    console.log(`✅ نجاح مع النموذج ${model}`);
    
    // استخراج النص
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                 data.candidates?.[0]?.content?.text ||
                 "⚠️ الرد جاء فارغاً";
    
    return text;
    
  } catch (error) {
    console.log(`🔥 استثناء مع النموذج ${model}:`, error.message);
    
    // تجربة النموذج التالي
    return await askGemini(prompt, modelIndex + 1);
  }
}

// معالجة الأوامر والرسائل
bot.on("message", async (msg) => {
  console.log("📩 رسالة جديدة من:", msg.chat.id, "النص:", msg.text);
  
  const chatId = msg.chat.id;
  
  // تجاهل الرسائل غير النصية
  if (!msg.text) return;
  
  // معالجة الأوامر
  if (msg.text.startsWith("/")) {
    const command = msg.text.split(" ")[0];
    
    switch (command) {
      case "/start":
        await bot.sendMessage(chatId, 
          "🚀 **أهلاً بك في بوت Gemini AI**\n\n" +
          "أنا بوت ذكي يستخدم تقنية Google Gemini للإجابة على أسئلتك.\n\n" +
          "📝 **كيفية الاستخدام:**\n" +
          "• اكتب سؤالك مباشرة\n" +
          "• سأرد عليك خلال ثوانٍ\n\n" +
          "🔧 **للإصلاح:**\n" +
          "/test - اختبار الاتصال\n" +
          "/ping - اختبار البوت\n" +
          "/debug - معلومات التصحيح"
        );
        break;
        
      case "/test":
        const testMsg = await bot.sendMessage(chatId, "🔍 جاري اختبار الاتصال...");
        
        try {
          // اختبار بسيط
          const testResponse = await askGemini("قل مرحبا فقط");
          await bot.editMessageText(
            `✅ **نتيجة الاختبار:**\n\n${testResponse}\n\n` +
            `📊 **النماذج المجربة:**\n${WORKING_MODELS.join(", ")}`,
            {
              chat_id: chatId,
              message_id: testMsg.message_id
            }
          );
        } catch (error) {
          await bot.editMessageText(
            `❌ **فشل الاختبار:**\n${error.message}`,
            {
              chat_id: chatId,
              message_id: testMsg.message_id
            }
          );
        }
        break;
        
      case "/ping":
        await bot.sendMessage(chatId, "🏓 Pong! البوت يعمل بشكل طبيعي.");
        break;
        
      case "/debug":
        const debugInfo = {
          botToken: process.env.BOT_TOKEN ? "✅ موجود" : "❌ مفقود",
          geminiKey: process.env.GEMINI_API_KEY ? "✅ موجود" : "❌ مفقود",
          models: WORKING_MODELS,
          timestamp: new Date().toISOString(),
          chatId: chatId
        };
        
        await bot.sendMessage(
          chatId,
          `🐛 **معلومات التصحيح:**\n\n` +
          `• BOT_TOKEN: ${debugInfo.botToken}\n` +
          `• GEMINI_API_KEY: ${debugInfo.geminiKey}\n` +
          `• النماذج: ${WORKING_MODELS.length}\n` +
          `• الوقت: ${debugInfo.timestamp}\n` +
          `• Chat ID: ${debugInfo.chatId}`
        );
        break;
        
      default:
        // تجاهل الأوامر الأخرى
        break;
    }
    
    return;
  }
  
  // معالجة الرسائل العادية
  try {
    // إرسال رسالة "جاري الكتابة"
    const action = await bot.sendChatAction(chatId, "typing");
    
    // إرسال رسالة الانتظار
    const waitMsg = await bot.sendMessage(chatId, "⏳ جاري التفكير في إجابتك...");
    
    // الحصول على الرد من Gemini
    const geminiResponse = await askGemini(msg.text);
    
    // حذف رسالة الانتظار
    await bot.deleteMessage(chatId, waitMsg.message_id);
    
    // إرسال الرد النهائي
    await bot.sendMessage(chatId, geminiResponse, {
      parse_mode: "Markdown",
      disable_web_page_preview: true
    });
    
  } catch (error) {
    console.error("🔥 خطأ في معالجة الرسالة:", error);
    
    try {
      await bot.sendMessage(
        chatId,
        `❌ **عذراً، حدث خطأ:**\n\n` +
        `${error.message}\n\n` +
        `يرجى المحاولة مرة أخرى لاحقاً أو استخدام /test للتحقق.`
      );
    } catch (sendError) {
      console.error("🔥 فشل إرسال رسالة الخطأ:", sendError);
    }
  }
});

// معالج Webhook لـ Vercel
export default async function handler(req, res) {
  console.log(`🌐 ${req.method} request at ${new Date().toISOString()}`);
  
  if (req.method === 'POST') {
    try {
      // التحقق من أن الطلب من Telegram
      const update = req.body;
      
      // تسجيل معلومات الطلب
      console.log("📦 Webhook Update:", {
        update_id: update.update_id,
        message: update.message?.text ? update.message.text.substring(0, 100) : "no text",
        chat_id: update.message?.chat?.id
      });
      
      // معالجة التحديث
      await bot.processUpdate(update);
      
      res.status(200).json({ 
        status: "success",
        message: "Update processed",
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error("❌ Webhook processing error:", error);
      
      res.status(500).json({ 
        status: "error",
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  } else {
    // GET request - صفحة معلومات
    const html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🤖 Telegram Gemini Bot</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            text-align: center;
          }
          .container {
            max-width: 800px;
            margin: 50px auto;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          }
          h1 {
            font-size: 2.5em;
            margin-bottom: 20px;
          }
          .status {
            background: rgba(0, 255, 0, 0.2);
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            border-left: 5px solid #00ff00;
          }
          .config {
            background: rgba(255, 255, 255, 0.1);
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            text-align: right;
          }
          code {
            background: rgba(0, 0, 0, 0.3);
            padding: 10px;
            border-radius: 5px;
            display: block;
            margin: 10px 0;
            font-family: monospace;
            direction: ltr;
            text-align: left;
            overflow-x: auto;
          }
          .btn {
            display: inline-block;
            background: #00ff88;
            color: #000;
            padding: 12px 24px;
            border-radius: 50px;
            text-decoration: none;
            font-weight: bold;
            margin: 10px;
            transition: transform 0.3s;
          }
          .btn:hover {
            transform: translateY(-3px);
            background: #00cc66;
          }
          .steps {
            text-align: right;
            margin: 30px 0;
          }
          .steps ol {
            display: inline-block;
            text-align: right;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🤖 Telegram Gemini Bot</h1>
          
          <div class="status">
            <h2>✅ البوت يعمل</h2>
            <p>${new Date().toLocaleString('ar-SA')}</p>
          </div>
          
          <div class="config">
            <h3>🔧 إعدادات البوت:</h3>
            <p><strong>BOT_TOKEN:</strong> ${process.env.BOT_TOKEN ? '✅ مضبوط' : '❌ مفقود'}</p>
            <p><strong>GEMINI_API_KEY:</strong> ${process.env.GEMINI_API_KEY ? '✅ مضبوط' : '❌ مفقود'}</p>
            <p><strong>النماذج المدعومة:</strong> ${WORKING_MODELS.join(', ')}</p>
          </div>
          
          <div class="steps">
            <h3>📝 خطوات الإعداد:</h3>
            <ol>
              <li>تأكد من صحة BOT_TOKEN و GEMINI_API_KEY</li>
              <li>قم بإعداد Webhook باستخدام الأمر التالي:</li>
            </ol>
            <code>
              curl -X POST https://api.telegram.org/bot${process.env.BOT_TOKEN}/setWebhook?url=${process.env.VERCEL_URL || 'YOUR_VERCEL_URL'}/api/bot
            </code>
            <p>أو افتح هذا الرابط في المتصفح:</p>
            <code>
              https://api.telegram.org/bot${process.env.BOT_TOKEN}/setWebhook?url=${process.env.VERCEL_URL || 'YOUR_VERCEL_URL'}/api/bot
            </code>
          </div>
          
          <div>
            <h3>🔗 روابط سريعة:</h3>
            <a href="https://api.telegram.org/bot${process.env.BOT_TOKEN}/getWebhookInfo" target="_blank" class="btn">📊 حالة Webhook</a>
            <a href="https://makersuite.google.com/app/apikey" target="_blank" class="btn">🔑 Gemini API</a>
            <a href="https://t.me/botfather" target="_blank" class="btn">👨‍💼 BotFather</a>
          </div>
          
          <div style="margin-top: 40px; font-size: 0.9em; opacity: 0.8;">
            <p>💡 <strong>ملاحظة:</strong> إذا لم يعمل البوت، تأكد من:</p>
            <p>1. صحة التوكنات 2. إعداد Webhook 3. تفعيل Gemini API في Google Cloud</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  }
}

// تسجيل بدء التشغيل
console.log("🚀 Telegram Gemini Bot started successfully!");
