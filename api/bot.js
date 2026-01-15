// api/bot.js
import fetch from 'node-fetch';

// متغيرات API
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const BOT_TOKEN = process.env.BOT_TOKEN;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent";

// تخزين بيانات المحادثة لكل مستخدم
const userConversations = new Map();

// ===== دالة إرسال رسالة إلى Gemini =====
async function sendMessageToGemini(userId, text) {
    // تنظيف المحادثات القديمة
    cleanupOldConversations();
    
    // الحصول على تاريخ المحادثة أو إنشاء جديد
    if (!userConversations.has(userId)) {
        userConversations.set(userId, {
            messages: [{
                role: "user",
                parts: [{ 
                    text: "أنت مساعد ذكي ومفيد في بوت تلجرام. أجب بلغة العربية الفصحى بشكل مختصر ومفيد. لا تقدم تحليلات طويلة، كن مباشراً وودوداً." 
                }]
            }],
            lastActivity: Date.now()
        });
    }

    const conversation = userConversations.get(userId);
    
    // إضافة رسالة المستخدم
    conversation.messages.push({ 
        role: "user", 
        parts: [{ text: text }] 
    });
    
    // تحديث وقت النشاط
    conversation.lastActivity = Date.now();

    const payload = {
        contents: conversation.messages,
        generationConfig: {
            temperature: 0.7,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 500
        }
    };

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Gemini API Error:', data);
            
            // استخدم نموذج بديل إذا كان هناك مشكلة
            if (data.error?.message?.includes('model')) {
                return await getFallbackResponse(text);
            }
            
            throw new Error(data.error?.message || `HTTP Error: ${response.status}`);
        }

        const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text 
            ? data.candidates[0].content.parts[0].text.trim()
            : 'عذراً، لم أتلقَ إجابة واضحة. يمكنك إعادة السؤال.';

        // إضافة رد المساعد إلى المحادثة
        conversation.messages.push({ 
            role: "model", 
            parts: [{ text: botResponse }] 
        });

        // تقليل عدد الرسائل إذا تجاوزت الحد
        if (conversation.messages.length > 8) {
            conversation.messages = [
                conversation.messages[0], // الحفاظ على التعليمات الأولية
                ...conversation.messages.slice(-6) // الحفاظ على آخر 6 رسائل
            ];
        }

        return botResponse;

    } catch (error) {
        console.error('🔥 Error in sendMessageToGemini:', error);
        return await getFallbackResponse(text);
    }
}

// ===== رد بديل إذا فشل Gemini =====
async function getFallbackResponse(text) {
    const responses = {
        "مرحباً": "أهلاً وسهلاً! كيف يمكنني مساعدتك اليوم؟ 😊",
        "كيف حالك": "بخير الحمدلله، جاهز لمساعدتك!",
        "شكراً": "العفو! سعيد بمساعدتك 🌟",
        "من أنت": "أنا مساعد ذكي يعمل على تقنية Gemini من Google",
        "مساعدة": "يمكنني مساعدتك في:\n• الإجابة على أسئلتك\n• الكتابة والترجمة\n• النصائح والإرشادات"
    };

    // البحث عن رد مناسب
    for (const [keyword, response] of Object.entries(responses)) {
        if (text.toLowerCase().includes(keyword.toLowerCase())) {
            return response;
        }
    }

    // رد عام
    return "شكراً على رسالتك! يمكنني مساعدتك في العديد من المواضيع. 💭";
}

// ===== تنظيف المحادثات القديمة =====
function cleanupOldConversations() {
    const now = Date.now();
    const thirtyMinutes = 30 * 60 * 1000;

    for (const [userId, conversation] of userConversations.entries()) {
        if (now - conversation.lastActivity > thirtyMinutes) {
            userConversations.delete(userId);
        }
    }
}

// ===== دالة إرسال رسالة تلجرام =====
async function sendTelegramMessage(chatId, text, options = {}) {
    try {
        const payload = {
            chat_id: chatId,
            text: text,
            parse_mode: "Markdown",
            disable_web_page_preview: true,
            ...options
        };

        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (!data.ok) {
            console.error('❌ Telegram API Error:', data);
        }
        
        return data;

    } catch (error) {
        console.error('🔥 Error in sendTelegramMessage:', error);
        throw error;
    }
}

