const API = (token, method) => `https://api.telegram.org/bot${token}/${method}`;
const { GoogleGenerativeAI } = require('@google/generative-ai');

const userSessions = new Map();
const TARGET_ADMIN_ID = process.env.ADMIN_ID || 7654355810;
const processingUsers = new Set();

// تخزين مؤقت للبيانات
let temporaryStorage = [];

// تهيئة Gemini بذكاء محدود جداً
let genAI, model;
try {
  if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.7,
        topP: 1,
        topK: 1,
        maxOutputTokens: 100,
      },
    });
    console.log('🤖 Gemini API جاهز (ذكاء محدود)');
  } else {
    console.log('⚠️ Gemini API غير مضبوط، سيستخدم الردود الثابتة');
  }
} catch (error) {
  console.error('❌ خطأ في تهيئة Gemini:', error);
}

// دالة للحصول على رد ذكي محدود من Gemini
async function getLimitedAIResponse(userMessage, userName = '') {
  try {
    if (!model) {
      return null; // إذا Gemini غير متاح
    }

    const prompt = `أجب بجملة واحدة بسيطة جداً:
    المستخدم: "${userMessage}"
    اسمه: ${userName || 'صديق'}
    
    اكتب رداً بسيطاً جداً (5-7 كلمات) عن المشاعر أو الحب.
    استخدم إيموجي واحد فقط.
    مثال: "مشاعرك جميلة 🌟" أو "الحب رحلة رائعة 😊"`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    text = text.replace(/\.$/, '');
    text = text.substring(0, 80);
    
    return text;
  } catch (error) {
    console.error('❌ خطأ في Gemini:', error);
    return null;
  }
}

// دالة لإنشاء تحليل Gemini بسيط
async function generateGeminiAnalysis(answers) {
  try {
    if (!model) {
      return null;
    }

    const prompt = `اعطي تحليلاً بسيطاً جداً (سطرين فقط) لمشاعر شخص:
    - مشاعر حالية: ${getAnswerText(answers.currentLove)}
    - تجارب سابقة: ${getAnswerText(answers.pastExperience)}
    - مستوى سعادته: ${getHappinessText(answers.happiness)}
    - حبه السابق: ${answers.oldLoveScore}/100
    - حبه الحالي: ${answers.newLoveScore}/100
    - وصف حياته: ${answers.lifeDescription || "لم يذكر"}
    
    اكتب تحليلاً بسيطاً وساذجاً (لا تكن ذكياً):
    سطر أول: ملاحظة إيجابية بسيطة
    سطر ثاني: نصيحة بسيطة
    استخدم إيموجي واحد فقط في النهاية`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    return text.substring(0, 150);
  } catch (error) {
    console.error('❌ خطأ في تحليل Gemini:', error);
    return null;
  }
}

