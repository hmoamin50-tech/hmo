const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.BOT_TOKEN);
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(200).send('Active ✅');
    const { message } = req.body;
    if (!message || !message.text) return res.status(200).end();

    try {
        await bot.sendChatAction(message.chat.id, 'typing');
        const response = await fetch(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: message.text }] }] })
        });
        const data = await response.json();
        const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "🤖 عذراً، لم أفهم.";
        await bot.sendMessage(message.chat.id, botResponse);
    } catch (e) {
        await bot.sendMessage(message.chat.id, "⚠️ خطأ في الاتصال بالذكاء الاصطناعي.");
    }
    res.status(200).end();
}
