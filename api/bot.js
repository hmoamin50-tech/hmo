const TelegramBot = require('node-telegram-bot-api');

// استخدام fetch المدمج في Node.js 18+
const fetch = globalThis.fetch || require('node-fetch');

// تهيئة البوت بدون polling
const bot = new TelegramBot(process.env.BOT_TOKEN);

// ⚡ متغيرات API
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

// ⚡ تخزين بسيط للمحادثات
const conversations = new Map();

// ⚡ Webhook Handler الرئيسي
module.exports = async (req, res) => {
  // 🔄 الرد السريع على GET
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'active',
      message: 'Telegram Bot is running on Vercel',
      users: conversations.size,
      time: new Date().toISOString()
    });
  }

  // 📨 معالجة Webhook من Telegram
  if (req.method === 'POST') {
    try {
      const update = req.body;
      
      // تجاهل التحديثات غير المرغوب فيها
      if (!update.message || !update.message.text) {
        return res.status(200).end();
      }

      const message = update.message;
      const chatId = message.chat.id;
      const userId = message.from.id;
      const userText = message.text.trim();

      console.log(`📩 رسالة من ${userId}: ${userText.substring(0, 50)}...`);

      // 🎯 معالجة الأوامر السريعة
      if (userText.startsWith('/')) {
        await handleCommand(chatId, userId, userText);
        return res.status(200).end();
      }

      // ⚡ معالجة الرسالة
      await processMessage(chatId, userId, userText);
      return res.status(200).end();

    } catch (error) {
      console.error('❌ Webhook error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).end();
};

// ⚡ معالجة الرسائل بسرعة فائقة
async function processMessage(chatId, userId, userText) {
  try {
    // 🚀 إرسال إشارة الكتابة بسرعة
    await bot.sendChatAction(chatId, 'typing');
    
    // 💾 إدارة الذاكرة البسيطة
    if (!conversations.has(userId)) {
      conversations.set(userId, []);
    }
    
    const userHistory = conversations.get(userId);
    
    // 📝 إعداد prompt سريع
    const prompt = userHistory.length > 0 
      ? `${userHistory.join('\n')}\nالمستخدم: ${userText}\nالمساعد:`
      : `أجب بإيجاز وبالعربية الفصحى: ${userText}`;

    // ⏱️ قياس وقت الاستجابة
    const startTime = Date.now();
    
    // 🚀 طلب سريع إلى Gemini
    const response = await fetch(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 600 // ⬅️ تقليل للسرعة
          }
        })
      }
    );

    const data = await response.json();
    const responseTime = Date.now() - startTime;
    
    console.log(`⚡ Gemini response time: ${responseTime}ms`);

    if (!response.ok) {
      console.error('Gemini API Error:', data);
      throw new Error(data.error?.message || 'API Error');
    }

    const botReply = data?.candidates?.[0]?.content?.parts?.[0]?.text 
      || "أحتاج إلى تفكير أكثر. يمكنك إعادة صياغة سؤالك؟";

    // 💾 تحديث التاريخ (محدود للسرعة)
    userHistory.push(`المستخدم: ${userText}`);
    userHistory.push(`المساعد: ${botReply}`);
    
    // 🧹 الحفاظ على التاريخ قصير
    if (userHistory.length > 10) {
      conversations.set(userId, userHistory.slice(-10));
    }

    // ✨ إرسال الرد بسرعة
    await bot.sendMessage(chatId, botReply);

  } catch (error) {
    console.error('❌ Error in processMessage:', error.message);
    
    // 📨 رسائل خطأ ودية وسريعة
    let errorMsg = "⚠️ حدث خطأ. حاول مرة أخرى.";
    
    if (error.message.includes('API key')) {
      errorMsg = "🔑 مشكلة في المفتاح. تأكد من Gemini API Key في إعدادات Vercel.";
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      errorMsg = "🌐 مشكلة في الاتصال. تحقق من الإنترنت وحاول مجدداً.";
    } else if (error.message.includes('quota')) {
      errorMsg = "💰 تجاوزت الحصة. حاول غداً أو استخدم مفتاحاً مختلفاً.";
    }
    
    await bot.sendMessage(chatId, errorMsg);
  }
}

// 🎯 معالجة الأوامر السريعة
async function handleCommand(chatId, userId, command) {
  switch (command) {
    case '/start':
      const welcome = `🚀 **أهلاً بك!**\n\n`
        + `أنا بوت Gemini السريع ⚡\n`
        + `• أرد خلال 2-3 ثواني\n`
        + `• أتحدث العربية بطلاقة\n`
        + `• أعمل على Vercel\n\n`
        + `💬 اكتب سؤالك الآن!`;
      await bot.sendMessage(chatId, welcome, { parse_mode: 'Markdown' });
      break;

    case '/help':
      const help = `🆘 **الأوامر:**\n\n`
        + `/start - بدء البوت\n`
        + `/help - المساعدة\n`
        + `/clear - مسح الذاكرة\n`
        + `/speed - فحص السرعة\n`
        + `/ping - اختبار الاتصال\n\n`
        + `⚡ **للحصول على أسرع رد:**\n`
        + `• اكتب بوضوح\n`
        + `• استخدم جمل قصيرة\n`
        + `• أول رد قد يكون أبطأ قليلاً`;
      await bot.sendMessage(chatId, help, { parse_mode: 'Markdown' });
      break;

    case '/clear':
      conversations.delete(userId);
      await bot.sendMessage(chatId, '🧹 تم مسح ذاكرة المحادثة!');
      break;

    case '/speed':
      const start = Date.now();
      await bot.sendChatAction(chatId, 'typing');
      const end = Date.now();
      const speedMsg = `⚡ **الأداء:**\n`
        + `• وقت الاستجابة: ${end - start}ms\n`
        + `• المستخدمين النشطين: ${conversations.size}\n`
        + `• حالة السيرفر: نشط 🟢`;
      await bot.sendMessage(chatId, speedMsg, { parse_mode: 'Markdown' });
      break;

    case '/ping':
      await bot.sendMessage(chatId, '🏓 Pong! البوت يعمل بنجاح ✅');
      break;

    case '/stats':
      const stats = `📊 **الإحصائيات:**\n`
        + `• المستخدمين النشطين: ${conversations.size}\n`
        + `• الخدمة: Vercel + Gemini\n`
        + `• الوقت: ${new Date().toLocaleTimeString('ar-SA')}\n\n`
        + `⚡ **مصمم للسرعة القصوى**`;
      await bot.sendMessage(chatId, stats, { parse_mode: 'Markdown' });
      break;

    default:
      await bot.sendMessage(chatId, '⚠️ أمر غير معروف. استخدم /help');
  }
}

// 🧹 تنظيف الذاكرة التلقائي
setInterval(() => {
  const oneHourAgo = Date.now() - 3600000;
  let cleaned = 0;
  
  for (const [userId, history] of conversations.entries()) {
    if (history.length > 0) {
      // تنظيف بسيط بناءً على الطول
      if (history.length > 20) {
        conversations.delete(userId);
        cleaned++;
      }
    }
  }
  
  if (cleaned > 0) {
    console.log(`🧹 تم تنظيف ${cleaned} محادثة قديمة`);
  }
}, 300000); // كل 5 دقائق

// ℹ️ رسالة البدء (للتنفيذ المحلي فقط)
if (process.env.NODE_ENV === 'development') {
  console.log('🤖 Bot is running in development mode...');
  console.log('🔧 Set webhook URL:');
  console.log(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/setWebhook?url=<YOUR_VERCEL_URL>/api`);
}
