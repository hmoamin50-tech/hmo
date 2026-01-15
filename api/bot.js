const TelegramBot = require('node-telegram-bot-api');

// تهيئة بوت تلجرام باستخدام التوكن المخزن في إعدادات Vercel
const bot = new TelegramBot(process.env.BOT_TOKEN);

// الرابط المباشر لـ Gemini API (النسخة المستقرة)
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

export default async function handler(req, res) {
    // استقبال طلبات POST فقط من تلجرام
    if (req.method !== 'POST') {
        return res.status(200).send('البوت يعمل بنجاح! ✅');
    }

    const { message } = req.body;

    // إذا لم تكن هناك رسالة نصية، إنهاء الطلب
    if (!message || !message.text) {
        return res.status(200).end();
    }

    const chatId = message.chat.id;
    const userText = message.text;

    try {
        // 1. إظهار حالة "جاري الكتابة" في تلجرام
        await bot.sendChatAction(chatId, 'typing');

        // 2. إرسال الطلب إلى Gemini باستخدام Fetch (نفس طريقتك الناجحة)
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

        // التأكد من نجاح الاستجابة من جوجل
        if (!response.ok) {
            throw new Error(data.error?.message || 'خطأ في الاتصال بـ Gemini');
        }

        // 3. استخراج الرد النصي
        const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text 
                           || "🤖 عذراً، لم أستطع فهم الرسالة.";

        // 4. إرسال الرد النهائي للمستخدم على تلجرام
        await bot.sendMessage(chatId, botResponse);

    } catch (error) {
        console.error('Error Trace:', error);
        // إرسال رسالة خطأ واضحة في حال فشل أي جزء
        await bot.sendMessage(chatId, `⚠️ عذراً، حدث خطأ تقني: ${error.message}`);
    }

    // إغلاق الطلب بنجاح (ضروري جداً لـ Vercel وتلجرام)
    res.status(200).end();
}
