// api/bot.js - بوت تيليجرام يظهر "لم يتم الاتصال" فقط
import fetch from 'node-fetch';

console.log('🚀 بدء تشغيل بوت تيليجرام...');

const BOT_TOKEN = process.env.BOT_TOKEN;

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
        
        return await response.json();
    } catch (error) {
        console.error('❌ خطأ في إرسال الرسالة:', error);
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
        console.error('❌ خطأ في حالة الكتابة:', error);
    }
}

// Main Handler
export default async function handler(req, res) {
    console.log('📥 استلام طلب:', req.method);
    
    // الرد على GET للتحقق
    if (req.method === 'GET') {
        return res.status(200).json({
            status: "✅ البوت يعمل",
            message: "هذا بوت تيليجرام بسيط - لم يتم الاتصال بالخدمة حالياً",
            endpoint: "/api/bot"
        });
    }
    
    // معالجة POST من تيليجرام
    if (req.method === 'POST') {
        if (!BOT_TOKEN) {
            console.error('❌ BOT_TOKEN غير موجود');
            return res.status(500).json({ 
                error: "BOT_TOKEN غير موجود. أضفه في Environment Variables." 
            });
        }
        
        const update = req.body;
        
        if (!update.message) {
            return res.status(200).json({ ok: true });
        }
        
        const chatId = update.message.chat.id;
        const firstName = update.message.from.first_name || "صديقي";
        const text = update.message.text || "";
        
        console.log(`📩 رسالة من ${firstName}: ${text}`);
        
        try {
            // إرسال حالة الكتابة
            await sendTypingAction(chatId);
            
            // انتظار لمحاكاة المعالجة
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // الرد برسالة "لم يتم الاتصال" فقط
            const errorMessage = `⚠️ *لم يتم الاتصال*\n\n` +
                `عذراً ${firstName}، الخدمة غير متوفرة حالياً.\n` +
                `يرجى المحاولة مرة أخرى لاحقاً.`;
            
            await sendTelegramMessage(chatId, errorMessage);
            
        } catch (error) {
            console.error('🔥 خطأ في معالجة الرسالة:', error);
        }
        
        return res.status(200).json({ ok: true });
    }
    
    return res.status(200).json({ ok: true });
}

console.log('✅ البوت جاهز لاستقبال الرسائل');
console.log('ℹ️  جميع الرسائل ستتلقى رد: "لم يتم الاتصال"');