export default async function handler(req, res) {
  const token = process.env.BOT_TOKEN;
  
  // رد على GET requests
  if (req.method !== "POST") {
    return res.status(200).json({ 
      status: "active",
      service: "🌸 لعبة المشاعر الجميلة",
      version: "2.0 مع ذكاء محدود",
      note: "اكتشف الجمال ببساطة"
    });
  }

  const update = req.body;
  const chatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
  const userId = update.message?.from?.id || update.callback_query?.from?.id;

  // منع المعالجة المتعددة
  if (processingUsers.has(userId)) {
    return res.status(200).end();
  }
  processingUsers.add(userId);

  try {
    // ==================== أوامر الإدمن الجديدة ====================
    if (userId == TARGET_ADMIN_ID && update.message?.text) {
      const text = update.message.text;
      
      if (text === "/ai_status") {
        const status = model ? "✅ نشط (ذكاء محدود)" : "❌ غير نشط";
        await sendMessage(TARGET_ADMIN_ID,
          `🤖 *حالة Gemini AI*\n\n` +
          `الحالة: ${status}\n` +
          `النموذج: gemini-1.5-flash\n` +
          `الذكاء: محدود جداً\n` +
          `طول الردود: قصيرة جداً\n\n` +
          `✨ *مميزات الذكاء المحدود:*\n` +
          `• ردود بسيطة وساذجة\n` +
          `• لا تحليل عميق\n` +
          `• إجابات مبتذلة\n` +
          `• استخدام إيموجيات فقط`,
          token
        );
        return res.status(200).end();
      }
      
      if (text.startsWith("/ai_test")) {
        const testText = text.replace("/ai_test", "").trim() || "مرحباً";
        await sendMessage(TARGET_ADMIN_ID, "🤖 جاري اختبار الذكاء المحدود...", token);
        
        const aiResponse = await getLimitedAIResponse(testText, "الإدمن");
        if (aiResponse) {
          await sendMessage(TARGET_ADMIN_ID,
            `🧪 *نتيجة اختبار الذكاء المحدود*\n\n` +
            `📤 المدخل: "${testText}"\n` +
            `📥 المخرج: "${aiResponse}"\n\n` +
            `✅ الذكاء محدود كما هو مطلوب!`,
            token
          );
        } else {
          await sendMessage(TARGET_ADMIN_ID, "❌ Gemini غير متاح", token);
        }
        return res.status(200).end();
      }
      
      // الأوامر القديمة (متبقية كما هي)
      if (text === "/admin") {
        await sendMessage(TARGET_ADMIN_ID,
          `👑 *مرحباً يا أدمن!*\n\n` +
          `🤖 *الميزات الجديدة:*\n` +
          `/ai_status - حالة الذكاء الاصطناعي\n` +
          `/ai_test [نص] - اختبار الذكاء المحدود\n\n` +
          `🆔 ID الخاص بك: \`${TARGET_ADMIN_ID}\`\n` +
          `📊 الإجابات المخزنة: ${temporaryStorage.length}\n` +
          `👥 الجلسات النشطة: ${userSessions.size}\n` +
          `⏰ الوقت: ${new Date().toLocaleString('ar-EG')}`,
          token
        );
        return res.status(200).end();
      }
      
      // ... بقية أوامر الإدمن القديمة تبقى كما هي
    }

    // ==================== بدء اللعبة المحدث ====================
    if (update.message?.text?.startsWith("/start")) {
      const user = update.message.from;
      
      userSessions.set(chatId, { 
        state: "welcome", 
        answers: { 
          userInfo: {
            id: user.id,
            username: user.username || "بدون معرف",
            firstName: user.first_name,
            lastName: user.last_name || "",
            chatId: chatId
          },
          startTime: Date.now()
        },
        step: 1
      });
      
      await sendMessage(chatId,
        `🌸 *مرحباً ${user.first_name}!*\n\n` +
        `💝 *لعبة المشاعر الجميلة*\n` +
        `🤖 *النسخة مع ذكاء محدود*\n\n` +
        `✨ *ما الجديد:*\n` +
        `• تحليل بسيط جداً بواسطة AI\n` +
        `• ردود مبتذلة وغير ذكية\n` +
        `• تركيز على البساطة فقط\n\n` +
        `🚫 *ما ليس في هذه النسخة:*\n` +
        `• لا ذكاء عالي\n` +
        `• لا تحليل معقد\n` +
        `• لا تفكير عميق\n\n` +
        `📝 *ملاحظة:*\n` +
        `الذكاء محدود جداً... مثل طفل صغير 😊`,
        token, [
        [{ text: "🚀 ابدأ اللعبة البسيطة", callback_data: "start_test" }]
      ]);
      
      return res.status(200).end();
    }

    // ==================== التعامل مع الأزرار ====================
    else if (update.callback_query) {
      const data = update.callback_query.data;
      const session = userSessions.get(chatId);
      
      if (data === "restart_test") {
        userSessions.delete(chatId);
        await sendMessage(chatId,
          "🔄 *تم إعادة تعيين اللعبة*\n\n" +
          "أرسل /start للبدء من جديد 🌸",
          token
        );
        await answerCallback(update.callback_query.id, "✨ تمت إعادة التعيين", token);
        return res.status(200).end();
      }

      if (session) {
        if (data === "start_test" && session.state === "welcome") {
          session.state = "q1";
          await askQuestion1(chatId, token);
        }
        else if (data.startsWith("love_") && session.state === "q1") {
          session.answers.currentLove = data;
          session.state = "q2";
          await askQuestion2(chatId, token);
        }
        else if (data.startsWith("past_") && session.state === "q2") {
          session.answers.pastExperience = data;
          session.state = "q3";
          await askQuestion3(chatId, token);
        }
        else if (data.startsWith("happy_") && session.state === "q3") {
          session.answers.happiness = data;
          session.state = "q4";
          await sendMessage(chatId,
            `📝 *السؤال 4/6*\n\n` +
            `🔢 *على مقياس من 0 إلى 100*\n` +
            `ما مدى حبك للشخص السابق؟\n\n` +
            `*أدخل رقماً فقط:*\n` +
            `(0 = لا يوجد حب، 100 = حب عميق)\n\n` +
            `💡 تلميح: لا تفكر كثيراً!`,
            token
          );
        }
        
        userSessions.set(chatId, session);
      }
      
      await answerCallback(update.callback_query.id, "✨ تم استلام إجابتك", token);
      return res.status(200).end();
    }

    // ==================== التعامل مع النصوص ====================
    else if (update.message?.text) {
      const text = update.message.text.trim();
      const session = userSessions.get(chatId);

      if (session) {
        if (session.state === "q4") {
          const num = parseInt(text);
          if (!isNaN(num) && num >= 0 && num <= 100) {
            session.answers.oldLoveScore = num;
            session.state = "q5";
            await sendMessage(chatId,
              `💫 *السؤال 5/6*\n\n` +
              `🔢 *على مقياس من 0 إلى 100*\n` +
              `ما مدى حبك للشخص الحالي؟\n\n` +
              `*أدخل رقماً فقط:*\n` +
              `(0 = لا يوجد، 100 = حب كامل)\n\n` +
              `😊 تذكر: البساطة جميلة!`,
              token
            );
          } else {
            await sendMessage(chatId,
              "⚠️ *الرجاء إدخال رقم بين 0 و 100*\n\n" +
              "مثال بسيط: 50\nلا تفكر كثيراً!",
              token
            );
          }
        }
        else if (session.state === "q5") {
          const num = parseInt(text);
          if (!isNaN(num) && num >= 0 && num <= 100) {
            session.answers.newLoveScore = num;
            session.state = "q6";
            await sendMessage(chatId,
              `📖 *السؤال الأخير 6/6*\n\n` +
              `💭 *اكتب شيئاً بسيطاً عن مشاعرك...*\n\n` +
              `لا تحتاج لكتابة مقال!\n` +
              `مجرد جملة أو كلمتين 😊\n\n` +
              `مثال: "أشعر بالسعادة" أو "أبحث عن الحب"`,
              token
            );
          } else {
            await sendMessage(chatId,
              "⚠️ *رقم فقط من 0 إلى 100*\n\n" +
              "مثال: 80\n" +
              "حاول مرة أخرى ببساطة!",
              token
            );
          }
        }
        else if (session.state === "q6") {
          session.answers.lifeDescription = text;
          await processFinalAnswers(chatId, session, token);
        }
        
        userSessions.set(chatId, session);
      } else {
        // إذا كتب المستخدم نصاً عشوائياً
        const aiResponse = await getLimitedAIResponse(text, update.message.from.first_name);
        if (aiResponse) {
          await sendMessage(chatId,
            `🤖 *رد الذكاء المحدود:*\n\n` +
            `${aiResponse}\n\n` +
            `💡 أرسل /start للعب!`,
            token
          );
        } else {
          await sendMessage(chatId,
            "🌸 *مرحباً!*\n\n" +
            "أرسل /start للعب لعبة المشاعر الجميلة!",
            token
          );
        }
      }
      
      return res.status(200).end();
    }

  } catch (error) {
    console.error("❌ خطأ في المعالجة:", error);
    
    try {
      await sendMessage(chatId,
        "⚠️ *حدث خطأ*\n\n" +
        "حاول مرة أخرى أو أرسل /start\n" +
        "الذكاء محدود جداً اليوم 😅",
        token
      );
    } catch (e) {
      console.error("❌ فشل في إرسال رسالة الخطأ:", e);
    }
    
  } finally {
    processingUsers.delete(userId);
    res.status(200).end();
  }
}

