// api/bot.js - النسخة المحدثة
import fetch from 'node-fetch';

console.log('🚀 بدء تشغيل بوت Gemini...');

// ===== متغيرات البيئة =====
const BOT_TOKEN = process.env.BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ===== اختبار الاتصال عند البدء =====
(async () => {
  console.log('🔍 اختبار اتصال Gemini...');
  
  if (!GEMINI_API_KEY) {
    console.log('⚠️ GEMINI_API_KEY غير موجود - سيستخدم الردود المحلية');
  } else {
    console.log('✅ GEMINI_API_KEY موجود');
    
    // اختبار بسيط للاتصال
    try {
      const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      
      const response = await fetch(testUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [{ text: "مرحباً" }]
          }],
          generationConfig: {
            maxOutputTokens: 100
          }
        })
      });
      
      if (response.ok) {
        console.log('🎉 Gemini API يعمل بشكل صحيح!');
      } else {
        const error = await response.json();
        console.error('❌ Gemini API error:', error.error?.message);
      }
    } catch (error) {
      console.error('❌ فشل اختبار Gemini:', error.message);
    }
  }
})();

// ===== ردود محلية بديلة =====
const localResponses = {
  "default": [
    "مرحباً! كيف يمكنني مساعدتك اليوم؟ 😊",
    "أهلاً وسهلاً! أنا هنا للإجابة على أسئلتك 🌟",
    "شكراً لتواصلك! ما الذي تريد معرفته؟ 💭",
    "أنا مساعدك الذكي، اسألني عن أي شيء! 🤖",
    "سعيد بتواصلك! كيف يمكنني خدمتك؟ ✨"
  ],
  "greeting": [
    "مرحباً! يومك سعيد 🌞",
    "أهلاً بك! كيف حالك اليوم؟ 😊",
    "مرحباً! سعيد برؤيتك 🌷",
    "أهلاً وسهلاً! كيف يمكنني مساعدتك؟ 🌟"
  ],
  "thanks": [
    "العفو! سعيد بمساعدتك 🌸",
    "لا شكر على واجب! 💖",
    "شكراً لك! أنت رائع 🌈",
    "العفو! دائمًا هنا لمساعدتك ✨"
  ],
  "help": [
    "يمكنني مساعدتك في:\n• الإجابة على الأسئلة\n• الكتابة والترجمة\n• النصائح والإرشادات\n• المحادثة العامة",
    "أنا هنا ل:\n• الإجابة على استفساراتك\n• المساعدة في المهام\n• تقديم المعلومات\n• التحدث معك"
  ],
  "love": [
    "الحب هو أجمل شعور في الحياة 💖",
    "المشاعر الجميلة تجعل الحياة أجمل 🌷",
    "الحب يحتاج إلى صبر ورعاية 🌱",
    "كل قلب يستحق الحب والاهتمام 💫"
  ]
};

// ===== دالة Gemini مع Fallback =====
async function getAIResponse(userId, userMessage) {
  // إذا لم يكن هناك مفتاح Gemini، استخدم الردود المحلية
  if (!GEMINI_API_KEY) {
    console.log('🔧 استخدام الردود المحلية (Gemini غير متوفر)');
    return getLocalResponse(userMessage);
  }
  
  try {
    console.log('🤖 محاولة الاتصال بـ Gemini...');
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    // نظام Prompt محسن
    const prompt = `أنت مساعد ذكي في بوت تلجرام يسمى "مكتب التوافق العاطفي".
    المستخدم يقول: "${userMessage}"
    
    أجب باللغة العربية بشكل:
    1. مختصر وواضح (2-3 جمل كحد أقصى)
    2. ودود ولبق
    3. إيجابي ومشجع
    4. مع إضافة إيموجي مناسب واحد فقط
    
    لا تقدم تحليلات طويلة، كن مباشراً.`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 150
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_NONE"
          }
        ]
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Gemini API error:', errorData);
      throw new Error(`API Error: ${errorData.error?.message || response.status}`);
    }
    
    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiResponse) {
      throw new Error('No response from Gemini');
    }
    
    console.log('✅ تم الحصول على رد من Gemini');
    return aiResponse.trim();
    
  } catch (error) {
    console.error('❌ خطأ في Gemini، استخدام الرد المحلي:', error.message);
    return getLocalResponse(userMessage);
  }
}

