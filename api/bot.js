const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');

// تهيئة البوت
const bot = new TelegramBot(process.env.BOT_TOKEN);
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// تخزين المحادثات (للسياق)
const conversations = new Map();

// ⚡ Webhook Handler الرئيسي
module.exports = async (req, res) => {
  // الرد على طلبات GET
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'active',
      users: conversations.size,
      timestamp: new Date().toISOString()
    });
  }

  // معالجة طلبات POST
  if (req.method === 'POST') {
    const message = req.body.message;
    if (!message?.text) return res.status(200).end();

    const chatId = message.chat.id;
    const userId = message.from.id;
    const userText = message.text.trim();

    // معالجة الأوامر الخاصة
    if (userText.startsWith('/')) {
      await handleCommand(chatId, userId, userText);
      return res.status(200).end();
    }

    // معالجة الرسائل العادية
    await processMessage(chatId, userId, userText);
    return res.status(200).end();
  }

  return res.status(405).end();
};

// 🚀 معالجة الرسائل بسرعة
async function processMessage(chatId, userId, userText) {
  try {
    // إظهار حالة "يكتب..." لمدة قصيرة
    await bot.sendChatAction(chatId, 'typing');
    
    // الحصول على تاريخ المحادثة أو إنشاء جديد
    if (!conversations.has(userId)) {
      conversations.set(userId, [
        { role: 'user', parts: [{ text: 'أنت مساعد سريع ومفيد. أجب بإيجاز وبالعربية.' }] }
      ]);
    }

    const userHistory = conversations.get(userId);
    
    // إضافة رسالة المستخدم
    userHistory.push({ role: 'user', parts: [{ text: userText }] });

    // إرسال طلب سريع إلى Gemini
    const startTime = Date.now();
    const response = await fetch(
      `${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: userHistory.slice(-6), // الحفاظ على آخر 6 رسائل فقط للسرعة
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800 // تقليل الطول لزيادة السرعة
          }
        })
      }
    );

    const data = await response.json();
    const responseTime = Date.now() - startTime;
    console.log(`⚡ Response time: ${responseTime}ms`);

    // التحقق من الاستجابة
    if (!response.ok) {
      throw new Error(data.error?.message || 'API Error');
    }

    const botReply = data?.candidates?.[0]?.content?.parts?.[0]?.text 
      || "لم أتمكن من توليد رد. يمكنك إعادة السؤال؟";

    // إضافة رد البوت إلى التاريخ
    userHistory.push({ role: 'model', parts: [{ text: botReply }] });

    // تقليل التاريخ إذا كان طويلاً
    if (userHistory.length > 8) {
      conversations.set(userId, [
        userHistory[0], // الحفاظ على التعليمات الأولية
        ...userHistory.slice(-6) // آخر 6 رسائل
      ]);
    }

    // إرسال الرد مع مؤشر الأداء إذا كان بطيئاً
    let finalReply = botReply;
    if (responseTime > 3000) {
      finalReply = `⚡ (تمت المعالجة في ${responseTime}ms)\n\n${botReply}`;
    }

    await bot.sendMessage(chatId, finalReply);

  } catch (error) {
    console.error('Error:', error.message);
    
    // رسائل خطأ ودية
    let errorMsg = "⚠️ حدث خطأ، حاول مرة أخرى.";
    
    if (error.message.includes('API key') || error.message.includes('403')) {
      errorMsg = "🔑 مشكلة في المفتاح. تأكد من صحة Gemini API Key.";
    } else if (error.message.includes('timeout') || error.message.includes('network')) {
      errorMsg = "🌐 مشكلة في الاتصال. يرجى المحاولة مرة أخرى.";
    } else if (error.message.includes('quota')) {
      errorMsg = "💰 تجاوزت الحصة اليومية لـ Gemini API.";
    }
    
    await bot.sendMessage(chatId, errorMsg);
  }
}

// 🎯 معالجة الأوامر
async function handleCommand(chatId, userId, command) {
  switch (command) {
    case '/start':
      const welcome = `🚀 **أهلاً بك!**\n\n`
        + `أنا بوت Gemini السريع ⚡\n`
        + `• أرد خلال ثوانٍ\n`
        + `• أتذكر محادثتنا\n`
        + `• أتحدث العربية بطلاقة\n\n`
        + `📝 اكتب سؤالك الآن!`;
      await bot.sendMessage(chatId, welcome, { parse_mode: 'Markdown' });
      break;

    case '/help':
      const help = `🆘 **الأوامر:**\n`
        + `/start - بدء البوت\n`
        + `/help - هذه الرسالة\n`
        + `/clear - مسح الذاكرة\n`
        + `/speed - فحص السرعة\n`
        + `/stats - إحصائيات\n\n`
        + `💡 **نصائح للسرعة:**\n`
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
      const pingMsg = await bot.sendMessage(chatId, '🏓 فحص السرعة...');
      const end = Date.now();
      const speedMsg = `⚡ **الأداء:**\n`
        + `• وقت الاستجابة: ${end - start}ms\n`
        + `• المستخدمين النشطين: ${conversations.size}\n`
        + `• الحالة: ${end - start < 1000 ? 'سريع 🚀' : 'عادي ⏱️'}`;
      await bot.editMessageText(speedMsg, {
        chat_id: chatId,
        message_id: pingMsg.message_id,
        parse_mode: 'Markdown'
      });
      break;

    case '/stats':
      const stats = `📊 **إحصائيات:**\n`
        + `• المستخدمين النشطين: ${conversations.size}\n`
        + `• مشغل على: Vercel\n`
        + `• النموذج: Gemini 2.5 Flash\n`
        + `• الوقت: ${new Date().toLocaleTimeString('ar-SA')}\n\n`
        + `⚡ **مصمم للسرعة**`;
      await bot.sendMessage(chatId, stats, { parse_mode: 'Markdown' });
      break;

    case '/ping':
      await bot.sendMessage(chatId, '🏓 Pong! البوت يعمل بنجاح ✅');
      break;

    default:
      await bot.sendMessage(chatId, '⚠️ أمر غير معروف. جرب /help');
  }
}

// 🧹 تنظيف المحادثات القديمة (كل ساعة)
setInterval(() => {
  const now = Date.now();
  for (const [userId, conversation] of conversations.entries()) {
    // افترض أن كل محادثة تحتوي على timestamp
    if (conversation.lastActive && now - conversation.lastActive > 3600000) {
      conversations.delete(userId);
    }
  }
  console.log(`🧹 Cleaned old conversations. Active: ${conversations.size}`);
}, 3600000); // كل ساعة