// ==================== دالة معالجة الإجابات النهائية المحدثة ====================
async function processFinalAnswers(chatId, session, token) {
  try {
    // رسالة تحميل
    await sendMessage(chatId,
      `⚡ *جاري معالجة إجاباتك...*\n\n` +
      `🤖 أستخدم ذكاء محدود جداً\n` +
      `🌸 لأعطيك رداً بسيطاً\n` +
      `💝 لا تتوقع تحليلاً عميقاً!\n\n` +
      `_الذكاء محدود... الصبر جميل 😊_`,
      token
    );

    // الحساب الأساسي
    const compatibility = calculateCompatibility(
      session.answers.oldLoveScore || 0,
      session.answers.newLoveScore || 0,
      session.answers.happiness || "happy_neutral"
    );
    
    // محاولة الحصول على تحليل Gemini (إن وجد)
    let geminiAnalysis = null;
    if (model) {
      try {
        geminiAnalysis = await generateGeminiAnalysis(session.answers);
      } catch (error) {
        console.error('❌ خطأ في تحليل Gemini:', error);
      }
    }
    
    const duration = Date.now() - session.answers.startTime;
    const user = session.answers.userInfo;

    // تخزين البيانات
    const storedData = {
      user: user,
      answers: session.answers,
      compatibility: compatibility,
      geminiAnalysis: geminiAnalysis,
      timestamp: new Date().toISOString(),
      duration: duration
    };
    
    temporaryStorage.push(storedData);
    
    // الحفاظ على حجم معقول
    if (temporaryStorage.length > 100) {
      temporaryStorage = temporaryStorage.slice(-100);
    }

    // ===== إرسال التقرير للإدمن =====
    const adminReport = `
🎯 *تقرير جديد مع ذكاء محدود*
⏰ ${new Date().toLocaleString('ar-EG')}

👤 *المستخدم:*
✨ ${user.firstName} @${user.username || 'بدون'}
✨ الـ ID: \`${user.id}\`

🌸 *الإجابات:*
1️⃣ ${getAnswerText(session.answers.currentLove)}
2️⃣ ${getAnswerText(session.answers.pastExperience)}
3️⃣ ${getHappinessText(session.answers.happiness)}
4️⃣ حب سابق: ${session.answers.oldLoveScore}/100
5️⃣ حب حالي: ${session.answers.newLoveScore}/100
6️⃣ ${session.answers.lifeDescription || "لم يذكر"}

💫 *النتيجة:*
✨ النسبة: *${compatibility.score}%*
✨ المستوى: *${compatibility.level}*

🤖 *تحليل الذكاء المحدود:*
${geminiAnalysis || "⚠️ غير متاح"}

📊 *معلومات:*
⏱️ ${Math.round(duration / 1000)} ثانية
🎯 رقم: ${temporaryStorage.length}
    `;

    await sendMessage(TARGET_ADMIN_ID, adminReport.trim(), token, [[
      { text: "💬 التواصل", url: `tg://user?id=${user.id}` }
    ]]);

    // ===== إرسال النتيجة للمستخدم =====
    let userMessage = `🎉 *تم الانتهاء!*\n\n`;
    
    userMessage += `🌸 *نتيجتك البسيطة:*\n`;
    userMessage += `✨ النسبة: *${compatibility.score}%*\n`;
    userMessage += `💫 المستوى: *${compatibility.level}*\n\n`;
    
    if (geminiAnalysis) {
      userMessage += `🤖 *ملاحظة من الذكاء المحدود:*\n`;
      userMessage += `${geminiAnalysis}\n\n`;
    } else {
      userMessage += `💭 *رسالة بسيطة لك:*\n`;
      userMessage += `"الحياة جميلة بالمشاعر البسيطة"\n\n`;
    }
    
    userMessage += `📝 *تذكير:*\n`;
    userMessage += `هذه لعبة بسيطة للترفيه فقط\n`;
    userMessage += `لا تأخذ النتائج بجدية كبيرة! 😊`;

    await sendMessage(chatId, userMessage, token);

    // زر إعادة اللعبة
    await sendMessage(chatId,
      "🔄 هل تريد اللعب مرة أخرى؟",
      token,
      [[{ text: "🌸 نعم، العب مرة أخرى", callback_data: "restart_test" }]]
    );

    // حذف الجلسة
    userSessions.delete(chatId);
    
    console.log(`✅ تم معالجة: ${user.firstName} (ذكاء محدود)`);

  } catch (error) {
    console.error("❌ خطأ في المعالجة النهائية:", error);
    
    await sendMessage(chatId,
      `⚠️ *حدث خطأ ولكن...*\n\n` +
      `شكراً للمشاركة!\n` +
      `الذكاء كان محدوداً جداً اليوم 😅\n\n` +
      `أرسل /start للمحاولة مرة أخرى`,
      token
    );
    
    userSessions.delete(chatId);
  }
}