// ===== دالة الردود المحلية =====
function getLocalResponse(message) {
  const lowerMessage = message.toLowerCase();
  
  // التحقق من نوع الرسالة
  if (lowerMessage.includes('مرحبا') || lowerMessage.includes('اهلا') || lowerMessage.includes('السلام')) {
    return localResponses.greeting[Math.floor(Math.random() * localResponses.greeting.length)];
  }
  
  if (lowerMessage.includes('شكر') || lowerMessage.includes('ممتاز') || lowerMessage.includes('رائع')) {
    return localResponses.thanks[Math.floor(Math.random() * localResponses.thanks.length)];
  }
  
  if (lowerMessage.includes('حب') || lowerMessage.includes('عشق') || lowerMessage.includes('مشاعر')) {
    return localResponses.love[Math.floor(Math.random() * localResponses.love.length)];
  }
  
  if (lowerMessage.includes('مساعدة') || lowerMessage.includes('help') || lowerMessage.includes('ماذا تفعل')) {
    return localResponses.help[Math.floor(Math.random() * localResponses.help.length)];
  }
  
  // رد افتراضي
  return localResponses.default[Math.floor(Math.random() * localResponses.default.length)];
}

// ===== دالة إرسال رسالة تلجرام =====
async function sendTelegram(chatId, text, options = {}) {
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
      console.error('❌ Telegram error:', result);
    }
    
    return result;
  } catch (error) {
    console.error('🔥 Telegram send error:', error);
    throw error;
  }
}

