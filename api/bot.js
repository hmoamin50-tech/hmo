// استخدام CommonJS للـ Syntax الخاص بـ Node.js
const TelegramBot = require('node-telegram-bot-api');

// تهيئة البوت باستخدام التوكن من متغيرات البيئة
const bot = new TelegramBot(process.env.BOT_TOKEN);

// الرابط الذي استخدمته في كودك الناجح (تم التأكد من صحة المسار)
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

module.exports = async (req, res) => {
    // التحقق من أن الطلب POST من تلجرام
    if (req.method !== 'POST') {
        return res.status(200).send('Bot is active ✅');
    }

    const { message } = req.body;

    // تجاهل الطلب إذا لم يحتوي على نص
    if (!message || !message.text) {
        return res.status(200).end();
    }

    const chatId = message.chat.id;
    const userText = message.text;

    try {
        // إرسال حالة "جاري الكتابة" لتلجرام
        await bot.sendChatAction(chatId, 'typing');

        // تنفيذ الطلب باستخدام fetch (نفس طريقتك في HTML)
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

        // معالجة الأخطاء إذا لم تكن الاستجابة ناجحة
        if (!response.ok) {
            const errorMsg = data.error ? data.error.message : 'Error from Gemini API';
            throw new Error(errorMsg);
        }

        // استخراج النص من هيكلية بيانات Gemini
        const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text 
                           || "🤖 عذراً، لم أتمكن من استلام رد من الذكاء الاصطناعي.";

        // إرسال الرد النهائي للمستخدم
        await bot.sendMessage(chatId, botResponse);

    } catch (error) {
        console.error('Gemini Error:', error.message);
        
        // رسائل خطأ توضيحية بناءً على نوع الخطأ
        let friendlyMessage = "⚠️ حدث خطأ تقني في الاتصال بـ AI.";
        if (error.message.includes('API key')) {
            friendlyMessage = "⚠️ خطأ: مفتاح الـ API غير صالح أو غير مفعل.";
        }
        
        await bot.sendMessage(chatId, friendlyMessage);
    }

    // إنهاء الطلب بنجاح لـ Vercel
    res.status(200).end();
};
