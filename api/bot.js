// api/bot.js - بوت تيليجرام بالذكاء الاصطناعي مع Rate Limiting
import fetch from 'node-fetch';

console.log('🚀 بدء تشغيل بوت تيليجرام بالذكاء الاصطناعي...');

// إعدادات البيئة
const BOT_TOKEN = process.env.BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyC6J7E8sx2RfXZLc_ybffvFp7FP2htfP-M";

// عدة مفاتيح API لتجنب Rate Limiting
const GEMINI_API_KEYS = [
    GEMINI_API_KEY,
    // يمكن إضافة مفاتيح إضافية هنا إذا توفرت
    // "مفتاح_api_2",
    // "مفتاح_api_3"
].filter(key => key && key.length > 10); // تصفية المفاتيح الفارغة

// نفس API URL
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// Rate Limiting - متغيرات للتتبع
let requestCount = 0;
let lastResetTime = Date.now();
const REQUEST_LIMIT = 15; // عدد الطلبات قبل التوقف (لتفادي 429)
const RESET_INTERVAL = 60000; // إعادة التعيين كل 60 ثانية

// دالة للتحقق من Rate Limiting
function checkRateLimit() {
    const now = Date.now();
    
    // إذا مر أكثر من RESET_INTERVAL، نعيد العد
    if (now - lastResetTime > RESET_INTERVAL) {
        requestCount = 0;
        lastResetTime = now;
    }
    
    // إذا وصلنا للحد، نرجع false
    if (requestCount >= REQUEST_LIMIT) {
        const waitTime = Math.ceil((RESET_INTERVAL - (now - lastResetTime)) / 1000);
        console.log(`⚠️ وصلنا لحد Rate Limit، انتظر ${waitTime} ثانية`);
        return false;
    }
    
    requestCount++;
    return true;
}

