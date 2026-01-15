const TelegramBot = require('node-telegram-bot-api');

// تهيئة البوت
const bot = new TelegramBot(process.env.BOT_TOKEN);

// الرابط المباشر الذي أثبت نجاحه في صورتك الأخيرة
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(200).send('البوت نشط ✅');
    }

    const { message } = req.body;
    if (!message || !message.text) return res.status(200).end();

    const chatId = message.chat.id;

    try {
        await bot.sendChatAction(chatId, 'typing');

        // نفس منطق الـ Fetch الذي نجح في المتصفح
        const response = await fetch(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: message.text }] }]
            })
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error?.message || 'خطأ في الـ API');

        const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "لم أستطع معالجة الرد.";

        // إرسال الرد لتلجرام
        await bot.sendMessage(chatId, botResponse);

    } catch (error) {
        console.error(error);
        await bot.sendMessage(chatId, "⚠️ واجهت مشكلة في الوصول للذكاء الاصطناعي.");
    }

    res.status(200).end();
};
