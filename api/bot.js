const { GoogleGenerativeAI } = require('@google/generative-ai');
const TelegramBot = require('node-telegram-bot-api');

// تهيئة المفاتيح من متغيرات البيئة
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const bot = new TelegramBot(process.env.BOT_TOKEN);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).send('AI Bot is running...');
  }

  const { message } = req.body;
  if (!message || !message.text) return res.status(200).end();

  const chatId = message.chat.id;
  const userText = message.text;

  try {
    // 1. إرسال حالة "جاري الكتابة" للمستخدم ليعرف أن الـ AI يفكر
    await bot.sendChatAction(chatId, 'typing');

    // 2. طلب الرد من Gemini (باستخدام المنطق المحدود الذي طلبته)
    const prompt = `أجب بجملة واحدة بسيطة جداً عن: "${userText}". استخدم إيموجي واحد.`;
    const result = await model.generateContent(prompt);
    const aiResponse = result.response.text();

    // 3. إرسال رد الـ AI للمستخدم
    await bot.sendMessage(chatId, `🤖 ${aiResponse}`);

  } catch (error) {
    console.error('AI Error:', error);
    await bot.sendMessage(chatId, "⚠️ عذراً، واجه ذكائي المحدود مشكلة بسيطة.");
  }

  res.status(200).send('OK');
}
