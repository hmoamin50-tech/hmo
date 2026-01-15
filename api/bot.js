// api/bot.js - بوت تيليجرام بالذكاء الاصطناعي Gemini
import fetch from 'node-fetch';

console.log('🚀 بدء تشغيل بوت تيليجرام بالذكاء الاصطناعي...');

// إعدادات البيئة - استخدم نفس مفتاح API
const BOT_TOKEN = process.env.BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyC6J7E8sx2RfXZLc_ybffvFp7FP2htfP-M";

// نفس API URL الذي يعمل في صفحة الويب
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

console.log('✅ تم تحميل إعدادات Gemini API');

// دالة التواصل مع Gemini API
async function getGeminiResponse(userMessage) {
    try {
        console.log('🤖 جاري التواصل مع Gemini API...');
        
        // نفس الـ payload الذي يعمل في صفحة الويب
        const payload = {
            contents: [{
                parts: [{ text: userMessage }]
            }]
        };
        
        console.log('📤 إرسال الرسالة إلى Gemini:', userMessage.substring(0, 100));
        
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        console.log('📡 حالة الرد من Gemini:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ خطأ من Gemini API:', errorText.substring(0, 200));
            
            if (response.status === 404) {
                throw new Error('النموذج غير موجود');
            } else if (response.status === 403) {
                throw new Error('مفتاح API غير صالح');
            } else {
                throw new Error(`خطأ ${response.status}`);
            }
        }
        
        const data = await response.json();
        console.log('✅ تم استلام رد من Gemini بنجاح');
        
        const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!aiResponse) {
            console.log('⚠️ Gemini لم يرجع نصاً:', JSON.stringify(data).substring(0, 200));
            throw new Error('لم يتم استلام رد نصي من Gemini');
        }
        
        return aiResponse.trim();
        
    } catch (error) {
        console.error('🔥 خطأ في الاتصال بـ Gemini:', error.message);
        throw error; // نرمي الخطأ للتعامل معه في المكان المناسب
    }
}

