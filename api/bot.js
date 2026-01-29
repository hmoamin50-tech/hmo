const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

// تهيئة البوت
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// متغيرات API
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// تخزين بيانات المحادثة لكل مستخدم
const userConversations = new Map();

// وظيفة إرسال الرسالة إلى Gemini API
async function sendMessageToGemini(userId, text) {
// الحصول على تاريخ المحادثة أو إنشاء جديد
if (!userConversations.has(userId)) {
userConversations.set(userId, {
messages: [{
role: "user",
parts: [{ text: "أنت مساعد مفيد. أجب بلغة العربية الفصحى." }]
}],
lastActivity: Date.now()
});
}

const conversation = userConversations.get(userId); // إضافة رسالة المستخدم conversation.messages.push({ role: "user", parts: [{ text: text }] }); // تحديث وقت النشاط conversation.lastActivity = Date.now(); // تنظيف المحادثات القديمة (أكثر من 30 دقيقة) cleanupOldConversations(); const payload = { contents: conversation.messages.map(msg => ({ role: msg.role, parts: msg.parts })) }; try { const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json', }, body: JSON.stringify(payload) }); const data = await response.json(); if (!response.ok) { console.error('Gemini API Error:', data); if (data.error && data.error.message.includes('API key')) { throw new Error('مشكلة في مفتاح API - تأكد من صحة المفتاح'); } throw new Error(data.error?.message || `HTTP Error: ${response.status}`); } const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text ? data.candidates[0].content.parts[0].text : 'عذراً، لم أتلقَ إجابة واضحة من Gemini.'; // إضافة رد المساعد إلى المحادثة conversation.messages.push({ role: "model", parts: [{ text: botResponse }] }); // تقليل عدد الرسائل إذا تجاوزت الحد (الحفاظ على السياق) if (conversation.messages.length > 10) { conversation.messages = [ conversation.messages[0], // الحفاظ على التعليمات الأولية ...conversation.messages.slice(-8) // الحفاظ على آخر 8 رسائل ]; } return botResponse; } catch (error) { console.error('Error in sendMessageToGemini:', error); let userFriendlyError; if (error.message.includes('API key') || error.message.includes('403')) { userFriendlyError = '⚠️ مشكلة في مصادقة API. يرجى التحقق من المفتاح.'; } else if (error.message.includes('network') || error.message.includes('fetch')) { userFriendlyError = '⚠️ مشكلة في الاتصال بالإنترنت. حاول مرة أخرى.'; } else { userFriendlyError = `⚠️ حدث خطأ: ${error.message}`; } throw new Error(userFriendlyError); } 

}

// تنظيف المحادثات القديمة
function cleanupOldConversations() {
const now = Date.now();
const thirtyMinutes = 30 * 60 * 1000;

for (const [userId, conversation] of userConversations.entries()) { if (now - conversation.lastActivity > thirtyMinutes) { userConversations.delete(userId); } } 

}

// بدء البوت
bot.onText(//start/, async (msg) => {
const chatId = msg.chat.id;
const welcomeMessage = 🎉 أهلاً بك! أنا بوت الذكاء الاصطناعي المدعوم بـ Gemini.\n\n
+ يمكنك:\n
+ • طرح أي سؤال 💭\n
+ • طلب المساعدة في كتابة النصوص ✍️\n
+ • الترجمة بين اللغات 🌐\n
+ • الحصول على إجابات فورية ⚡\n\n
+ أرسل رسالتك الآن!;

await bot.sendMessage(chatId, welcomeMessage); 

});

bot.onText(//help/, async (msg) => {
const chatId = msg.chat.id;
const helpMessage = 🆘 **الأوامر المتاحة:**\n\n
+ /start - بدء البوت والترحيب\n
+ /help - عرض هذه الرسالة\n
+ /clear - مسح ذاكرة المحادثة\n
+ /info - معلومات عن البوت\n\n
+ **مميزات البوت:**\n
+ • يدعم اللغة العربية والعربية الفصحى\n
+ • يحافظ على سياق المحادثة\n
+ • سريع في الرد\n
+ • مجاني بالكامل 💚;

await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' }); 

});

bot.onText(//clear/, async (msg) => {
const chatId = msg.chat.id;
userConversations.delete(msg.from.id);
await bot.sendMessage(chatId, '🧹 تم مسح ذاكرة المحادثة. يمكنك البدء من جديد!');
});

bot.onText(//info/, async (msg) => {
const chatId = msg.chat.id;
const infoMessage = 🤖 **معلومات البوت:**\n\n
+ • **الاسم:** Gemini AI Bot\n
+ • **النموذج:** Gemini 2.5 Flash\n
+ • **المطور:** أنت (تم التخصيص)\n
+ • **اللغة:** العربية (يدعم لغات أخرى)\n
+ • **المصدر:** Google Gemini API\n\n
+ 📊 **إحصائيات:**\n
+ • المستخدمين النشطين: ${userConversations.size}\n
+ • آخر تحديث: ${new Date().toLocaleDateString('ar-SA')};

await bot.sendMessage(chatId, infoMessage, { parse_mode: 'Markdown' }); 

});

// معالجة جميع الرسائل النصية
bot.on('message', async (msg) => {
// تجاهل الأوامر التي تم معالجتها
if (msg.text && msg.text.startsWith('/')) {
return;
}

const chatId = msg.chat.id; const userId = msg.from.id; // تجاهل الرسائل غير النصية if (!msg.text) { await bot.sendMessage(chatId, 'أستطيع فهم النصوص فقط حالياً. أرسل لي نصاً!'); return; } try { // إرسال حالة الكتابة await bot.sendChatAction(chatId, 'typing'); // الحصول على الرد من Gemini const response = await sendMessageToGemini(userId, msg.text); // إرسال الرد await bot.sendMessage(chatId, response); } catch (error) { console.error('Error processing message:', error); let errorMessage; if (error.message.includes('مشكلة في مصادقة API')) { errorMessage = '🔑 **خطأ في المصادقة:**\n' + 'يرجى التحقق من:\n' + '1. صحة مفتاح Gemini API في ملف .env\n' + '2. تفعيل الـ API في Google AI Studio\n' + '3. التأكد من أن المفتاح غير منتهي الصلاحية'; } else { errorMessage = `❌ حدث خطأ غير متوقع:\n${error.message}\n\n` + 'يرجى المحاولة مرة أخرى أو استخدام /clear لمسح الذاكرة.'; } await bot.sendMessage(chatId, errorMessage); } 

});

// معالجة الأخطاء العامة للبوت
bot.on('polling_error', (error) => {
console.error('Telegram Bot Polling Error:', error);
});

bot.on('error', (error) => {
console.error('Telegram Bot Error:', error);
});

// بدء البوت
console.log('🤖 بوت تلجرام يعمل...');
console.log(📊 عدد المستخدمين النشطين: ${userConversations.size});