// ==================== دوال المساعدة ====================
function calculateCompatibility(oldLove, newLove, happinessLevel) {
  // حساب بسيط جداً
  const score = Math.round((newLove * 0.6) + (oldLove * 0.4));
  
  let level;
  if (score >= 80) level = "💖 ممتاز";
  else if (score >= 60) level = "✨ جيد";
  else if (score >= 40) level = "🌷 متوسط";
  else if (score >= 20) level = "🌱 بسيط";
  else level = "🌸 مبتدئ";
  
  return { score: Math.min(100, Math.max(0, score)), level };
}

function getAnswerText(answerKey) {
  const answers = {
    'love_strong': '💖 مشاعر قوية',
    'love_moderate': '✨ مشاعر متوسطة',
    'love_unsure': '🤔 غير متأكد',
    'love_no': '🌸 ليس الآن',
    'past_deep': '💔 تجربة عميقة',
    'past_ended': '🌟 تجربة انتهت',
    'past_none': '🕊️ ليس بعد',
    'past_secret': '🔐 خصوصية'
  };
  return answers[answerKey] || 'غير محدد';
}

function getHappinessText(happinessKey) {
  const happinessMap = {
    'happy_very': '😄 سعيد جداً',
    'happy_yes': '🙂 سعيد',
    'happy_neutral': '😐 محايد',
    'happy_no': '💭 يبحث عن سعادة'
  };
  return happinessMap[happinessKey] || 'غير محدد';
}