// ===== Webhook Handler =====
export default async function handler(req, res) {
  console.log('📥 طلب:', req.method);
  
  // GET للتحقق
  if (req.method === 'GET') {
    const geminiStatus = GEMINI_API_KEY ? '✅ متوفر' : '❌ غير متوفر';
    
    return res.status(200).json({
      status: "✅ نشط",
      service: "مكتب التوافق العاطفي",
      gemini: geminiStatus,
      time: new Date().toLocaleString('ar-EG'),
      note: "أرسل /debug في تلجرام لمعلومات أكثر"
    });
  }
  
  // POST من Telegram
  if (req.method === 'POST') {
    if (!BOT_TOKEN) {
      return res.status(500).json({ error: "BOT_TOKEN غير موجود" });
    }
    
    const update = req.body;
    
    // ===== أمر /debug (للإدمن) =====
    if (update.message?.text === '/debug') {
      const chatId = update.message.chat.id;
      
      let geminiTest = "❌ لم يتم الاختبار";
      if (GEMINI_API_KEY) {
        try {
          const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
          const testRes = await fetch(testUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: "test" }] }]
            })
          });
          geminiTest = testRes.ok ? "✅ يعمل" : `❌ خطأ: ${testRes.status}`;
        } catch (e) {
          geminiTest = `❌ خطأ: ${e.message}`;
        }
      }
      
      const debugInfo = `🔍 *معلومات التصحيح*\n\n` +
        `🤖 *البوت:* نشط ✅\n` +
        `🔑 *BOT_TOKEN:* ${BOT_TOKEN ? '✅ موجود' : '❌ غير موجود'}\n` +
        `🤖 *Gemini API Key:* ${GEMINI_API_KEY ? '✅ موجود' : '❌ غير موجود'}\n` +
        `🔄 *Gemini Status:* ${geminiTest}\n` +
        `🌐 *البيئة:* ${process.env.NODE_ENV || 'production'}\n` +
        `⏰ *الوقت:* ${new Date().toLocaleString('ar-EG')}\n\n` +
        `📊 *ملاحظة:*\n` +
        `إذا كان Gemini غير متوفر،\n` +
        `سيستخدم البوت الردود المحلية.`;
      
      await sendTelegram(chatId, debugInfo);
      return res.status(200).json({ ok: true });
    }
    
    // ===== أمر /start =====
    if (update.message?.text === '/start') {
      const chatId = update.message.chat.id;
      const userName = update.message.from.first_name;
      
      const welcome = `🎉 *أهلاً ${userName}!* 😊\n\n` +
        `*أنا مساعدك الذكي* 🤖\n\n` +
        `✨ *يمكنني:*\n` +
        `• الإجابة على أسئلتك 💭\n` +
        `• المساعدة في الكتابة ✍️\n` +
        `• الترجمة بين اللغات 🌐\n` +
        `• النصائح والإرشادات 💡\n\n` +
        `📝 *الأوامر:*\n` +
        `/start - بدء البوت\n` +
        `/help - المساعدة\n` +
        `/clear - مسح الذاكرة\n` +
        `/info - معلومات\n\n` +
        `💬 *اكتب سؤالك الآن!* ⚡`;
      
      await sendTelegram(chatId, welcome);
      return res.status(200).json({ ok: true });
    }
    
    // ===== أمر /info =====
    if (update.message?.text === '/info') {
      const chatId = update.message.chat.id;
      const geminiStatus = GEMINI_API_KEY ? '✅ نشط' : '⚠️ غير نشط (يستخدم ردود محلية)';
      
      const info = `🤖 *معلومات المكتب*\n\n` +
        `*الاسم:* مكتب التوافق العاطفي\n` +
        `*الذكاء:* ${geminiStatus}\n` +
        `*النموذج:* Gemini 1.5 Flash\n` +
        `*اللغة:* العربية الفصحى\n\n` +
        `📊 *مميزات:*\n` +
        `• ردود سريعة ومباشرة ⚡\n` +
        `• محادثة ودودة 😊\n` +
        `• يدعم مواضيع متنوعة 💭\n` +
        `• مجاني بالكامل 🌟`;
      
      await sendTelegram(chatId, info);
      return res.status(200).json({ ok: true });
    }
    
    // ===== معالجة الرسائل العادية =====
    if (update.message?.text && !update.message.text.startsWith('/')) {
      const chatId = update.message.chat.id;
      const userId = update.message.from.id;
      const userMessage = update.message.text;
      
      console.log(`👤 ${userId}: ${userMessage}`);
      
      try {
        // إرسال حالة الكتابة
        await sendTelegram(chatId, "...", { 
          method: "sendChatAction", 
          action: "typing" 
        });
        
        // الحصول على الرد (Gemini أو محلي)
        const botResponse = await getAIResponse(userId, userMessage);
        
        // إرسال الرد
        await sendTelegram(chatId, botResponse);
        
        // إضافة رسالة إضافية للمستخدمين الجدد
        if (userMessage.toLowerCase().includes('مرحبا') || userMessage.toLowerCase().includes('اهلا')) {
          setTimeout(async () => {
            await sendTelegram(
              chatId, 
              '💡 *نصيحة:* يمكنك سؤالي عن أي شيء!\n' +
              'مثل: "كيف أعبر عن مشاعري؟" أو "أحتاج مساعدة في كتابة رسالة"'
            );
          }, 1000);
        }
        
      } catch (error) {
        console.error('🔥 خطأ في المعالجة:', error);
        
        await sendTelegram(
          chatId, 
          '⚠️ *حدث خطأ*\n\n' +
          'عذراً، واجهت مشكلة تقنية.\n' +
          'يرجى المحاولة مرة أخرى بعد قليل. 🌸'
        );
      }
      
      return res.status(200).json({ ok: true });
    }
  }
  
  return res.status(200).json({ received: true });
}

console.log('✅ البوت جاهز للعمل!');
console.log(`🔑 BOT_TOKEN: ${BOT_TOKEN ? '✅' : '❌'}`);
console.log(`🤖 GEMINI_API_KEY: ${GEMINI_API_KEY ? '✅' : '❌ (سيستخدم ردود محلية)'}`);
