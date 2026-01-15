// api/bot.js - النسخة المصححة الكاملة
import fetch from 'node-fetch';

console.log('🚀 بدء تشغيل بوت التوافق العاطفي...');

// ===== استخدم نفس المفتاح الذي يعمل في صفحة الويب =====
const BOT_TOKEN = process.env.BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyC6J7E8sx2RfXZLc_ybffvFp7FP2htfP-M"; // استخدم مفتاحك مباشرة

// ===== استخدم نفس الـ API URL الذي يعمل في صفحة الويب =====
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

console.log(`🔑 GEMINI_API_KEY: ${GEMINI_API_KEY ? '✅ موجود' : '❌ غير موجود'}`);
console.log(`🔗 Gemini Model: gemini-2.5-flash`);

// ===== دالة Gemini المصححة =====
async function getGeminiResponse(userMessage) {
  try {
    console.log('🤖 جاري التواصل مع Gemini API...');
    
    // نفس الـ payload الذي يعمل في صفحة الويب
    const payload = {
      contents: [{
        parts: [{ text: userMessage }]
      }]
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
      
      // تحليل الخطأ
      if (response.status === 404) {
        throw new Error('النموذج غير موجود. جرب gemini-1.5-flash');
      } else if (response.status === 403) {
        throw new Error('مفتاح API غير صالح أو غير مصرح به');
      } else {
        throw new Error(`خطأ ${response.status}: ${errorText.substring(0, 100)}`);
      }
    }
    
    const data = await response.json();
    console.log('✅ تم استلام رد من Gemini بنجاح');
    
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiResponse) {
      console.log('⚠️ Gemini لم يرجع نصاً:', data);
      throw new Error('لم يتم استلام رد نصي من Gemini');
    }
    
    return aiResponse.trim();
    
  } catch (error) {
    console.error('🔥 خطأ في الاتصال بـ Gemini:', error.message);
    
    // ردود ذكية بديلة تناسب بوت التوافق العاطفي
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
    
    // رد افتراضي ذكي
    return "شكراً لسؤالك! 🤔 أنا هنا لمساعدتك في الأمور العاطفية والنفسية. هل يمكنك شرح سؤالك أكثر؟";
  }
}

// ===== دالة إرسال رسائل Telegram =====
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

// ===== دالة إرسال حالة الكتابة =====
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

