const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

// تهيئة البوت مع webhook (الأفضل لـ Vercel)
const bot = new TelegramBot(process.env.BOT_TOKEN);

// متغيرات API
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent"; // نموذج أسرع

// تخزين بيانات المحادثة (استخدم Redis في الإنتاج)
const userConversations = new Map();
const userTypingIndicators = new Map();

// دالة للإشارة إلى أن البوت "يكتب..."
async function showTypingIndicator(chatId, userId) {
    // إرسال إشارة الكتابة
    await bot.sendChatAction(chatId, 'typing');
    
    // حفظ مؤقت المؤشر
    const intervalId = setInterval(async () => {
        try {
            await bot.sendChatAction(chatId, 'typing');
        } catch (error) {
            clearInterval(intervalId);
        }
    }, 5000); // إعادة إرسال كل 5 ثواني
    
    userTypingIndicators.set(userId, intervalId);
}

// دالة لإيقاف مؤشر الكتابة
function stopTypingIndicator(userId) {
    const intervalId = userTypingIndicators.get(userId);
    if (intervalId) {
        clearInterval(intervalId);
        userTypingIndicators.delete(userId);
    }
}

// دالة لإنشاء رسالة تظهر أن البوت يفكر
async function sendThinkingMessage(chatId) {
    try {
        const thinkingMessages = [
            "🤔 أفكر في إجابتك...",
            "🔍 أبحث عن أفضل رد...",
            "💭 أحلل سؤالك...",
            "⚡ أعالج طلبك..."
        ];
        
        const randomMessage = thinkingMessages[Math.floor(Math.random() * thinkingMessages.length)];
        const message = await bot.sendMessage(chatId, `⏳ ${randomMessage}`);
        return message.message_id;
    } catch (error) {
        console.log('Could not send thinking message:', error.message);
        return null;
    }
}

