// api/bot.js - النسخة البسيطة الموثوقة
import fetch from 'node-fetch';

console.log('🚀 بدء تشغيل بوت التوافق العاطفي...');

// متغيرات البيئة
const BOT_TOKEN = process.env.BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyC6J7E8sx2RfXZLc_ybffvFp7FP2htfP-M";

// استخدم نموذج Gemini الصحيح والموثوق
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

console.log(`🔑 BOT_TOKEN: ${BOT_TOKEN ? '✅ موجود' : '❌ غير موجود'}`);
console.log(`🤖 GEMINI_API_KEY: ${GEMINI_API_KEY ? '✅ موجود' : '❌ غير موجود'}`);

// دالة بسيطة للاتصال بـ Gemini
async function getGeminiResponse(userMessage) {
  try {
    console.log('📤 إرسال إلى Gemini:', userMessage.substring(0, 30));
    
    // payload بسيط جداً
    const payload = {
      contents: [{
        parts: [{ text: userMessage }]
      }]
    };
    
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      console.error('❌ خطأ Gemini:', response.status);
      return null; // نرجع null إذا فشل
    }
    
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
    
  } catch (error) {
    console.error('❌ استثناء Gemini:', error.message);
    return null;
  }
}

// دالة إرسال تلجرام بسيطة
async function sendTelegram(chatId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "Markdown"
      })
    });
  } catch (error) {
    console.error('❌ خطأ إرسال تلجرام:', error);
  }
}

// المعالج الرئيسي
export default async function handler(req, res) {
  console.log('📥 طلب:', req.method);
  
  // للتحقق من حالة البوت
  if (req.method === 'GET') {
    return res.status(200).json({
      status: "✅ نشط",
      service: "بوت التوافق العاطفي",
      time: new Date().toISOString()
    });
  }
  
  // معالجة Telegram Webhook
  if (req.method === 'POST') {
    if (!BOT_TOKEN) {
      console.error('❌ BOT_TOKEN غير موجود');
      return res.status(500).json({ error: "BOT_TOKEN مطلوب" });
    }
    
    const update = req.body;
    
    // أمر /start
    if (update.message?.text === '/start') {
      const chatId = update.message.chat.id;
      const userName = update.message.from.first_name;
      
      console.log(`🚀 ${userName} بدأ البوت`);
      
      await sendTelegram(chatId,
        `🌸 *مرحباً ${userName}!*\n\n` +
        `أنا بوت التوافق العاطفي البسيط.\n` +
        `اكتب لي أي رسالة وسأرد عليك. 😊`
      );
      
      return res.status(200).json({ ok: true });
    }
    
    // معالجة الرسائل العادية
    if (update.message?.text && update.message.text !== '/start') {
      const chatId = update.message.chat.id;
      const userMessage = update.message.text;
      const userName = update.message.from.first_name;
      
      console.log(`👤 ${userName}: ${userMessage}`);
      
      try {
        // محاولة الحصول على رد من Gemini
        const geminiResponse = await getGeminiResponse(userMessage);
        
        if (geminiResponse) {
          // إذا كان Gemini يعمل، أرسل رده
          await sendTelegram(chatId, geminiResponse);
        } else {
          // إذا فشل Gemini، أرسل رداً محلياً
          await sendTelegram(chatId,
            `مرحباً ${userName}! 😊\n\n` +
            `شكراً لرسالتك: "${userMessage}"\n\n` +
            `(Gemini غير متوفر حالياً، لكن استلمت رسالتك!)`
          );
        }
        
      } catch (error) {
        console.error('🔥 خطأ:', error);
        await sendTelegram(chatId, '⚠️ حدث خطأ، حاول مرة أخرى');
      }
      
      return res.status(200).json({ ok: true });
    }
  }
  
  return res.status(200).json({ ok: true });
}

console.log('✅ البوت جاهز!');
