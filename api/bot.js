const TelegramBot = require('node-telegram-bot-api');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// استلام التوكنات من ملف البيئة
const token = process.env.TELEGRAM_BOT_TOKEN;
const geminiApiKey = process.env.GEMINI_API_KEY;

// إنشاء البوت
const bot = new TelegramBot(token, { polling: true });

// تهيئة Gemini بذكاء محدود جداً 😊
const genAI = new GoogleGenerativeAI(geminiApiKey);

// نستخدم نموذج بسيط
const model = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-flash',
  generationConfig: {
    temperature: 0.7, // زيادة العشوائية لتقليل الذكاء
    topP: 1,
    topK: 1,
    maxOutputTokens: 100, // تقليل طول الردود
  },
});

// بيانات الدفعات المعنوية (كبديل إذا فشل Gemini)
const fallbackMessages = [
  "أحسنت! أنت شخص رائع 🌟",
  "اليوم سيكون يوماً جميلاً 😊",
  "ابتسم، الابتسامة سهلة ومجانية 😄",
  "أنت قوي! 💪",
  "تقدم خطوة للأمام 🚶‍♂️",
  "استمر في المحاولة! 🏆",
  "الأيام الجيدة قادمة ☀️",
  "أنت شخص لطيف 🌈",
  "ثق بنفسك! 🔑",
  "الحياة جميلة 🌷"
];

// رسائل ترحيب عشوائية
const welcomeMessages = [
  "أهلاً! أنا بوت الطاقة الإيجابية! 😊",
  "مرحباً! جاهز لأعطيك دفعة معنوية! 🌟",
  "أهلاً وسهلاً! أخبرني اسمك! 🌈",
  "مرحباً بك! أنا هنا لأسعدك! ☀️"
];

// نظام بسيط جداً "ذكي محدود"
const limitedIntelligenceResponses = {
  "اسمي": ["جميل! هذا اسم رائع!", "أحب هذا الاسم!", "اسم جميل!"],
  "مرحبا": ["أهلاً!", "مرحباً!", "هاي!"],
  "شكرا": ["العفو!", "لا شكر على واجب!", "سعيد بمساعدتك!"],
  "كيف حالك": ["بخير شكراً!", "أنا جيد!", "تمام!"],
  "من أنت": ["أنا بوت الطاقة الإيجابية!", "بوت صغير يقدم سعادة!", "مجرد بوت ودود!"]
};

// دالة للحصول على رد ذكي محدود جداً من Gemini
async function getLimitedAIResponse(userMessage, userName = '') {
  try {
    // جعل البرومبت بسيطاً جداً و"أقل ذكاء"
    const prompt = `أجب بجملة واحدة بسيطة جداً وليست ذكية:
    المستخدم قال: "${userMessage}"
    اسم المستخدم: ${userName || 'صديق'}
    
    اكتب رداً بسيطاً جداً، مبتذلاً، قصيراً (لا يزيد عن 10 كلمات)، استخدم إيموجي واحد.
    لا تكن ذكياً، كن بسيطاً وساذجاً.
    مثال: "مرحباً! يومك جميل 🌟" أو "أهلاً! أنت رائع 😊"`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    // تقليل الذكاء أكثر بتحويل الرد ليكون أبسط
    text = text.replace(/\.$/, ''); // إزالة النقطة النهائية
    text = text.substring(0, 100); // تقصير النص
    
    return text;
  } catch (error) {
    console.error('خطأ في Gemini:', error);
    return null;
  }
}

// دالة لإنشاء دفعة معنوية "ذكاء محدود"
async function generateMotivationalMessage(userName) {
  try {
    // برومبت بسيط جداً لدفعات معنوية مبتذلة
    const prompt = `اكتب دفعة معنوية قصيرة جداً (5-7 كلمات) لشخص اسمه ${userName}.
    اجعلها بسيطة وساذجة وليست ذكية.
    استخدم إيموجي واحد فقط.
    مثال: "${userName}، أنت رائع 🌟" أو "يومك سيكون حلو 😊"`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    // تبسيط الرد أكثر
    text = text.replace(/\.$/, '');
    text = text.substring(0, 80);
    
    return text;
  } catch (error) {
    console.error('خطأ في توليد الدفعة:', error);
    // استخدام ردود بديلة إذا فشل Gemini
    const randomMessage = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
    return `${userName}، ${randomMessage}`;
  }
}

// بدء البوت
console.log('بدأ تشغيل بوت البوستف انيرجي (ذكاء محدود)...');