// دالة التواصل مع Gemini API مع Retry
async function getGeminiResponse(userMessage, retryCount = 0) {
    try {
        // التحقق من Rate Limit
        if (!checkRateLimit()) {
            throw new Error('الحد الأقصى للطلبات تم تجاوزه. يرجى الانتظار دقيقة.');
        }
        
        console.log(`🤖 جاري التواصل مع Gemini API (المحاولة ${retryCount + 1})...`);
        
        // اختيار مفتاح API (يمكن تدويرها إذا كان هناك عدة مفاتيح)
        const currentApiKey = GEMINI_API_KEYS[requestCount % GEMINI_API_KEYS.length];
        
        const payload = {
            contents: [{
                parts: [{ text: userMessage }]
            }],
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_ONLY_HIGH"
                }
            ],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.8,
                maxOutputTokens: 1024
            }
        };
        
        console.log('📤 إرسال الرسالة إلى Gemini:', userMessage.substring(0, 80));
        
        const response = await fetch(`${GEMINI_API_URL}?key=${currentApiKey}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            timeout: 30000 // 30 ثانية كحد أقصى
        });
        
        console.log('📡 حالة الرد من Gemini:', response.status);
        
        // إذا كان الخطأ 429، نحاول مرة أخرى
        if (response.status === 429) {
            if (retryCount < 2) { // محاولتين إضافيتين
                console.log('🔄 خطأ 429، إعادة المحاولة بعد 2 ثانية...');
                await new Promise(resolve => setTimeout(resolve, 2000));
                return getGeminiResponse(userMessage, retryCount + 1);
            } else {
                throw new Error('الخادم مشغول جداً. يرجى المحاولة بعد دقيقة.');
            }
        }
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ خطأ من Gemini API:', response.status, errorData);
            
            if (response.status === 403) {
                throw new Error('مفتاح API غير صالح أو منتهي الصلاحية.');
            } else if (response.status === 400) {
                throw new Error('طلب غير صالح. قد تحتوي الرسالة على محتوى غير مسموح.');
            } else {
                throw new Error(`خطأ ${response.status}: ${JSON.stringify(errorData.error || '')}`);
            }
        }
        
        const data = await response.json();
        console.log('✅ تم استلام رد من Gemini بنجاح');
        
        const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!aiResponse) {
            console.log('⚠️ Gemini لم يرجع نصاً');
            // رد افتراضي مفيد
            return `أهلاً! تلقيت رسالتك: "${userMessage.substring(0, 50)}..."\n\nللأسف، لم أحصل على رد واضح من الخادم. يمكنك:\n1. إعادة صياغة سؤالك\n2. تقسيمه لأسئلة أصغر\n3. المحاولة بعد قليل`;
        }
        
        return aiResponse.trim();
        
    } catch (error) {
        console.error('🔥 خطأ في الاتصال بـ Gemini:', error.message);
        
        // إذا كان خطأ Rate Limit، نعطي رداً مساعداً
        if (error.message.includes('Rate limiting') || error.message.includes('مشغول')) {
            return `⚠️ *عذراً، الخدمة مشغولة حالياً*\n\n` +
                   `يوجد ضغط على الخادم. يمكنك:\n` +
                   `• المحاولة بعد 1-2 دقيقة\n` +
                   `• كتابة رسالة أقصر\n` +
                   `• استخدام الأمر /simple للحصول على رد سريع`;
        }
        
        throw error;
    }
}

// ردود سريعة للاستخدام عندما يكون Gemini غير متاح
function getQuickResponse(message, userName) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('مرحبا') || lowerMessage.includes('اهلا') || lowerMessage.includes('السلام')) {
        return `مرحباً ${userName}! 😊 كيف يمكنني مساعدتك اليوم؟`;
    }
    
    if (lowerMessage.includes('شكرا') || lowerMessage.includes('مشكور')) {
        return `العفو ${userName}! 😊 سعيد لأنني استطعت المساعدة.`;
    }
    
    if (lowerMessage.includes('اسمك') || lowerMessage.includes('شو اسمك')) {
        return `أنا مساعدك الذكي! 🤖 يمكنك تسميتي كما تريد.`;
    }
    
    if (lowerMessage.includes('الوقت') || lowerMessage.includes('الساعة')) {
        const now = new Date();
        const time = now.toLocaleTimeString('ar-EG');
        return `الساعة الآن: ${time} ⏰`;
    }
    
    if (lowerMessage.includes('طقس') || lowerMessage.includes('حر')) {
        return `للأسف لا يمكنني التحقق من الطقس حالياً 🌤️\nلكنني أنصحك بالتحقق من تطبيق الطقس المفضل لديك!`;
    }
    
    // رد عام
    const responses = [
        `أهلاً ${userName}! لقد تلقيت رسالتك. حالياً الخدمة الرئيسية مشغولة، لكنني هنا لمساعدتك بأي شيء آخر.`,
        `شكراً على رسالتك ${userName}! 💖 يمكنك طرح سؤالك وسأحاول الرد بأفضل ما لدي.`,
        `مرحباً بك ${userName}! 😊 كيف حالك اليوم؟`,
        `أنا هنا لمساعدتك ${userName}! ✨ ما الذي تريد التحدث عنه؟`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
}

// دالة إرسال رسائل تيليجرام
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        if (!result.ok) {
            console.error('❌ خطأ من Telegram:', result.description);
            // إعادة المحاولة مرة واحدة إذا فشل
            if (result.error_code === 429) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                return sendTelegramMessage(chatId, text, options);
            }
        }
        
        return result;
    } catch (error) {
        console.error('🔥 خطأ في إرسال رسالة Telegram:', error);
        throw error;
    }
}

// دالة إرسال حالة الكتابة
async function sendTypingAction(chatId) {
    try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendChatAction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                action: "typing"
            })
        });
    } catch (error) {
        console.error('❌ خطأ في إرسال حالة الكتابة:', error);
    }
}

// Main Handler
export default async function handler(req, res) {
    console.log('\n=== 📥 طلب جديد ===');
    console.log('⏰ الوقت:', new Date().toLocaleString('ar-EG'));
    console.log('📝 Method:', req.method);
    
    // السماح بجميع الطلبات
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // الرد على طلبات GET للتحقق
    if (req.method === 'GET') {
        return res.status(200).json({
            status: "✅ نشط",
            service: "بوت تيليجرام الذكي",
            requests_today: requestCount,
            rate_limit: `${requestCount}/${REQUEST_LIMIT}`,
            gemini_ready: GEMINI_API_KEYS.length > 0,
            time: new Date().toISOString(),
            endpoint: "/api/bot"
        });
    }
    
    // معالجة طلبات POST من Telegram
    if (req.method === 'POST') {
        if (!BOT_TOKEN) {
            console.error('❌ BOT_TOKEN غير موجود');
            return res.status(500).json({ 
                error: "BOT_TOKEN مطلوب. أضفه في Vercel Environment Variables." 
            });
        }
        
        const update = req.body;
        
        if (!update.message) {
            return res.status(200).json({ ok: true });
        }
        
        const chatId = update.message.chat.id;
        const userId = update.message.from.id;
        const firstName = update.message.from.first_name || "صديقي";
        const text = update.message.text || "";
        
        console.log(`👤 ${firstName} (${userId}): ${text}`);
        
        try {
            // أمر /start
            if (text === '/start') {
                const welcomeMessage = `🎉 *أهلاً ${firstName}!* 😊\n\n` +
                    `*مرحباً بك في البوت الذكي!* 🤖\n\n` +
                    `✨ *ماذا أفعل؟*\n` +
                    `• أجيب على أسئلتك باستخدام الذكاء الاصطناعي\n` +
                    `• أساعدك في البحث عن المعلومات\n` +
                    `• أتحدث معك عن أي موضوع\n\n` +
                    `📝 *الأوامر المتاحة:*\n` +
                    `/start - إعادة الترحيب\n` +
                    `/help - المساعدة\n` +
                    `/simple - رد سريع بدون ذكاء اصطناعي\n` +
                    `/status - حالة الخدمة\n\n` +
                    `💬 *اكتب لي رسالتك الآن...* ✨`;
                
                await sendTelegramMessage(chatId, welcomeMessage);
                return res.status(200).json({ ok: true });
            }
            
            // أمر /help
            if (text === '/help') {
                const helpMessage = `🆘 *مساعدة*\n\n` +
                    `*كيفية الاستخدام:*\n` +
                    `1. اكتب رسالتك مباشرة\n` +
                    `2. انتظر بضع ثواني للرد\n` +
                    `3. يمكنك سؤالي عن أي شيء\n\n` +
                    `*نصائح:*\n` +
                    `• كن واضحاً في سؤالك\n` +
                    `• إذا كان الرد بطيئاً، جرب /simple\n` +
                    `• يمكنك تقسيم الأسئلة الطويلة\n\n` +
                    `*الأوامر:*\n` +
                    `/start - بدء البوت\n` +
                    `/help - هذه الرسالة\n` +
                    `/simple - رد سريع\n` +
                    `/status - حالة النظام\n\n` +
                    `🌸 *أنا هنا لمساعدتك دائماً!*`;
                
                await sendTelegramMessage(chatId, helpMessage);
                return res.status(200).json({ ok: true });
            }
            
            // أمر /status
            if (text === '/status') {
                const statusMessage = `📊 *حالة النظام*\n\n` +
                    `✅ *البوت:* نشط\n` +
                    `🤖 *الذكاء الاصطناعي:* ${GEMINI_API_KEYS.length > 0 ? 'جاهز' : 'غير متوفر'}\n` +
                    `📈 *الطلبات اليوم:* ${requestCount}\n` +
                    `⚡ *الحالة:* ${checkRateLimit() ? 'جيد' : 'مشغول'}\n` +
                    `🕐 *الوقت:* ${new Date().toLocaleTimeString('ar-EG')}\n\n` +
                    `💡 *نصيحة:* إذا كانت الخدمة بطيئة، جرب أمر /simple`;
                
                await sendTelegramMessage(chatId, statusMessage);
                return res.status(200).json({ ok: true });
            }
            
            // أمر /simple
            if (text === '/simple' || text.startsWith('/simple ')) {
                const userMessage = text === '/simple' ? 
                    'مرحبا' : text.replace('/simple ', '');
                
                const quickResponse = getQuickResponse(userMessage, firstName);
                await sendTelegramMessage(chatId, quickResponse);
                return res.status(200).json({ ok: true });
            }
            
            // معالجة الرسائل العادية
            if (text && !text.startsWith('/')) {
                // إرسال حالة الكتابة
                await sendTypingAction(chatId);
                
                // محاولة الحصول على رد من Gemini
                try {
                    const botResponse = await getGeminiResponse(text);
                    
                    // إرسال الرد
                    await sendTelegramMessage(chatId, botResponse);
                    
                } catch (error) {
                    console.error(`❌ فشل الحصول على رد من Gemini:`, error.message);
                    
                    // إرسال رد بديل
                    const fallbackResponse = getQuickResponse(text, firstName);
                    await sendTelegramMessage(chatId, 
                        `⚠️ *ملاحظة:* استخدام الرد السريع\n\n` +
                        `${fallbackResponse}\n\n` +
                        `💡 *للحصول على رد كامل، جرب لاحقاً.*`
                    );
                }
                
                return res.status(200).json({ ok: true });
            }
            
        } catch (error) {
            console.error('🔥 خطأ عام في المعالجة:', error);
            
            // محاولة إرسال رسالة خطأ للمستخدم
            try {
                await sendTelegramMessage(
                    chatId,
                    `❌ *عذراً، حدث خطأ*\n\n` +
                    `حدث خطأ غير متوقع.\n` +
                    `يرجى المحاولة مرة أخرى.\n\n` +
                    `يمكنك استخدام:\n` +
                    `/start - إعادة البدء\n` +
                    `/simple - للرد السريع`
                );
            } catch (e) {
                console.error('🔥 فشل إرسال رسالة الخطأ:', e);
            }
        }
        
        return res.status(200).json({ ok: true });
    }
    
    return res.status(404).json({ error: "Not found" });
}

console.log('\n=== ✅ تهيئة البوت اكتملت ===');
console.log(`🤖 Telegram Bot Token: ${BOT_TOKEN ? '✅ موجود' : '❌ مطلوب'}`);
console.log(`🔑 Gemini API Keys: ${GEMINI_API_KEYS.length} مفتاح`);
console.log(`⚡ Rate Limit: ${REQUEST_LIMIT} طلب/دقيقة`);
console.log('================================');
console.log('🚀 البوت جاهز! يستخدم الذكاء الاصطناعي مع Rate Limiting');