// دالة إرسال رسائل تيليجرام
async function sendTelegramMessage(chatId, text, options = {}) {
    try {
        const payload = {
            chat_id: chatId,
            text: text,
            parse_mode: "HTML",
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
    
    // الرد على طلبات GET للتحقق
    if (req.method === 'GET') {
        return res.status(200).json({
            status: "✅ نشط",
            service: "بوت تيليجرام بالذكاء الاصطناعي",
            gemini_api: GEMINI_API_KEY ? "✅ مضبوط" : "❌ غير مضبوط",
            telegram_bot: BOT_TOKEN ? "✅ متصل" : "❌ غير متصل",
            model: "gemini-2.5-flash",
            time: new Date().toISOString()
        });
    }
    
    // معالجة طلبات POST من Telegram
    if (req.method === 'POST') {
        // التحقق من وجود BOT_TOKEN
        if (!BOT_TOKEN) {
            console.error('❌ BOT_TOKEN غير موجود');
            return res.status(500).json({ 
                error: "BOT_TOKEN مطلوب. أضفه في Vercel Environment Variables." 
            });
        }
        
        const update = req.body;
        
        // إذا لم يكن هناك رسالة، ننهي الطلب
        if (!update.message) {
            return res.status(200).json({ ok: true });
        }
        
        const chatId = update.message.chat.id;
        const userId = update.message.from.id;
        const firstName = update.message.from.first_name || "صديقي";
        const text = update.message.text || "";
        
        console.log(`👤 ${firstName} (${userId}): ${text}`);
        
        // ===== معالجة أمر /start =====
        if (text === '/start') {
            console.log(`🚀 ${firstName} بدأ البوت`);
            
            const welcomeMessage = `🎉 <b>أهلاً ${firstName}!</b> 😊\n\n` +
                `<b>مرحباً بك في بوت الذكاء الاصطناعي!</b> 🤖\n\n` +
                `✨ <b>أنا مساعدك الذكي المدعوم بـ Google Gemini</b> 🧠\n\n` +
                `💬 <b>يمكنك سؤالي عن:</b>\n` +
                `• أي موضوع تريده\n` +
                `• المساعدة في المهام اليومية\n` +
                `• الإجابة على الأسئلة\n` +
                `• النقاش حول أي فكرة\n\n` +
                `📝 <b>الأوامر المتاحة:</b>\n` +
                `<code>/start</code> - إعادة الترحيب\n` +
                `<code>/help</code> - المساعدة\n\n` +
                `💡 <b>اكتب لي رسالتك الآن وسأرد عليك...</b> ✨`;
            
            await sendTelegramMessage(chatId, welcomeMessage);
            return res.status(200).json({ ok: true });
        }
        
        // ===== معالجة أمر /help =====
        if (text === '/help') {
            console.log(`❓ ${firstName} طلب المساعدة`);
            
            const helpMessage = `🆘 <b>مساعدة</b>\n\n` +
                `<b>كيفية استخدام البوت:</b>\n` +
                `1. اكتب رسالتك مباشرة\n` +
                `2. انتظر قليلاً للحصول على الرد\n` +
                `3. يمكنك طرح أي سؤال أو موضوع\n\n` +
                `<b>نصائح للاستخدام الأمثل:</b>\n` +
                `• كن واضحاً في سؤالك\n` +
                `• اشرح ما تريده بدقة\n` +
                `• لا تتردد في طرح أي استفسار\n\n` +
                `<b>الأوامر المتاحة:</b>\n` +
                `<code>/start</code> - بدء المحادثة\n` +
                `<code>/help</code> - هذه الرسالة\n\n` +
                `🌸 <b>تذكر:</b> أنا هنا لمساعدتك في أي شيء!`;
            
            await sendTelegramMessage(chatId, helpMessage);
            return res.status(200).json({ ok: true });
        }
        
        // ===== معالجة الرسائل العادية =====
        if (text && !text.startsWith('/')) {
            try {
                console.log(`💬 ${firstName} يرسل رسالة عادية`);
                
                // إرسال حالة الكتابة
                await sendTypingAction(chatId);
                
                // الحصول على الرد من Gemini
                const botResponse = await getGeminiResponse(text);
                
                // تقسيم الرد إذا كان طويلاً (Telegram له حد 4096 حرف)
                if (botResponse.length > 4000) {
                    // إرسال الجزء الأول
                    await sendTelegramMessage(chatId, botResponse.substring(0, 4000));
                    // إرسال الباقي
                    if (botResponse.length > 4000) {
                        await sendTelegramMessage(chatId, botResponse.substring(4000));
                    }
                } else {
                    // إرسال الرد كاملاً
                    await sendTelegramMessage(chatId, botResponse);
                }
                
                console.log(`✅ تم الرد على ${firstName}`);
                
            } catch (error) {
                console.error(`🔥 خطأ في معالجة رسالة ${firstName}:`, error.message);
                
                // رسالة خطأ ودية
                let errorMessage;
                
                if (error.message.includes('مفتاح API غير صالح')) {
                    errorMessage = `⚠️ <b>خطأ في الاتصال</b>\n\n` +
                        `عذراً ${firstName}، هناك مشكلة في مفتاح API.\n` +
                        `يرجى التأكد من صحة مفتاح Gemini API.`;
                } else if (error.message.includes('لم يتم استلام رد نصي')) {
                    errorMessage = `🤔 <b>لم أحصل على رد واضح</b>\n\n` +
                        `عذراً ${firstName}، الذكاء الاصطناعي لم يرد بشكل واضح.\n` +
                        `يمكنك إعادة صياغة سؤالك أو المحاولة مرة أخرى.`;
                } else {
                    errorMessage = `⚠️ <b>حدث خطأ</b>\n\n` +
                        `عذراً ${firstName}، حدث خطأ غير متوقع:\n` +
                        `<code>${error.message}</code>\n\n` +
                        `يرجى المحاولة مرة أخرى.`;
                }
                
                await sendTelegramMessage(chatId, errorMessage);
            }
            
            return res.status(200).json({ ok: true });
        }
        
        // إذا كان الأمر غير معروف
        if (text.startsWith('/')) {
            await sendTelegramMessage(
                chatId,
                `❓ <b>أمر غير معروف</b>\n\n` +
                `عذراً ${firstName}، الأمر <code>${text}</code> غير معروف.\n\n` +
                `<b>الأوامر المتاحة:</b>\n` +
                `<code>/start</code> - بدء البوت\n` +
                `<code>/help</code> - المساعدة`
            );
        }
    }
    
    // إذا وصلنا هنا، نرد بموافقة عامة
    return res.status(200).json({ ok: true });
}

console.log('\n=== ✅ تهيئة البوت اكتملت ===');
console.log(`🤖 Telegram Bot Token: ${BOT_TOKEN ? '✅ موجود' : '❌ مطلوب'}`);
console.log(`🎯 Gemini API Key: ${GEMINI_API_KEY ? '✅ موجود' : '❌ مطلوب'}`);
console.log(`🔗 API Model: gemini-2.5-flash`);
console.log('================================');
console.log('🚀 البوت جاهز لاستقبال الرسائل!');