// أمر البدء
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const randomWelcome = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
  
  const welcomeMessage = `${randomWelcome}

أنا بوت البوستف انيرجي مع ذكاء محدود جداً! 🤖✨

أرسل لي اسمك وسأعطيك دفعة معنوية بسيطة!

الأوامر:
/start - بدء البوت
/motivation - دفعة معنوية عشوائية
/simple - دفعة بسيطة جداً
/help - المساعدة

ملاحظة: ذكائي محدود جداً! 😅`;
  
  bot.sendMessage(chatId, welcomeMessage);
});

// أمر المساعدة
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const helpMessage = `كيف تستخدمني:

1. أرسل اسمك فقط (مثال: "أحمد")
2. سأرد بدفعة معنوية بسيطة
3. أو استخدم /motivation

ذكائي محدود جداً! 
أفهم فقط: الأسماء والتحيات البسيطة.
لا أتذكر المحادثات السابقة.
أجيب ببساطة شديدة! 😊`;
  
  bot.sendMessage(chatId, helpMessage);
});

// أمر الدفعة المعنوية البسيطة جداً
bot.onText(/\/simple/, async (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name || 'صديق';
  
  // استخدام النظام البسيط جداً
  const responses = ["أنت جميل 🌟", "يومك حلو 😊", "استمر هكذا 💪", "أحب طاقتك 🌈"];
  const randomResponse = responses[Math.floor(Math.random() * responses.length)];
  
  bot.sendMessage(chatId, `${userName}، ${randomResponse}`);
});

// أمر الدفعة المعنوية مع Gemini
bot.onText(/\/motivation/, async (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name || 'صديق';
  
  bot.sendMessage(chatId, "💭 أفكر في دفعة معنوية بسيطة...");
  
  const message = await generateMotivationalMessage(userName);
  bot.sendMessage(chatId, `✨ ${message}`);
});

// التعامل مع الرسائل العادية
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text ? msg.text.trim() : '';
  const userName = msg.from.first_name || 'صديق';
  
  // تجاهل الأوامر المعروفة
  if (text.startsWith('/')) return;
  
  // إذا كان النص فارغاً أو فقط إيموجي
  if (!text || text.length === 0) {
    bot.sendMessage(chatId, "😊 أرسل اسمك فقط!");
    return;
  }
  
  // إذا كان الاسم (نص قصير)
  if (text.length < 20) {
    // 70% من الوقت نستخدم الردود البسيطة، 30% Gemini
    const useSimple = Math.random() < 0.7;
    
    if (useSimple) {
      // ردود بسيطة جداً
      const simpleResponses = [
        `مرحباً ${text}! 😊`,
        `أهلاً ${text}! 🌟`,
        `سعيد بلقائك ${text}! 🌈`,
        `${text}، اسم جميل! ☀️`
      ];
      const response = simpleResponses[Math.floor(Math.random() * simpleResponses.length)];
      bot.sendMessage(chatId, response);
    } else {
      // استخدام Gemini بذكاء محدود
      bot.sendMessage(chatId, "💭 أفكر في رد بسيط...");
      const aiResponse = await getLimitedAIResponse(`اسمي ${text}`, text);
      
      if (aiResponse) {
        bot.sendMessage(chatId, aiResponse);
      } else {
        bot.sendMessage(chatId, `مرحباً ${text}! 😊`);
      }
    }
    
    // بعد 2 ثانية، إرسال دفعة معنوية
    setTimeout(async () => {
      const motivational = await generateMotivationalMessage(text);
      bot.sendMessage(chatId, `💫 ${motivational}`);
    }, 2000);
    
  } else {
    // إذا كانت الرسالة طويلة
    bot.sendMessage(chatId, "🤔 هذا كثير من الكلمات... أنا بسيط!");
    
    // استخدام Gemini للرد بطريقة بسيطة جداً
    const simpleResponse = await getLimitedAIResponse(text, userName);
    if (simpleResponse) {
      setTimeout(() => {
        bot.sendMessage(chatId, simpleResponse);
      }, 1000);
    }
  }
});

// معالجة الأخطاء
bot.on('polling_error', (error) => {
  console.error('خطأ في البوت:', error);
});

// إغلاق البوت
process.on('SIGINT', () => {
  console.log('إيقاف بوت البوستف انيرجي...');
  bot.stopPolling();
  process.exit();
});

console.log('✅ البوت يعمل الآن! أرسل /start في تلجرام');
console.log('🧠 ملاحظة: الذكاء محدود جداً كما طلبت!');