// ===== البوت الرئيسي (Webhook Handler) =====
export default async function handler(req, res) {
    console.log('📥 استلام طلب:', req.method);
    
    // التحقق من التوكن
    if (!BOT_TOKEN) {
        console.error('❌ BOT_TOKEN غير موجود');
        return res.status(500).json({ 
            error: "BOT_TOKEN is missing in environment variables" 
        });
    }

    // ===== معالجة GET للتحقق =====
    if (req.method === 'GET') {
        return res.status(200).json({
            status: "✅ نشط",
            name: "🤖 Gemini Telegram Bot",
            time: new Date().toISOString(),
            active_users: userConversations.size,
            gemini_ready: !!GEMINI_API_KEY,
            endpoint: "/api/bot"
        });
    }

    // ===== معالجة POST من Telegram =====
    if (req.method === 'POST') {
        const update = req.body;
        
        // ===== معالجة أمر /start =====
        if (update.message?.text === '/start') {
            const chatId = update.message.chat.id;
            const userName = update.message.from.first_name;
            
            console.log(`🚀 ${userName} بدأ البوت`);
            
            const welcomeMessage = `🎉 *أهلاً ${userName}!*\n\n` +
                `*أنا مساعدك الذكي المدعوم بـ Gemini AI* 🤖\n\n` +
                `✨ *ماذا يمكنني فعل؟*\n` +
                `• الإجابة على أسئلتك 💭\n` +
                `• المساعدة في الكتابة ✍️\n` +
                `• الترجمة بين اللغات 🌐\n` +
                `• النصائح والإرشادات 💡\n\n` +
                `📝 *الأوامر المتاحة:*\n` +
                `/start - بدء البوت\n` +
                `/help - المساعدة\n` +
                `/clear - مسح الذاكرة\n` +
                `/info - معلومات\n\n` +
                `*اكتب سؤالك الآن!* ⚡`;

            await sendTelegramMessage(chatId, welcomeMessage);
            return res.status(200).json({ ok: true });
        }

        // ===== معالجة أمر /help =====
        if (update.message?.text === '/help') {
            const chatId = update.message.chat.id;
            
            const helpMessage = `🆘 *مساعدة*\n\n` +
                `*الأوامر المتاحة:*\n` +
                `• /start - بدء البوت\n` +
                `• /help - هذه الرسالة\n` +
                `• /clear - مسح ذاكرة المحادثة\n` +
                `• /info - معلومات عن البوت\n\n` +
                `*نصائح للاستخدام:*\n` +
                `• اكتب سؤالك بشكل واضح\n` +
                `• يمكنك التحدث بالعربية أو الإنجليزية\n` +
                `• الذاكرة تمسح بعد 30 دقيقة من عدم النشاط\n` +
                `• يمكنك استخدام /clear لمسح الذاكرة يدوياً\n\n` +
                `*مميزات البوت:*\n` +
                `• سريع في الرد ⚡\n` +
                `• يدعم سياق المحادثة\n` +
                `• مجاني بالكامل 💚`;

            await sendTelegramMessage(chatId, helpMessage);
            return res.status(200).json({ ok: true });
        }

        // ===== معالجة أمر /clear =====
        if (update.message?.text === '/clear') {
            const chatId = update.message.chat.id;
            const userId = update.message.from.id;
            
            userConversations.delete(userId);
            
            await sendTelegramMessage(
                chatId, 
                '🧹 *تم مسح ذاكرة المحادثة*\n\n' +
                'يمكنك البدء بمحادثة جديدة الآن! ✨'
            );
            return res.status(200).json({ ok: true });
        }

        // ===== معالجة أمر /info =====
        if (update.message?.text === '/info') {
            const chatId = update.message.chat.id;
            
            const infoMessage = `🤖 *معلومات البوت*\n\n` +
                `*الاسم:* Gemini AI Bot\n` +
                `*النموذج:* Gemini 2.0 Flash\n` +
                `*اللغة:* العربية (يدعم لغات أخرى)\n` +
                `*المصدر:* Google Gemini API\n\n` +
                `📊 *إحصائيات:*\n` +
                `• المستخدمين النشطين: ${userConversations.size}\n` +
                `• حالة Gemini: ${GEMINI_API_KEY ? '✅ نشط' : '⚠️ غير نشط'}\n` +
                `• آخر تحديث: ${new Date().toLocaleDateString('ar-SA')}\n\n` +
                `⚡ *مميزات:*\n` +
                `• يعمل على Webhook (أسرع)\n` +
                `• يدعم المحادثة المستمرة\n` +
                `• مجاني ومفتوح المصدر`;

            await sendTelegramMessage(chatId, infoMessage);
            return res.status(200).json({ ok: true });
        }

        // ===== معالجة الرسائل العادية =====
        if (update.message?.text && !update.message.text.startsWith('/')) {
            const chatId = update.message.chat.id;
            const userId = update.message.from.id;
            const userMessage = update.message.text;
            
            console.log(`📝 ${userId}: ${userMessage.substring(0, 50)}...`);
            
            try {
                // إرسال حالة الكتابة
                await sendTelegramMessage(chatId, "⌛", {
                    action: "typing",
                    method: "sendChatAction"
                });

                // الحصول على الرد من Gemini
                const botResponse = await sendMessageToGemini(userId, userMessage);
                
                // إرسال الرد
                await sendTelegramMessage(chatId, botResponse);
                
            } catch (error) {
                console.error('❌ Error processing message:', error);
                
                const errorMessage = `⚠️ *حدث خطأ*\n\n` +
                    `عذراً، واجهت مشكلة في معالجة رسالتك.\n` +
                    `يرجى المحاولة مرة أخرى أو استخدام /clear\n\n` +
                    `تفاصيل الخطأ: ${error.message}`;
                
                await sendTelegramMessage(chatId, errorMessage);
            }
            
            return res.status(200).json({ ok: true });
        }
    }

    // إذا لم يكن طلب معروف
    return res.status(200).json({ received: true });
}

// ===== تهيئة البوت =====
console.log('🚀 بدء تشغيل بوت Gemini...');
console.log(`🔑 BOT_TOKEN: ${BOT_TOKEN ? '✅ موجود' : '❌ غير موجود'}`);
console.log(`🤖 GEMINI_API_KEY: ${GEMINI_API_KEY ? '✅ موجود' : '❌ غير موجود'}`);
console.log(`👥 المستخدمين النشطين: ${userConversations.size}`);
console.log('✅ البوت جاهز لاستقبال Webhook!');
