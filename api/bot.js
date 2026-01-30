import TelegramBot from "node-telegram-bot-api";

// التحقق من وجود مفاتيح API
if (!process.env.BOT_TOKEN) {
  console.error("❌ BOT_TOKEN غير موجود!");
}
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY غير موجود!");
}

// إنشاء البوت بدون polling
const bot = new TelegramBot(process.env.BOT_TOKEN);

// دالة الاتصال بـ Gemini
async function askGemini(prompt) {
  try {
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
      throw new Error(`API Error: ${response.status} - ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ لا توجد إجابة";
    
  } catch (error) {
    console.error("Gemini Error:", error.message);
    return `❌ خطأ: ${error.message}`;
  }
}

// معالجة الرسائل
bot.on("message", async (msg) => {
  console.log("📨 Received message:", msg.text);
  
  // تجاهل الرسائل غير النصية والأوامر
  if (!msg.text || msg.text.startsWith("/")) return;
  
  const chatId = msg.chat.id;
  
  try {
    // إرسال رسالة الانتظار
    const waitMsg = await bot.sendMessage(chatId, "⏳ جاري التفكير...");
    
    // الحصول على رد من Gemini
    const geminiReply = await askGemini(msg.text);
    
    // حذف رسالة الانتظار
    await bot.deleteMessage(chatId, waitMsg.message_id);
    
    // إرسال الرد
    await bot.sendMessage(chatId, geminiReply);
    
  } catch (error) {
    console.error("Processing error:", error);
    await bot.sendMessage(chatId, `❌ حدث خطأ: ${error.message}`);
  }
});

// معالج Webhook لـ Vercel
export default async function handler(req, res) {
  console.log("🌐 Webhook called with method:", req.method);
  
  if (req.method === 'POST') {
    try {
      const update = req.body;
      console.log("📦 Update received:", update.message?.text || "no text");
      
      // معالجة التحديث
      await bot.processUpdate(update);
      
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error("❌ Webhook error:", error);
      res.status(500).json({ error: error.message });
    }
  } else {
    // صفحة الاختبار عند زيارة الرابط مباشرة
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Telegram Bot Status</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .success { color: green; }
          .error { color: red; }
        </style>
      </head>
      <body>
        <h1>🤖 Telegram + Gemini Bot</h1>
        <p>Status: <span class="success">✅ Running</span></p>
        <p>BOT_TOKEN: ${process.env.BOT_TOKEN ? "✅ Set" : "❌ Missing"}</p>
        <p>GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? "✅ Set" : "❌ Missing"}</p>
        <hr>
        <h3>🔧 Setup Instructions:</h3>
        <ol>
          <li>Set Webhook: <code>https://api.telegram.org/bot[YOUR_BOT_TOKEN]/setWebhook?url=[YOUR_VERCEL_URL]/api/bot</code></li>
          <li>Test Webhook: <code>https://api.telegram.org/bot[YOUR_BOT_TOKEN]/getWebhookInfo</code></li>
        </ol>
        <a href="https://api.telegram.org/bot${process.env.BOT_TOKEN}/getWebhookInfo" target="_blank">📊 Check Webhook Status</a>
      </body>
      </html>
    `);
  }
}
