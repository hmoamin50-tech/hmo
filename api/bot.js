const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');

const bot = new TelegramBot(process.env.BOT_TOKEN);
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// ⚡ Webhook Handler
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(200).send('🤖 Bot is running');
  }

  const message = req.body.message;
  if (!message?.text) return res.status(200).end();

  const chatId = message.chat.id;
  const userText = message.text;

  try {
    // 🚀 لا نرسل typing (يوفر ~300ms)
    const geminiResponse = await fetch(
      `${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `أجب بإيجاز وبالعربية:\n${userText}`
                }
              ]
            }
          ]
        })
      }
    );

    const data = await geminiResponse.json();

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "لم أتمكن من توليد رد.";

    // إرسال الرد فورًا
    await bot.sendMessage(chatId, reply);

  } catch (err) {
    console.error(err);
    await bot.sendMessage(chatId, "⚠️ حدث خطأ، حاول مرة أخرى.");
  }

  return res.status(200).end();
};
