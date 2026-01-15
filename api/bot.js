const TelegramBot = require('node-telegram-bot-api');

// تهيئة بوت تلجرام
const bot = new TelegramBot(process.env.BOT_TOKEN);

// الرابط الذي أثبت نجاحه في اختبارك
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(200).send('Bot is Running...');
    }

    const { message } = req.body;
    if (!message || !message.text) return res.status(200).end();

    const chatId = message.chat.id;
    const userText = message.text;

    try {
        // إظهار حالة "جاري الكتابة"
        await bot.sendChatAction(chatId, 'typing');

        // الاتصال بـ Gemini باستخدام fetch (نفس طريقتك الناجحة)
        const response = await fetch(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: userText }]
                }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Gemini API Error');
        }

        // استخراج النص من رد Gemini
        const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text 
                           || "عذراً، لم أستطع فهم ذلك.";

        // إرسال الرد للمستخدم على تلجرام
        await bot.sendMessage(chatId, botResponse);

    } catch (error) {
        console.error('Error:', error);
        await bot.sendMessage(chatId, `⚠️ حدث خطأ في الاتصال بـ AI: ${error.message}`);
    }

    res.status(200).end();
}
