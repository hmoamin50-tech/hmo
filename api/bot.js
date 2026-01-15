// api/bot.js - النسخة المُحدَّثة مع نموذج Gemini صحيح
import fetch from 'node-fetch';

console.log('🚀 بدء تشغيل بوت التوافق العاطفي...');

// ===== متغيرات البيئة =====
const BOT_TOKEN = process.env.BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyC6J7E8sx2RfXZLc_ybffvFp7FP2htfP-M";

// ===== استخدم نموذج Gemini المتاح فعلياً =====
// نماذج متاحة حالياً: gemini-1.5-flash, gemini-1.5-pro, gemini-1.0-pro
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

console.log(`🔑 GEMINI_API_KEY: ${GEMINI_API_KEY ? '✅ موجود' : '❌ غير موجود'}`);
console.log(`🔗 Gemini Model: gemini-1.5-flash`);

// ===== دالة Gemini المصححة =====
async function getGeminiResponse(userMessage) {
  try {
    console.log('🤖 جاري التواصل مع Gemini API...');
    
    // استخدام الـ payload الصحيح
    const payload = {
      contents: [{
        parts: [{ text: userMessage }]
      }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 500
      }
    };
    
    console.log('📤 إرسال الرسالة إلى Gemini:', userMessage.substring(0, 50));
    
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
      console.error('❌ خطأ من Gemini API:', errorText);
      
      if (response.status === 404) {
        // جرب نموذج بديل إذا كان 2.5-flash غير متاح
        console.log('🔄 تجربة نموذج gemini-1.0-pro بديلاً...');
        return await getGeminiResponseWithFallback(userMessage);
      }
      throw new Error(`خطأ ${response.status}: ${errorText.substring(0, 100)}`);
    }
    
    const data = await response.json();
    console.log('✅ تم استلام رد من Gemini بنجاح');
    
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiResponse) {
      throw new Error('لم يتم استلام رد نصي من Gemini');
    }
    
    return aiResponse.trim();
    
  } catch (error) {
    console.error('🔥 خطأ في الاتصال بـ Gemini:', error.message);
    return getFallbackResponse(userMessage);
  }
}

// ===== دالة احتياطية مع نموذج بديل =====
async function getGeminiResponseWithFallback(userMessage) {
  try {
    const fallbackUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent";
    
    const payload = {
      contents: [{
        parts: [{ text: userMessage }]
      }]
    };
    
    const response = await fetch(`${fallbackUrl}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Fallback model also failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || getFallbackResponse(userMessage);
    
  } catch (error) {
    console.error('❌ فشل النموذج الاحتياطي:', error);
    return getFallbackResponse(userMessage);
  }
}

// ===== ردود احتياطية =====
function getFallbackResponse(userMessage) {
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('نوم') || lowerMessage.includes('ينام') || lowerMessage.includes('سهر')) {
    return "لتنظيم النوم: حاول إنشاء روتين مسائي ثابت، ابتعد عن الشاشات قبل النوم بساعة، واجعل غرفتك مظلمة وهادئة. 🌙 جرب قراءة كتاب أو الاستماع لموسيقى هادئة.";
  }
  
  if (lowerMessage.includes('قلق') || lowerMessage.includes('توتر') || lowerMessage.includes('خوف')) {
    return "للتعامل مع القلق: خذ نفساً عميقاً، ركز على الحاضر، تحدث عما تشعر به. 🧘‍♂️ يمكنك أيضاً ممارسة الرياضة أو الكتابة عن مشاعرك.";
  }
  
  if (lowerMessage.includes('حب') || lowerMessage.includes('علاقة') || lowerMessage.includes('مشاعر')) {
    return "العلاقات الناجحة تحتاج للتواصل الصادق، التفهم المتبادل، والاحترام. 💖 تذكر أن كل علاقة فريدة وتحتاج وقتاً وصبراً.";
  }
  
  if (lowerMessage.includes('مرحبا') || lowerMessage.includes('اهلا') || lowerMessage.includes('السلام')) {
    return "مرحباً بك! 😊 أنا مساعدك في مختبر التوافق العاطفي. كيف يمكنني مساعدتك اليوم؟";
  }
  
  return "شكراً لسؤالك! 🤔 أنا هنا لمساعدتك في الأمور العاطفية والنفسية. هل يمكنك شرح سؤالك أكثر؟";
}

// ===== باقي الكود يبقى كما هو مع تعديل بسيط =====
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
    }
    
    return result;
  } catch (error) {
    console.error('🔥 خطأ في إرسال رسالة Telegram:', error);
    throw error;
  }
}

// ... (باقي دوال sendTypingAction و handler تبقى كما هي بدون تغيير)

// ===== في جزء الـ handler، أضف أمرًا لاختبار النماذج =====
if (update.message?.text === '/models') {
  const chatId = update.message.chat.id;
  
  const modelsInfo = `🤖 *النماذج المتاحة لـ Gemini:*\n\n` +
    `1. *gemini-1.5-flash* ⚡ (الأسرع - موصى به)\n` +
    `2. gemini-1.5-pro 🧠 (الأكثر تطوراً)\n` +
    `3. gemini-1.0-pro 📱 (للأجهزة القديمة)\n\n` +
    `📡 *النموذج الحالي:* gemini-1.5-flash\n` +
    `🔗 *الرابط:* ${GEMINI_API_URL}`;
  
  await sendTelegramMessage(chatId, modelsInfo);
  return res.status(200).json({ ok: true });
}

console.log('\n=== ✅ تهيئة البوت اكتملت ===');
console.log(`🤖 Telegram Bot Token: ${BOT_TOKEN ? '✅ موجود' : '❌ مطلوب'}`);
console.log(`🎯 Gemini API Key: ${GEMINI_API_KEY ? '✅ موجود' : '⚠️ قد لا يعمل Gemini'}`);
console.log(`🔗 API Endpoint: /api/bot`);
console.log(`📡 Model: gemini-1.5-flash`);
console.log('================================');
console.log('🌺 البوت جاهز لاستقبال الرسائل!');
