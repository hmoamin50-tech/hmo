const { GoogleGenerativeAI } = require('@google/generative-ai');
const TelegramBot = require('node-telegram-bot-api');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const bot = new TelegramBot(process.env.BOT_TOKEN);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).send('Active');

  const { message, callback_query } = req.body;
  const chatId = message?.chat?.id || callback_query?.message?.chat?.id;
  const text = message?.text;

  try {
    // إذا أرسل المستخدم /start
    if (text === '/start') {
      await bot.sendMessage(chatId, "🌸 مرحباً بك! أنا ذكاء اصطناعي بسيط. أرسل أي شيء لأحلله لك.");
      return res.status(200).end();
    }

    // إذا كانت رسالة نصية عادية، نستخدم Gemini
    if (text) {
      await bot.sendChatAction(chatId, 'typing');
      
      const prompt = `أجب بجملة واحدة بسيطة جداً (5-7 كلمات) عن: "${text}". استخدم إيموجي واحد فقط.`;
      const result = await model.generateContent(prompt);
      const aiResponse = result.response.text();

      await bot.sendMessage(chatId, aiResponse);
    }
  } catch (error) {
    console.error('Error:', error);
    // هذه هي الرسالة التي تظهر لك في الصورة
    await bot.sendMessage(chatId, "⚠️ تأكد من ضبط GEMINI_API_KEY في Vercel.");
  }

  res.status(200).end();
}
