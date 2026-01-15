const TelegramBot = require('node-telegram-bot-api');
const https = require('https');

// 🔧 التهيئة الأساسية - لا polling هنا!
let bot;

try {
  bot = new TelegramBot(process.env.BOT_TOKEN);
  console.log('✅ Bot initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize bot:', error.message);
}

// 🔑 تحميل API Keys
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const BOT_TOKEN = process.env.BOT_TOKEN || '';

// 📝 رسائل التحقق
console.log('🔑 Bot Token exists:', !!BOT_TOKEN);
console.log('🔑 Gemini Key exists:', !!GEMINI_API_KEY);

// 💾 تخزين بسيط للمحادثات
const userMemory = new Map();

// 🚀 Webhook Handler الرئيسي
module.exports = async (req, res) => {
  console.log(`📨 ${req.method} request received`);
  
  // ✅ الرد السريع على GET
  if (req.method === 'GET') {
    console.log('✅ GET request - Bot is alive');
    return res.status(200).json({
      status: 'active',
      message: '🤖 Telegram Bot is running!',
      memory_usage: userMemory.size,
      time: new Date().toISOString()
    });
  }

  // 📨 معالجة Webhook من Telegram
  if (req.method === 'POST') {
    try {
      const update = req.body;
      console.log('📦 Update received:', JSON.stringify(update).substring(0, 100));

      // التأكد من وجود الرسالة
      if (!update.message) {
        console.log('⚠️ No message in update');
        return res.status(200).json({ status: 'no message' });
      }

      const message = update.message;
      const chatId = message.chat.id;
      const userId = message.from.id;
      const userText = message.text || '';

      console.log(`👤 User ${userId}: ${userText.substring(0, 50)}`);

      // ⚡ معالجة فورية - لا async/await هنا!
      processUpdateImmediately(chatId, userId, userText);

      // ✅ الرد فوراً لـ Telegram
      return res.status(200).json({ 
        status: 'processing',
        chatId,
        userId 
      });

    } catch (error) {
      console.error('❌ Error in webhook:', error);
      return res.status(200).json({ error: 'webhook_error' });
    }
  }

  return res.status(405).json({ error: 'method_not_allowed' });
};

// ⚡ معالجة فورية بدون انتظار
function processUpdateImmediately(chatId, userId, userText) {
  // 🔄 إرسال إشارة الكتابة
  bot.sendChatAction(chatId, 'typing')
    .catch(err => console.log('⚠️ Cannot send typing:', err.message));

  // 🎯 معالجة الأوامر
  if (userText.startsWith('/')) {
    handleCommandAsync(chatId, userId, userText);
    return;
  }

  // 🤖 معالجة الرسالة مع Gemini
  processWithGemini(chatId, userId, userText);
}

// 🎯 معالجة الأوامر
async function handleCommandAsync(chatId, userId, command) {
  console.log(`🎯 Command: ${command}`);
  
  const responses = {
    '/start': `🚀 **مرحباً بك!**\n\nأنا بوت الذكاء الاصطناعي Gemini.\nاكتب لي أي سؤال وسأجيب فوراً!`,
    '/help': `🆘 **الأوامر المتاحة:**\n/start - بدء البوت\n/help - المساعدة\n/ping - اختبار السرعة\n/clear - مسح الذاكرة`,
    '/ping': `🏓 **Pong!**\nالبوت يعمل بنجاح ✅\nالوقت: ${new Date().toLocaleTimeString('ar-SA')}`,
    '/clear': `🧹 تم مسح ذاكرة المحادثة!`
  };

  const response = responses[command] || '⚠️ أمر غير معروف. استخدم /help';
  
  try {
    await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
    console.log(`✅ Sent command response to ${userId}`);
  } catch (error) {
    console.error('❌ Failed to send command:', error.message);
  }
}

// 🤖 معالجة مع Gemini
async function processWithGemini(chatId, userId, userText) {
  console.log(`🤖 Processing with Gemini for user ${userId}`);
  
  try {
    // 📝 إعداد الرسالة
    const history = userMemory.get(userId) || [];
    const context = history.length > 0 
      ? `المحادثة السابقة:\n${history.join('\n')}\n\nسؤال جديد: ${userText}`
      : `أجب بالعربية بإيجاز: ${userText}`;

    // 🚀 إرسال طلب Gemini
    const geminiResponse = await callGeminiAPI(context);
    
    // 💾 تحديث الذاكرة
    userMemory.set(userId, [
      ...history.slice(-4), // الحفاظ على آخر 4 رسائل
      `أنت: ${userText}`,
      `البوت: ${geminiResponse}`
    ]);

    // ✨ إرسال الرد
    await bot.sendMessage(chatId, geminiResponse);
    console.log(`✅ Sent Gemini response to ${userId}`);

  } catch (error) {
    console.error('❌ Gemini processing error:', error.message);
    
    const errorMsg = error.message.includes('API') 
      ? '🔑 مشكلة في مفتاح Gemini API. تحقق من الإعدادات.'
      : '⚠️ حدث خطأ. حاول مرة أخرى.';
    
    bot.sendMessage(chatId, errorMsg)
      .catch(err => console.log('❌ Failed to send error:', err.message));
  }
}

// 📞 استدعاء Gemini API
async function callGeminiAPI(prompt) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500
      }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      },
      timeout: 10000 // 10 ثواني timeout
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          
          if (res.statusCode !== 200) {
            console.error('❌ Gemini API Error:', parsed);
            reject(new Error(parsed.error?.message || `API Error ${res.statusCode}`));
            return;
          }

          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          resolve(text || 'لم أتمكن من توليد رد.');
          
        } catch (parseError) {
          reject(new Error('Failed to parse Gemini response'));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Network error: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(data);
    req.end();
  });
}

// 🧹 تنظيف الذاكرة كل ساعة
setInterval(() => {
  const oneHourAgo = Date.now() - 3600000;
  let cleaned = 0;
  
  for (const [userId] of userMemory.entries()) {
    // تنظيف عشوائي للذاكرة
    if (Math.random() > 0.7) {
      userMemory.delete(userId);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`🧹 Cleaned ${cleaned} user memories`);
  }
}, 3600000);

// ℹ️ رسالة بدء التشغيل
console.log('🚀 Telegram Bot Webhook Server is ready!');
console.log('📌 Make sure to set webhook with:');
console.log(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=<YOUR_VERCEL_URL>`);
