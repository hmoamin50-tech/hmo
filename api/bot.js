import TelegramBot from "node-telegram-bot-api";

console.log("🚀 بدء تشغيل البوت...");

// التحقق من المفاتيح
if (!process.env.BOT_TOKEN) {
  console.error("❌ BOT_TOKEN غير موجود في متغيرات البيئة");
  throw new Error("BOT_TOKEN مطلوب");
}

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY غير موجود");
  throw new Error("GEMINI_API_KEY مطلوب");
}

// إنشاء البوت - مهم جداً: بدون polling
const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: false,
  webHook: false
});

console.log("✅ البوت تم إنشاؤه");

// دالة Gemini المحسنة
async function askGemini(prompt) {
  console.log(`📤 طلب Gemini: ${prompt.substring(0, 50)}...`);
  
  try {
    const MODEL = "gemini-1.5-flash"; // أكثر استقراراً
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        }),
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      console.error("❌ خطأ Gemini:", data);
      return "⚠️ حدث خطأ في خدمة الذكاء الاصطناعي";
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ||
                 "⚠️ لم أستطع فهم الرد";
    
    console.log(`✅ رد Gemini: ${text.substring(0, 50)}...`);
    return text;
    
  } catch (error) {
    console.error("❌ خطأ اتصال Gemini:", error.message);
    return "❌ تعذر الاتصال بالخدمة. حاول مرة أخرى.";
  }
}

// الأمر /start
bot.onText(/\/start/, async (msg) => {
  console.log(`👋 بدء محادثة جديدة مع ${msg.chat.id}`);
  await bot.sendMessage(msg.chat.id,
    "أهلاً بك! 👋\n" +
    "أنا بوت مدعوم بذكاء Gemini الاصطناعي من Google.\n\n" +
    "✍️ *ما عليك سوى كتابة سؤالك وسأجيبك فوراً!*\n\n" +
    "🔍 لاختبار البوت: /test\n" +
    "❓ للمساعدة: /help",
    { parse_mode: "Markdown" }
  );
});

// الأمر /test
bot.onText(/\/test/, async (msg) => {
  const chatId = msg.chat.id;
  console.log(`🧪 اختبار البوت من ${chatId}`);
  
  const testMsg = await bot.sendMessage(chatId, "🔍 جاري اختبار الاتصال...");
  
  try {
    const reply = await askGemini("قل 'مرحباً، أنا أعمل بشكل صحيح!' فقط");
    await bot.editMessageText(`✅ *الاختبار ناجح!*\n\n${reply}`, {
      chat_id: chatId,
      message_id: testMsg.message_id,
      parse_mode: "Markdown"
    });
  } catch (error) {
    await bot.editMessageText(`❌ *فشل الاختبار:*\n${error.message}`, {
      chat_id: chatId,
      message_id: testMsg.message_id
    });
  }
});

// الأمر /help
bot.onText(/\/help/, async (msg) => {
  await bot.sendMessage(msg.chat.id,
    "💡 *كيفية الاستخدام:*\n" +
    "1. اكتب سؤالك مباشرة\n" +
    "2. انتظر قليلاً حتى أفكر\n" +
    "3. سأرد عليك بأفضل إجابة\n\n" +
    "⚡ *ملاحظات:*\n" +
    "- يمكنك سؤالي عن أي موضوع\n" +
    "- الرد يستغرق 3-5 ثواني\n" +
    "- إذا توقف البوت، أرسل /start\n\n" +
    "🔧 للمساعدة التقنية: @yourusername",
    { parse_mode: "Markdown" }
  );
});

