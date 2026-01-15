const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');

// تهيئة البوت (Webhook mode)
const bot = new TelegramBot(process.env.BOT_TOKEN, { webHook: true });

// Gemini API
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(200).send('🤖 البوت يعمل بنجاح');
  }

  try {
    const message = req.body.message;
    if (!message?.text) return res.status(200).end();

    const chatId = message.chat.id;
    const userText = message.text;

    await bot.sendChatAction(chatId, 'typing');

    const response = await fetch(
      `${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: userText }]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Gemini API Error');
    }

    const botReply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "🤖 لم أتمكن من توليد رد واضح، حاول إعادة الصياغة.";

    await bot.sendMessage(chatId, botReply);

  } catch (error) {
    console.error('❌ Gemini Error:', error.message);

    if (req.body?.message?.chat?.id) {
      await bot.sendMessage(
        req.body.message.chat.id,
        "⚠️ حدث خطأ أثناء معالجة طلبك، حاول لاحقًا."
      );
    }
  }

  res.status(200).end();
};