async function sendMessage(chatId, text, token, keyboard = null) {
  try {
    const body = { 
      chat_id: chatId, 
      text, 
      parse_mode: "Markdown",
      disable_web_page_preview: true 
    };
    
    if (keyboard) {
      body.reply_markup = { inline_keyboard: keyboard };
    }
    
    const response = await fetch(API(token, "sendMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      console.error('❌ فشل في إرسال الرسالة');
    }
    
    return response;
  } catch (error) {
    console.error("❌ خطأ في إرسال الرسالة:", error);
  }
}

async function answerCallback(id, text, token) {
  try {
    await fetch(API(token, "answerCallbackQuery"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        callback_query_id: id,
        text: text || "✨ تم",
        show_alert: false 
      })
    });
  } catch (error) {
    console.error("❌ خطأ في الإجابة:", error);
  }
}

// دوال الأسئلة (تبقى كما هي)
async function askQuestion1(chatId, token) {
  await sendMessage(chatId,
    `🎯 *السؤال 1/6*\n\n` +
    `💘 *هل تشعر بحب لشخص الآن؟*\n\n` +
    `اختر ببساطة:`,
    token, [
    [
      { text: "💖 نعم", callback_data: "love_strong" },
      { text: "✨ متوسط", callback_data: "love_moderate" }
    ],
    [
      { text: "🤔 غير متأكد", callback_data: "love_unsure" },
      { text: "🌸 لا", callback_data: "love_no" }
    ]
  ]);
}

async function askQuestion2(chatId, token) {
  await sendMessage(chatId,
    `📜 *السؤال 2/6*\n\n` +
    `⏳ *هل لديك تجربة حب سابقة؟*\n\n` +
    `أجب ببساطة:`,
    token, [
    [
      { text: "💔 نعم عميقة", callback_data: "past_deep" },
      { text: "🌟 نعم عادية", callback_data: "past_ended" }
    ],
    [
      { text: "🕊️ لا", callback_data: "past_none" },
      { text: "🔐 سري", callback_data: "past_secret" }
    ]
  ]);
}

async function askQuestion3(chatId, token) {
  await sendMessage(chatId,
    `😊 *السؤال 3/6*\n\n` +
    `🌈 *هل أنت سعيد الآن؟*\n\n` +
    `أجب بصدق:`,
    token, [
    [
      { text: "😄 نعم جداً", callback_data: "happy_very" },
      { text: "🙂 نعم", callback_data: "happy_yes" }
    ],
    [
      { text: "😐 محايد", callback_data: "happy_neutral" },
      { text: "💭 لا", callback_data: "happy_no" }
    ]
  ]);
}

// ==================== تهيئة النظام ====================
console.log('🚀 بدء لعبة المشاعر الجميلة...');
console.log(`👑 الإدمن: ${TARGET_ADMIN_ID}`);
if (model) {
  console.log('🤖 Gemini نشط (ذكاء محدود جداً)');
} else {
  console.log('⚠️ Gemini غير نشط - سيستخدم الردود الثابتة');
}
console.log('🌸 النظام جاهز!');
