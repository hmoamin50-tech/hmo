const TelegramBot = require('node-telegram-bot-api');

// ملاحظة: في Vercel نستخدم متغيرات البيئة (Environment Variables) للأمان
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token);

export default async function handler(req, res) {
  // التأكد من أن الطلب آتٍ من تلغرام (POST Request)
  if (req.method === 'POST') {
    const { message } = req.body;

    if (message && message.text) {
      const chatId = message.chat.id;
      const userText = message.text;

      try {
        // الرد على المستخدم
        await bot.sendMessage(chatId, `وصلت رسالتك: "${userText}" عبر Vercel! 🚀`);
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }

    // إخبار تلغرام أننا استلمنا الطلب بنجاح (ضروري جداً)
    res.status(200).send('OK');
  } else {
    // إذا حاول شخص فتح الرابط من المتصفح
    res.status(200).send('البوت يعمل بنجاح! قم بربط الـ Webhook الخاص بك.');
  }
}
