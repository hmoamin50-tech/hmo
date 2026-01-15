const { GoogleGenerativeAI } = require('@google/generative-ai');
const TelegramBot = require('node-telegram-bot-api');

// تهيئة API Gemini مع تحديد الإصدار لحل مشكلة الـ 404
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const bot = new TelegramBot(process.env.BOT_TOKEN);

// تعيين النموذج مع إعدادات توافق إضافية
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash" 
}, { apiVersion: 'v1beta' }); 

export default async function handler(req, res) {
  // استقبال طلبات تلجرام فقط
  if (req.method !== 'POST') {
    return res.status(200).send('Bot Status: Active ✅');
  }

  const { message } = req.body;

  // إذا لم تكن هناك رسالة نصية، تجاهل الطلب
  if (!message || !message.text) {
    return res.status(200).end();
  }

  const chatId = message.chat.id;
  const userText = message.text;

  try {
    // إظهار أن البوت يكتب الآن
    await bot.sendChatAction(chatId, 'typing');

    // منطق البدء
    if (userText === '/start') {
      await bot.sendMessage(chatId, "🌸 أهلاً بك! أنا الآن متصل بذكاء Gemini. أرسل أي شيء وسأرد عليك.");
      return res.status(200).end();
    }

    // إرسال النص لـ Gemini للحصول على رد
    const prompt = `رد بجملة واحدة بسيطة كصديق على: "${userText}"`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiText = response.text();

    // إرسال رد الذكاء الاصطناعي للمستخدم
    await bot.sendMessage(chatId, `🤖 ${aiText}`);

  } catch (error) {
    console.error('Error Details:', error);
    
    // رد مخصص في حال فشل الـ AI لتعرف السبب
    let errorMessage = "⚠️ واجهت مشكلة في الاتصال بذكائي.";
    if (error.message.includes('404')) errorMessage = "⚠️ خطأ: النموذج غير متاح في منطقتك حالياً.";
    if (error.message.includes('API key')) errorMessage = "⚠️ خطأ: مفتاح API غير صحيح أو غير مفعل.";
    
    await bot.sendMessage(chatId, errorMessage);
  }

  // إنهاء الطلب بنجاح لـ Vercel
  res.status(200).end();
}