// وظيفة إرسال الرسالة إلى Gemini API مع تحسين السرعة
async function sendMessageToGemini(userId, text) {
    const startTime = Date.now();
    
    // الحصول على تاريخ المحادثة أو إنشاء جديد
    if (!userConversations.has(userId)) {
        userConversations.set(userId, {
            messages: [{
                role: "user",
                parts: [{ text: "أنت مساعد مفيد وسريع. أجب بلغة العربية الفصحى، وأجب بإيجاز ووضوح. لا تقدم مقدمة طويلة، ابدأ الإجابة مباشرة." }]
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

    // تنظيف المحادثات القديمة
    cleanupOldConversations();

    // تحديد معلمات لزيادة السرعة
    const payload = {
        contents: conversation.messages.map(msg => ({
            role: msg.role,
            parts: msg.parts
        })),
        generationConfig: {
            temperature: 0.7,
            topK: 1, // لزيادة السرعة
            topP: 0.95,
            maxOutputTokens: 1000, // تقليل الطول لزيادة السرعة
        },
        safetySettings: [
            {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_ONLY_HIGH"
            }
        ]
    };

    try {
        console.log(`🔍 إرسال طلب إلى Gemini للمستخدم ${userId}...`);
        
        // إضافة timeout لطلب API
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 ثانية timeout

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            signal: controller.signal,
            body: JSON.stringify(payload)
        });

        clearTimeout(timeoutId);

        const data = await response.json();
        const endTime = Date.now();
        console.log(`✅ تم استلام الرد من Gemini في ${endTime - startTime}ms`);

        if (!response.ok) {
            console.error('Gemini API Error:', JSON.stringify(data, null, 2));
            
            if (data.error && data.error.message.includes('API key')) {
                throw new Error('INVALID_API_KEY');
            }
            
            if (data.error && data.error.message.includes('quota')) {
                throw new Error('QUOTA_EXCEEDED');
            }
            
            throw new Error(data.error?.message || `HTTP Error: ${response.status}`);
        }

        const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text
            ? data.candidates[0].content.parts[0].text
            : 'عذراً، لم أتلقَ إجابة واضحة. يمكنك إعادة صياغة سؤالك؟';

        // إضافة رد المساعد إلى المحادثة
        conversation.messages.push({
            role: "model",
            parts: [{ text: botResponse }]
        });

        // تقليل عدد الرسائل للحفاظ على السياق
        if (conversation.messages.length > 6) {
            conversation.messages = [
                conversation.messages[0], // الحفاظ على التعليمات الأولية
                ...conversation.messages.slice(-5) // الحفاظ على آخر 5 رسائل فقط
            ];
        }

        return botResponse;

    } catch (error) {
        console.error('Error in sendMessageToGemini:', error.message);
        
        if (error.name === 'AbortError') {
            throw new Error('TIMEOUT_ERROR');
        }
        
        throw error;
    }
}

// تنظيف المحادثات القديمة
function cleanupOldConversations() {
    const now = Date.now();
    const fifteenMinutes = 15 * 60 * 1000; // 15 دقيقة فقط لتحسين الأداء
    
    for (const [userId, conversation] of userConversations.entries()) {
        if (now - conversation.lastActivity > fifteenMinutes) {
            userConversations.delete(userId);
            stopTypingIndicator(userId);
        }
    }
}

// معالجة الويب هوك (لـ Vercel)
module.exports = async (req, res) => {
    // رد سريع على طلبات GET لإعلام أن البوت نشط
    if (req.method === 'GET') {
        return res.status(200).json({
            status: 'online',
            message: '🤖 Telegram Gemini Bot is running on Vercel',
            timestamp: new Date().toISOString(),
            activeUsers: userConversations.size
        });
    }

    // معالجة طلبات POST من Telegram
    if (req.method === 'POST') {
        try {
            const { message } = req.body;
            
            // تجاهل الرسائل القديمة أو غير المكتملة
            if (!message || !message.text || !message.chat) {
                return res.status(200).end();
            }

            const chatId = message.chat.id;
            const userId = message.from.id;
            const messageText = message.text.trim();

            // تجاهل الرسائل الفارغة
            if (!messageText) {
                return res.status(200).end();
            }

            // معالجة الأوامر الخاصة
            if (messageText.startsWith('/')) {
                await handleCommand(chatId, userId, messageText);
                return res.status(200).end();
            }

            // بدء معالجة الرسالة
            console.log(`📩 رسالة جديدة من ${userId}: ${messageText.substring(0, 50)}...`);
            
            // 1. إظهار مؤشر الكتابة
            await showTypingIndicator(chatId, userId);
            
            // 2. إرسال رسالة "يفكر..."
            const thinkingMessageId = await sendThinkingMessage(chatId);
            
            try {
                // 3. الحصول على الرد من Gemini
                const response = await sendMessageToGemini(userId, messageText);
                
                // 4. إيقاف مؤشر الكتابة
                stopTypingIndicator(userId);
                
                // 5. حذف رسالة "يفكر..." إذا وجدت
                if (thinkingMessageId) {
                    try {
                        await bot.deleteMessage(chatId, thinkingMessageId);
                    } catch (deleteError) {
                        console.log('لم أستطع حذف رسالة التفكير:', deleteError.message);
                    }
                }
                
                // 6. إرسال الرد النهائي مع تقسيم إذا كان طويلاً
                await sendLongMessage(chatId, response);
                
                console.log(`✅ تم الرد على ${userId} بنجاح`);
                
            } catch (error) {
                // إيقاف مؤشر الكتابة في حالة الخطأ
                stopTypingIndicator(userId);
                
                // حذف رسالة "يفكر..." إذا وجدت
                if (thinkingMessageId) {
                    try {
                        await bot.deleteMessage(chatId, thinkingMessageId);
                    } catch (deleteError) {
                        // تجاهل خطأ الحذف
                    }
                }
                
                // إرسال رسالة خطأ مناسبة
                await handleError(chatId, error);
            }

            return res.status(200).end();

        } catch (error) {
            console.error('❌ خطأ في معالجة الطلب:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    return res.status(405).end(); // Method Not Allowed
};

// دالة معالجة الأوامر
async function handleCommand(chatId, userId, command) {
    switch (command) {
        case '/start':
            const welcomeMessage = `🎉 **أهلاً بك في بوت Gemini الذكي!**\n\n`
                + `أنا مساعد ذكي يمكنني:\n`
                + `• الإجابة على أسئلتك 📚\n`
                + `• المساعدة في الكتابة والتلخيص ✍️\n`
                + `• الترجمة بين اللغات 🌐\n`
                + `• حل المسائل الرياضية والمنطقية 🧮\n\n`
                + `**سرعة الرد:** ⚡\n`
                + `(قد يستغرق أول رد 5-10 ثواني بسبب البداية الباردة على Vercel)\n\n`
                + `📝 **أرسل رسالتك الآن!**`;
            
            await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
            break;
            
        case '/help':
            const helpMessage = `🆘 **الأوامر المتاحة:**\n\n`
                + `/start - بدء البوت\n`
                + `/help - المساعدة\n`
                + `/clear - مسح الذاكرة\n`
                + `/ping - فحص سرعة البوت\n`
                + `/stats - إحصائيات\n\n`
                + `**نصائح:**\n`
                + `• اكتب أسئلة واضحة\n`
                + `• أول رسالة قد تكون أبطأ قليلاً\n`
                + `• البوت يحفظ سياق المحادثة\n`
                + `• يمكنك إعادة صياغة السؤال إذا كان الرد بطيئاً`;
            
            await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
            break;
            
        case '/clear':
            userConversations.delete(userId);
            stopTypingIndicator(userId);
            await bot.sendMessage(chatId, '🧹 تم مسح ذاكرة المحادثة. يمكنك البدء من جديد!');
            break;
            
        case '/ping':
            const start = Date.now();
            const pingMessage = await bot.sendMessage(chatId, '🏓 جاري فحص البينج...');
            const end = Date.now();
            await bot.editMessageText(
                `🏓 **Pong!**\n`
                + `• وقت الاستجابة: ${end - start}ms\n`
                + `• المستخدمين النشطين: ${userConversations.size}\n`
                + `• حالة Vercel: ${process.env.VERCEL ? 'نشط' : 'محلي'}`,
                {
                    chat_id: chatId,
                    message_id: pingMessage.message_id,
                    parse_mode: 'Markdown'
                }
            );
            break;
            
        case '/stats':
            const statsMessage = `📊 **إحصائيات البوت:**\n\n`
                + `• المستخدمين النشطين: ${userConversations.size}\n`
                + `• البوت يعمل على: Vercel\n`
                + `• النموذج: Gemini 1.5 Flash\n`
                + `• وقت التحديث: ${new Date().toLocaleTimeString('ar-SA')}\n\n`
                + `💡 **لتحسين السرعة:**\n`
                + `إذا كان البوت بطيئاً، جرب:\n`
                + `1. استخدام /clear\n`
                + `2. صياغة السؤال بطريقة أوضح\n`
                + `3. الانتظار 5-10 ثواني للرد الأول`;
            
            await bot.sendMessage(chatId, statsMessage, { parse_mode: 'Markdown' });
            break;
            
        default:
            await bot.sendMessage(chatId, '⚠️ الأمر غير معروف. استخدم /help لرؤية الأوامر المتاحة.');
    }
}

// دالة إرسال الرسائل الطويلة بتقسيمها
async function sendLongMessage(chatId, text, maxLength = 4000) {
    if (text.length <= maxLength) {
        return await bot.sendMessage(chatId, text);
    }
    
    // تقسيم النص إلى أجزاء
    const parts = [];
    let currentPart = '';
    
    const sentences = text.split(/(?<=[.!؟])\s+/);
    
    for (const sentence of sentences) {
        if ((currentPart + sentence).length > maxLength) {
            if (currentPart) parts.push(currentPart.trim());
            currentPart = sentence;
        } else {
            currentPart += ' ' + sentence;
        }
    }
    
    if (currentPart.trim()) {
        parts.push(currentPart.trim());
    }
    
    // إرسال الأجزاء
    for (let i = 0; i < parts.length; i++) {
        await bot.sendMessage(chatId, `${parts[i]} ${i < parts.length - 1 ? '...' : ''}`);
        await new Promise(resolve => setTimeout(resolve, 300)); // فاصل بين الرسائل
    }
}

// دالة معالجة الأخطاء
async function handleError(chatId, error) {
    let errorMessage;
    
    switch (error.message) {
        case 'TIMEOUT_ERROR':
            errorMessage = '⏳ **تجاوز الوقت المحدد**\n\n'
                + 'الطلب استغرق وقتاً طويلاً. هذا يحدث أحياناً بسبب:\n'
                + '• بداية باردة على Vercel\n'
                + '• سؤال معقد جداً\n'
                + '• ازدحام في شبكة Gemini\n\n'
                + '💡 حاول:\n'
                + '1. إعادة إرسال السؤال\n'
                + '2. تقسيم السؤال إلى أجزاء\n'
                + '3. الانتظار قليلاً ثم المحاولة';
            break;
            
        case 'INVALID_API_KEY':
            errorMessage = '🔑 **مشكلة في المفتاح**\n'
                + 'مفتاح Gemini API غير صالح.';
            break;
            
        case 'QUOTA_EXCEEDED':
            errorMessage = '💰 **تجاوز الحصة**\n'
                + 'تم تجاوز الحصة اليومية لـ Gemini API.';
            break;
            
        default:
            errorMessage = '❌ **حدث خطأ غير متوقع**\n'
                + 'يرجى المحاولة مرة أخرى.\n'
                + `التفاصيل: ${error.message.substring(0, 100)}`;
    }
    
    await bot.sendMessage(chatId, errorMessage, { parse_mode: 'Markdown' });
}

// تهيئة ويب هوك عند بدء التشغيل (للتشغيل المحلي)
if (process.env.NODE_ENV !== 'production') {
    bot.startPolling();
    console.log('🤖 البوت يعمل في وضع الاستطلاع المحلي...');
}
