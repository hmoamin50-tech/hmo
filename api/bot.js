const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
app.use(express.json());

const TOKEN = process.env.BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// إنشاء البوت بدون polling
const bot = new TelegramBot(TOKEN, { webHook: { port: process.env.PORT || 3000 } });

// رابط الـ Webhook يجب أن يكون HTTPS وفعّال
const URL = process.env.WEBHOOK_URL; // مثال: https://example.com/telegram-webhook
bot.setWebHook(`${URL}/webhook`);

// تخزين المحادثات
const userConversations = new Map();

// تنظيف المحادثات القديمة
function cleanupOldConversations() {
    const now = Date.now();
    const thirtyMinutes = 30 * 60 * 1000;
    for (const [userId, conversation] of userConversations.entries()) {
        if (now - conversation.lastActivity > thirtyMinutes) {
            userConversations.delete(userId);
        }
    }
}

// وظيفة إرسال الرسائل إلى Gemini
async function sendMessageToGemini(userId, text) {
    if (!userConversations.has(userId)) {
        userConversations.set(userId, {
            messages: [{ role: "user", parts: [{ text: "أنت مساعد مفيد. أجب بلغة العربية الفصحى." }] }],
            lastActivity: Date.now()
        });
    }
    const conversation = userConversations.get(userId);
    conversation.messages.push({ role: "user", parts: [{ text }] });
    conversation.lastActivity = Date.now();
    cleanupOldConversations();

    const payload = { contents: conversation.messages.map(msg => ({ role: msg.role, parts: msg.parts })) };

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || `HTTP Error: ${response.status}`);

        const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'عذراً، لم أتلقَ إجابة واضحة من Gemini.';
        conversation.messages.push({ role: "model", parts: [{ text: botResponse }] });

        if (conversation.messages.length > 10) {
            conversation.messages = [
                conversation.messages[0],
                ...conversation.messages.slice(-8)
            ];
        }

        return botResponse;
    } catch (error) {
        console.error('Gemini Error:', error);
        if (error.message.includes('API key')) throw new Error('⚠️ مشكلة في مصادقة API. تحقق من المفتاح.');
        throw new Error('⚠️ حدث خطأ أثناء الاتصال بـ Gemini.');
    }
}

// مسار الـ Webhook
app.post('/webhook', async (req, res) => {
    const update = req.body;

    if (update.message) {
        const msg = update.message;
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        try {
            if (msg.text) {
                // التعامل مع الأوامر
                if (msg.text.startsWith('/start')) {
                    await bot.sendMessage(chatId, `🎉 أهلاً بك! أنا بوت الذكاء الاصطناعي المدعوم بـ Gemini.\nيمكنك إرسال أي سؤال أو نص.`);
                } else if (msg.text.startsWith('/help')) {
                    await bot.sendMessage(chatId, `🆘 الأوامر المتاحة:\n/start\n/help\n/clear\n/info`);
                } else if (msg.text.startsWith('/clear')) {
                    userConversations.delete(userId);
                    await bot.sendMessage(chatId, '🧹 تم مسح ذاكرة المحادثة.');
                } else if (msg.text.startsWith('/info')) {
                    await bot.sendMessage(chatId, `🤖 Gemini AI Bot\nالمستخدمين النشطين: ${userConversations.size}`);
                } else {
                    await bot.sendChatAction(chatId, 'typing');
                    const reply = await sendMessageToGemini(userId, msg.text);
                    await bot.sendMessage(chatId, reply);
                }
            } else {
                await bot.sendMessage(chatId, 'أستطيع التعامل مع النصوص فقط حالياً.');
            }
        } catch (error) {
            await bot.sendMessage(chatId, `❌ ${error.message}`);
        }
    }

    res.sendStatus(200); // يجب الرد لتجنب إعادة إرسال الرسائل
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`));