// معالجة جميع الرسائل النصية
bot.on("message", async (msg) => {
  // تجاهل الأوامر والرسائل غير النصية
  if (!msg.text || msg.text.startsWith("/")) return;
  
  const chatId = msg.chat.id;
  const userText = msg.text;
  
  console.log(`💬 رسالة من ${chatId}: ${userText}`);
  
  try {
    // إظهار حالة "يكتب"
    await bot.sendChatAction(chatId, "typing");
    
    // إرسال رسالة الانتظار
    const waitMsg = await bot.sendMessage(chatId, "⏳ جاري البحث عن أفضل إجابة...");
    
    // الحصول على الرد من Gemini
    const reply = await askGemini(userText);
    
    // حذف رسالة الانتظار
    try {
      await bot.deleteMessage(chatId, waitMsg.message_id);
    } catch (e) {
      console.log("⚠️ لم أستطع حذف رسالة الانتظار");
    }
    
    // إرسال الرد النهائي
    await bot.sendMessage(chatId, reply);
    
  } catch (error) {
    console.error(`❌ خطأ في معالجة الرسالة:`, error);
    await bot.sendMessage(chatId,
      `⚠️ عذراً، حدث خطأ:\n\`${error.message}\`\n\nيرجى المحاولة مرة أخرى.`,
      { parse_mode: "Markdown" }
    );
  }
});

// معالج Webhook لـ Vercel
export default async function handler(req, res) {
  console.log("🌐 Webhook called:", req.method);
  
  if (req.method === "POST") {
    try {
      const update = req.body;
      console.log("📦 تحديث وارد:", update.message?.text || "بدون نص");
      
      await bot.processUpdate(update);
      res.status(200).json({ ok: true });
      
    } catch (error) {
      console.error("❌ خطأ Webhook:", error);
      res.status(500).json({ error: error.message });
    }
  } else {
    // صفحة HTML للتحقق
    const vercelUrl = `https://${req.headers.host}`;
    const webhookUrl = `${vercelUrl}/api/bot`;
    
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>🤖 حالة البوت</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .card {
            background: #f5f5f5;
            padding: 20px;
            border-radius: 10px;
            margin: 10px 0;
          }
          .success { color: green; }
          .error { color: red; }
          code {
            background: #333;
            color: white;
            padding: 10px;
            display: block;
            border-radius: 5px;
            margin: 10px 0;
            overflow-x: auto;
          }
        </style>
      </head>
      <body>
        <h1>🤖 حالة بوت التليجرام</h1>
        
        <div class="card">
          <h3>✅ خطوات التفعيل:</h3>
          <ol>
            <li>انسخ رابط Webhook التالي:</li>
            <code id="webhookUrl">${webhookUrl}</code>
            <button onclick="copyUrl()">نسخ الرابط</button>
            
            <li>افتح هذا الرابط في المتصفح لتعيين Webhook:</li>
            <code>
              https://api.telegram.org/bot${process.env.BOT_TOKEN}/setWebhook?url=${webhookUrl}
            </code>
            
            <li>افتح تليجرام وابحث عن بوتك: <strong>@${process.env.BOT_USERNAME || 'YOUR_BOT'}</strong></li>
            <li>أرسل <code>/start</code> للبوت</li>
          </ol>
        </div>
        
        <div class="card">
          <h3>🔍 فحص الإعدادات:</h3>
          <p>BOT_TOKEN: ${process.env.BOT_TOKEN ? '<span class="success">✅ موجود</span>' : '<span class="error">❌ مفقود</span>'}</p>
          <p>GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '<span class="success">✅ موجود</span>' : '<span class="error">❌ مفقود</span>'}</p>
        </div>
        
        <div class="card">
          <h3>📊 روابط مفيدة:</h3>
          <ul>
            <li><a href="https://api.telegram.org/bot${process.env.BOT_TOKEN}/getWebhookInfo" target="_blank">📈 فحص حالة Webhook</a></li>
            <li><a href="https://api.telegram.org/bot${process.env.BOT_TOKEN}/getMe" target="_blank">🤖 معلومات البوت</a></li>
            <li><a href="https://t.me/${process.env.BOT_USERNAME || 'YOUR_BOT'}" target="_blank">💬 فتح البوت</a></li>
          </ul>
        </div>
        
        <script>
          function copyUrl() {
            const url = document.getElementById('webhookUrl').innerText;
            navigator.clipboard.writeText(url);
            alert('تم نسخ الرابط: ' + url);
          }
        </script>
      </body>
      </html>
    `);
  }
}
