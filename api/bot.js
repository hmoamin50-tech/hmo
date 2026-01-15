const { GoogleGenerativeAI } = require('@google/generative-ai');
const TelegramBot = require('node-telegram-bot-api');

// تهيئة الأدوات باستخدام متغيرات البيئة التي ضبطتها في Vercel
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const bot = new TelegramBot(process.env.BOT_TOKEN);
const model = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-flash',
  generationConfig: { maxOutputTokens: 100, temperature: 0.7 }
});

export default async function handler(req, res) {
  // استقبال طلبات POST فقط من تلجرام
  if (req.method !== 'POST') {
    return res.status(200).send('Bot is Active ✅');
  }

  const { message, callback_query } = req.body;
  const chatId = message?.chat?.id || callback_query?.message?.chat?.id;
  const text = message?.text;

  try {
    // 1. التعامل مع أمر البدء
    if (text === '/start') {
      await bot.sendMessage(chatId, 
        "🌸 مرحباً بك في مختبر التوافق العاطفي!\n\n" +
        "أنا ذكاء اصطناعي بسيط، أرسل لي أي رسالة وسأرد عليك بذكائي المحدود، أو انتظر تحديث نظام الأسئلة بالكامل قريباً! 😊"
      );
      return res.status(200).end();
    }

    // 2. معالجة الرسائل النصية باستخدام Gemini
    if (text) {
      // إظهار حالة "جاري الكتابة" في تلجرام
      await bot.sendChatAction(chatId, 'typing');

      // إعداد الطلب لـ Gemini
      const prompt = `أنت بوت بسيط جداً للمشاعر. رد بجملة واحدة (5 كلمات) وإيموجي واحد على: "${text}"`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const aiResponse = response.text();

      // إرسال رد الـ AI للمستخدم
      await bot.sendMessage(chatId, `🤖 ${aiResponse}`);
    }

  } catch (error) {
    console.error('Error Details:', error);
    // إرسال رسالة خطأ واضحة للمستخدم في حال فشل الـ API
    await bot.sendMessage(chatId, `⚠️ عذراً، حدث خطأ: ${error.message.includes('API key') ? 'مشكلة في مفتاح API' : 'مشكلة تقنية مؤقتة'}`);
  }

  // إغلاق الطلب بنجاح
  res.status(200).end();
}