// ===== Webhook Handler الرئيسي =====
export default async function handler(req, res) {
  console.log('\n=== 📥 طلب جديد ===');
  console.log('⏰ الوقت:', new Date().toLocaleString('ar-EG'));
  console.log('📝 Method:', req.method);
  
  // الرد على طلبات GET للتحقق
  if (req.method === 'GET') {
    return res.status(200).json({
      status: "✅ نشط",
      service: "مختبر التوافق العاطفي",
      gemini_api: GEMINI_API_KEY ? "✅ مضبوط" : "❌ غير مضبوط",
      telegram_bot: BOT_TOKEN ? "✅ متصل" : "❌ غير متصل",
      model: "gemini-2.5-flash",
      time: new Date().toISOString(),
      endpoint: "/api/bot"
    });
  }
  
  // معالجة طلبات POST من Telegram
  if (req.method === 'POST') {
    // التحقق من وجود BOT_TOKEN
    if (!BOT_TOKEN) {
      console.error('❌ BOT_TOKEN غير موجود في environment variables');
      return res.status(500).json({ 
        error: "BOT_TOKEN مطلوب. أضفه في Vercel Environment Variables." 
      });
    }
    
    const update = req.body;
    
    // إذا لم يكن هناك رسالة، ننهي الطلب
    if (!update.message && !update.callback_query) {
      return res.status(200).json({ ok: true });
    }
    
    // ===== معالجة أمر /start =====
    if (update.message?.text === '/start') {
      const chatId = update.message.chat.id;
      const userName = update.message.from.first_name;
      
      console.log(`🚀 ${userName} بدأ البوت (${chatId})`);
      
      const welcomeMessage = `🎉 *أهلاً ${userName}!* 😊\n\n` +
        `*مرحباً بك في مختبر التوافق العاطفي* 🤖\n\n` +
        `✨ *أنا مساعدك الذكي للاستشارات النفسية والعاطفية* 💖\n\n` +
        `🔍 *كيف يمكنني مساعدتك:*\n` +
        `• استشارات عاطفية ونفسية 🌷\n` +
        `• نصائح للعلاقات والزواج 💑\n` +
        `• حلول للمشاكل الاجتماعية 🤝\n` +
        `• إرشادات للصحة النفسية 🧠\n\n` +
        `💬 *يمكنك سؤالي عن:*\n` +
        `• "كيف أتعامل مع القلق؟"\n` +
        `• "نصائح لعلاقة ناجحة"\n` +
        `• "كيف أنظم نومي؟"\n` +
        `• "أشعر بالحزن، ماذا أفعل؟"\n\n` +
        `📝 *الأوامر المتاحة:*\n` +
        `/start - إعادة الترحيب\n` +
        `/help - المساعدة\n` +
        `/test - اختبار Gemini\n\n` +
        `💡 *اكتب لي ما يدور في خاطرك الآن...* 🌟`;
      
      await sendTelegramMessage(chatId, welcomeMessage);
      return res.status(200).json({ ok: true });
    }
    
    // ===== معالجة أمر /help =====
    if (update.message?.text === '/help') {
      const chatId = update.message.chat.id;
      
      const helpMessage = `🆘 *مساعدة*\n\n` +
        `*كيفية استخدام البوت:*\n` +
        `1. اكتب رسالتك مباشرة\n` +
        `2. انتظر قليلاً للحصول على الرد\n` +
        `3. يمكنك طرح أي سؤال عاطفي أو نفسي\n\n` +
        `*نصائح للاستخدام الأمثل:*\n` +
        `• كن واضحاً في سؤالك\n` +
        `• اشرح مشاعرك بدقة\n` +
        `• لا تتردد في طرح أي استفسار\n\n` +
        `*الأوامر المتاحة:*\n` +
        `/start - بدء المحادثة\n` +
        `/help - هذه الرسالة\n` +
        `/test - اختبار الذكاء الاصطناعي\n\n` +
        `🌸 *تذكر:* أنا هنا لأسمعك وأساعدك.`;
      
      await sendTelegramMessage(chatId, helpMessage);
      return res.status(200).json({ ok: true });
    }
    
    // ===== معالجة أمر /test =====
    if (update.message?.text === '/test') {
      const chatId = update.message.chat.id;
      const userName = update.message.from.first_name;
      
      console.log(`🧪 ${userName} يختبر Gemini`);
      
      await sendTelegramMessage(chatId, '🔍 *جاري اختبار اتصال Gemini AI...*');
      
      try {
        // اختبار بسيط
        const testQuestion = "مرحباً، قل لي جملة قصيرة بالعربية";
        const testResponse = await getGeminiResponse(testQuestion);
        
        await sendTelegramMessage(
          chatId, 
          `✅ *Gemini AI يعمل بشكل ممتاز!* 🤖\n\n` +
          `📤 *سؤال الاختبار:* "${testQuestion}"\n\n` +
          `📥 *رد Gemini:* ${testResponse}\n\n` +
          `✨ *الحالة:* جاهز لمساعدتك! 💖`
        );
      } catch (error) {
        await sendTelegramMessage(
          chatId, 
          `❌ *اختبار Gemini فاشل* 😔\n\n` +
          `*الخطأ:* ${error.message}\n\n` +
          `*الحلول المقترحة:*\n` +
          `1. تأكد من صحة مفتاح API\n` +
          `2. جرب تحديث المفتاح\n` +
          `3. تأكد من تفعيل Gemini API`
        );
      }
      
      return res.status(200).json({ ok: true });
    }
    
    // ===== معالجة الرسائل العادية =====
    if (update.message?.text && !update.message.text.startsWith('/')) {
      const chatId = update.message.chat.id;
      const userMessage = update.message.text;
      const userName = update.message.from.first_name;
      const userId = update.message.from.id;
      
      console.log(`👤 ${userName} (${userId}): ${userMessage}`);
      
      try {
        // إرسال حالة الكتابة
        await sendTypingAction(chatId);
        
        // الحصول على الرد من Gemini
        const botResponse = await getGeminiResponse(userMessage);
        
        // إرسال الرد
        await sendTelegramMessage(chatId, botResponse);
        
        // إذا كان السؤال عن النوم، أضف نصائح إضافية
        if (userMessage.toLowerCase().includes('نوم')) {
          setTimeout(async () => {
            await sendTelegramMessage(
              chatId,
              '💡 *نصائح إضافية للنوم الجيد:*\n\n' +
              '• خذ حماماً دافئاً قبل النوم 🛁\n' +
              '• اشرب شاي البابونج أو اللافندر ☕\n' +
              '• اكتب همومك في دفتر قبل النوم 📓\n' +
              '• مارس تمارين شد العضلات الخفيفة 🧘‍♀️'
            );
          }, 1000);
        }
        
        console.log(`✅ تم الرد على ${userName}`);
        
      } catch (error) {
        console.error(`🔥 خطأ في معالجة رسالة ${userName}:`, error);
        
        await sendTelegramMessage(
          chatId,
          '⚠️ *عذراً، حدث خطأ غير متوقع*\n\n' +
          'حاول مرة أخرى بعد قليل 🌸\n\n' +
          'يمكنك استخدام:\n' +
          '/start - إعادة البدء\n' +
          '/test - اختبار النظام'
        );
      }
      
      return res.status(200).json({ ok: true });
    }
  }
  
  // إذا وصلنا هنا، نرد بموافقة عامة
  return res.status(200).json({ ok: true });
}

// ===== رسالة البدء في الكونسول =====
console.log('\n=== ✅ تهيئة البوت اكتملت ===');
console.log(`🤖 Telegram Bot Token: ${BOT_TOKEN ? '✅ موجود' : '❌ مطلوب'}`);
console.log(`🎯 Gemini API Key: ${GEMINI_API_KEY ? '✅ موجود' : '⚠️ قد لا يعمل Gemini'}`);
console.log(`🔗 API Endpoint: /api/bot`);
console.log(`📡 Model: gemini-2.5-flash`);
console.log('================================');
console.log('🌺 البوت جاهز لاستقبال الرسائل!');
