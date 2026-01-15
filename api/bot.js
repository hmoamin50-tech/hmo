import fetch from 'node-fetch';

// إعدادات البيئة
const BOT_TOKEN = process.env.BOT_TOKEN;
// تأكد من وضع المفتاح الصحيح هنا أو في إعدادات Vercel
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyC6J7E8sx2RfXZLc_ybffvFp7FP2htfP-M";

// رابط Gemini الصحيح (استخدام v1beta مع gemini-1.5-flash)
// ملاحظة: لا يوجد حالياً إصدار رسمي باسم 2.5-flash، الأحدث والمستقر هو 1.5-flash
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

let requestCount = 0;
let lastResetTime = Date.now();
const REQUEST_LIMIT = 15;
const RESET_INTERVAL = 60000;

function checkRateLimit() {
    const now = Date.now();
    if (now - lastResetTime > RESET_INTERVAL) {
        requestCount = 0;
        lastResetTime = now;
    }
    if (requestCount >= REQUEST_LIMIT) return false;
    requestCount++;
    return true;
}

async function getGeminiResponse(userMessage, retryCount = 0) {
    try {
        if (!checkRateLimit()) {
            throw new Error('Rate limit exceeded');
        }

        const payload = {
            contents: [{ parts: [{ text: userMessage }] }]
        };

        // ملاحظة: نمرر المفتاح كـ Query Parameter كما في الرابط أدناه
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Gemini Error:', data);
            throw new Error(data.error?.message || 'Error from Gemini API');
        }

        return data.candidates?.[0]?.content?.parts?.[0]?.text || "لم أستطع معالجة هذا الطلب.";
    } catch (error) {
        console.error('Fetch Error:', error.message);
        throw error;
    }
}

// دالة إرسال رسائل تيليجرام
async function sendTelegramMessage(chatId, text) {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: "Markdown"
        })
    });
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(200).json({ status: "Bot is running" });
    }

    const update = req.body;
    if (!update.message || !update.message.text) {
        return res.status(200).json({ ok: true });
    }

    const chatId = update.message.chat.id;
    const text = update.message.text;

    try {
        if (text === '/start') {
            await sendTelegramMessage(chatId, "أهلاً بك! أنا بوت ذكي مدعوم بـ Gemini. اسألني أي شيء!");
            return res.status(200).json({ ok: true });
        }

        // الحصول على رد من Gemini
        const aiResponse = await getGeminiResponse(text);
        await sendTelegramMessage(chatId, aiResponse);

    } catch (error) {
        await sendTelegramMessage(chatId, "عذراً، واجهت مشكلة في الاتصال بالذكاء الاصطناعي حالياً.");
    }

    return res.status(200).json({ ok: true });
}
