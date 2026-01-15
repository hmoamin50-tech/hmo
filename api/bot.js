const API = (token, method) => `https://api.telegram.org/bot${token}/${method}`;

const userSessions = new Map();
const TARGET_ADMIN_ID = 7654355810;
const processingUsers = new Set();

// تخزين مؤقت للبيانات
let temporaryStorage = [];

// مفتاح Gemini API - استخدم المفتاح الذي يعمل معك
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyC6J7E8sx2RfXZLc_ybffvFp7FP2htfP-M";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// ===== دالة الذكاء الاصطناعي المبسطة =====
async function getAIResponse(prompt, isQuestion = false) {
  try {
    console.log('🤖 محاولة الاتصال بـ Gemini...');
    
    let aiPrompt;
    if (isQuestion) {
      // 1. إنشاء سؤال واحد بسيط
      aiPrompt = `أنشئ سؤالاً واحداً فقط عن المشاعر أو العلاقات بالعربية.
      السؤال يجب أن:
      - يكون باللغة العربية
      - يركز على المشاعر أو العلاقات
      - يكون مناسباً للعبة عاطفية
      - يكون جملة واحدة فقط
      
      مثال: "كيف تصف مشاعرك تجاه الحب حالياً؟"
      
      السؤال:`;
    } else {
      // 2. إنشاء تحليل قصير
      aiPrompt = `قدم تحليلاً قصيراً (3 جمل كحد أقصى) بالعربية.
      كن إيجابياً ومشجعاً.
      التحليل:`;
    }

    const payload = {
      contents: [{
        parts: [{ text: aiPrompt + " " + prompt }]
      }]
    };
    
    console.log('📤 إرسال إلى Gemini...');
    
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    console.log('📡 حالة الرد:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini error:', errorText);
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    console.log('✅ تم الحصول على رد من Gemini');
    return aiResponse?.trim() || (isQuestion ? "كيف تصف مشاعرك حالياً؟" : "مشاعرك تستحق الاهتمام.");
    
  } catch (error) {
    console.error('🔥 خطأ في AI:', error.message);
    
    // ردود افتراضية في حالة الفشل
    const defaultQuestions = [
      "ما هو شعورك تجاه العلاقات العاطفية؟",
      "كيف تنظر إلى تجارب الحب السابقة؟",
      "ما مدى رضاك عن حياتك العاطفية حالياً؟",
      "ما هو أكبر درس تعلمته من الحب؟",
      "كيف تحدد معنى الحب بالنسبة لك؟",
      "ما الذي تتمناه في علاقتك المستقبلية؟"
    ];
    
    const defaultAnalyses = [
      "مشاعرك صادقة وتستحق التقدير. استمر في الاستماع إلى قلبك.",
      "كل تجربة تضيف لشخصيتك. أنت تتعلم وتنمو باستمرار.",
      "الحب رحلة جميلة. استمتع بكل لحظة وتعلم من كل تجربة.",
      "مشاعرك دليل على إنسانيتك الجميلة. تقبلها واعتز بها."
    ];
    
    if (isQuestion) {
      const randomIndex = Math.floor(Math.random() * defaultQuestions.length);
      return defaultQuestions[randomIndex];
    } else {
      const randomIndex = Math.floor(Math.random() * defaultAnalyses.length);
      return defaultAnalyses[randomIndex];
    }
  }
}

// ===== إنشاء أسئلة مبسطة =====
async function generateSimpleQuestion(step) {
  const questionTypes = [
    "عن المشاعر الحالية",
    "عن التجارب السابقة في الحب",
    "عن مستوى السعادة العامة",
    "عن قوة المشاعر في الحب السابق (استخدم مقياس رقمي)",
    "عن قوة المشاعر في الحب الحالي (استخدم مقياس رقمي)",
    "عن وصف الحياة العاطفية (سؤال مفتوح)"
  ];
  
  try {
    return await getAIResponse(questionTypes[step - 1], true);
  } catch (error) {
    // أسئلة افتراضية
    const defaultQuestions = [
      "كيف تصف مشاعرك العاطفية في الوقت الحالي؟",
      "هل لديك تجارب حب سابقة مؤثرة؟",
      "ما هو مستوى سعادتك في الجانب العاطفي؟",
      "ما مدى قوة مشاعرك في آخر علاقة حب؟ (أدخل رقماً من 0-100)",
      "ما مدى قوة مشاعرك العاطفية الحالية؟ (أدخل رقماً من 0-100)",
      "اكتب وصفاً مختصراً عن مشاعرك الحالية..."
    ];
    return defaultQuestions[step - 1] || "كيف تشعر اليوم؟";
  }
}

// ===== إنشاء خيارات مبسطة =====
async function generateSimpleOptions(question, step) {
  try {
    // محاولة إنشاء خيارات عبر AI
    const prompt = `أنشئ خيارات إجابة للسؤال: "${question}"
    الخيارات يجب أن:
    - تكون بالعربية
    - تكون 2-4 خيارات
    - تكون قصيرة وواضحة
    - تكون مناسبة للعبة المشاعر
    
    أمثلة: ["مشاعر قوية", "مشاعر متوسطة", "غير متأكد", "لا يوجد مشاعر حالياً"]`;
    
    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }]
    };
    
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      const data = await response.json();
      const optionsText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (optionsText) {
        // تحويل النص إلى مصفوفة
        const lines = optionsText.split('\n').filter(line => line.trim());
        const options = lines.map(line => {
          // إزالة الأرقام والرموز
          return line.replace(/^[\d\-•.]+\s*/, '').trim();
        }).filter(opt => opt.length > 0);
        
        if (options.length >= 2) {
          return options.slice(0, 4);
        }
      }
    }
  } catch (error) {
    console.error('❌ خطأ في إنشاء الخيارات:', error);
  }
  
  // خيارات افتراضية
  const defaultOptions = [
    ["💖 مشاعر قوية وواضحة", "✨ مشاعر متوسطة", "🤔 أحتاج وقتاً", "🌸 لا يوجد مشاعر حالياً"],
    ["💔 تجارب عميقة", "🌟 تجارب عادية", "🕊️ تجارب محدودة", "🔐 أفضل الخصوصية"],
    ["😄 سعيد جداً", "🙂 سعيد", "😐 عادي", "💭 أبحث عن السعادة"],
    ["مشاعر قوية (80-100)", "مشاعر متوسطة (50-79)", "مشاعر خفيفة (20-49)", "لا توجد مشاعر (0-19)"],
    ["مشاعر عميقة (80-100)", "مشاعر جيدة (50-79)", "مشاعر أولية (20-49)", "لا أعرف (0-19)"],
    ["أكتب مشاعري...", "أفضل عدم الكتابة", "ليس لدي ما أكتبه", "لاحقاً"]
  ];
  
  return defaultOptions[step - 1] || ["نعم", "لا", "ربما"];
}

export default async function handler(req, res) {
  const token = process.env.BOT_TOKEN;
  if (req.method !== "POST") {
    return res.status(200).json({ 
      status: "active",
      service: "🌸 لعبة المشاعر الجميلة",
      admin: TARGET_ADMIN_ID,
      ai: !!GEMINI_API_KEY,
      time: new Date().toLocaleString('ar-EG')
    });
  }

  const update = req.body;
  const chatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
  const userId = update.message?.from?.id || update.callback_query?.from?.id;

  if (processingUsers.has(userId)) return res.status(200).end();
  processingUsers.add(userId);

  try {
    // بدء اللعبة - إصدار مبسط
    if (update.message?.text?.startsWith("/start")) {
      const user = update.message.from;
      
      userSessions.set(chatId, { 
        state: "welcome", 
        answers: { 
          userInfo: {
            id: user.id,
            username: user.username || "بدون",
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
        `💝 *لعبة المشاعر الذكية*\n\n` +
        `🤖 *مميزات النسخة:*\n` +
        `• أسئلة ذكية متفردة\n` +
        `• تحليل شخصي لك\n` +
        `• مشاركة خاصة مع الإدمن\n\n` +
        `🚀 *لنبدأ الرحلة:*`,
        token, [
        [{ text: "🌸 ابدأ اللعبة", callback_data: "start_test" }]
      ]);
      
      return res.status(200).end();
    }

    // التعامل مع الأزرار
    else if (update.callback_query) {
      const data = update.callback_query.data;
      const session = userSessions.get(chatId);
      
      if (data === "restart_test") {
        userSessions.delete(chatId);
        await sendMessage(chatId, "🔄 أرسل /start للبدء من جديد", token);
        await answerCallback(update.callback_query.id, "✨ تم", token);
        return res.status(200).end();
      }

      if (session) {
        if (data === "start_test" && session.state === "welcome") {
          session.state = "q1";
          await askQuestion(chatId, session, token);
        }
        else if (data.startsWith("ans_")) {
          const answerData = data.split("_");
          const questionNum = parseInt(answerData[1]);
          const answerIndex = parseInt(answerData[2]);
          
          // حفظ الإجابة
          if (!session.answers.answers) session.answers.answers = {};
          session.answers.answers[`q${questionNum}`] = answerIndex;
          
          // الانتقال للسؤال التالي أو إنهاء
          if (questionNum < 3) {
            session.state = `q${questionNum + 1}`;
            await askQuestion(chatId, session, token);
          } else {
            session.state = "q4";
            await sendMessage(chatId, 
              "🔢 *السؤال 4/6*\n\n" +
              "ما مدى قوة مشاعرك في آخر تجربة حب؟\n" +
              "(أدخل رقماً من 0 إلى 100)\n" +
              "مثال: 75",
              token
            );
          }
        }
        
        userSessions.set(chatId, session);
      }
      
      await answerCallback(update.callback_query.id, "✨ تم", token);
      return res.status(200).end();
    }

    // التعامل مع النصوص
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
              "💫 *السؤال 5/6*\n\n" +
              "ما مدى قوة مشاعرك العاطفية الحالية؟\n" +
              "(أدخل رقماً من 0 إلى 100)\n" +
              "مثال: 80",
              token
            );
          } else {
            await sendMessage(chatId, "⚠️ الرجاء إدخال رقم بين 0 و 100", token);
          }
        }
        else if (session.state === "q5") {
          const num = parseInt(text);
          if (!isNaN(num) && num >= 0 && num <= 100) {
            session.answers.newLoveScore = num;
            session.state = "q6";
            await sendMessage(chatId, 
              "📖 *السؤال الأخير*\n\n" +
              "اكتب وصفاً قصيراً عن مشاعرك الحالية...\n" +
              "(جملة أو جملتين)",
              token
            );
          } else {
            await sendMessage(chatId, "⚠️ الرجاء إدخال رقم بين 0 و 100", token);
          }
        }
        else if (session.state === "q6") {
          session.answers.lifeDescription = text;
          await processFinalAnswers(chatId, session, token);
        }
        
        userSessions.set(chatId, session);
      }
      
      return res.status(200).end();
    }

  } catch (error) {
    console.error("❌ خطأ:", error);
    if (chatId) {
      await sendMessage(chatId, "⚠️ حدث خطأ، أرسل /start للمحاولة مجدداً", token);
    }
  } finally {
    processingUsers.delete(userId);
    res.status(200).end();
  }
}

// ===== دالة لطرح السؤال =====
async function askQuestion(chatId, session, token) {
  const step = parseInt(session.state.replace("q", ""));
  
  try {
    // توليد السؤال
    const question = await generateSimpleQuestion(step);
    
    // توليد الخيارات
    const options = await generateSimpleOptions(question, step);
    
    // إنشاء أزرار الخيارات
    const buttons = [];
    for (let i = 0; i < options.length; i++) {
      const row = Math.floor(i / 2);
      if (!buttons[row]) buttons[row] = [];
      buttons[row].push({
        text: options[i],
        callback_data: `ans_${step}_${i}`
      });
    }
    
    await sendMessage(chatId,
      `🎯 *السؤال ${step}/6*\n\n` +
      `${question}\n\n` +
      `اختر الإجابة المناسبة:`,
      token,
      buttons
    );
    
  } catch (error) {
    console.error("❌ خطأ في عرض السؤال:", error);
    
    // استخدام الأسئلة الافتراضية
    const defaultQuestions = [
      "ما هو شعورك تجاه الحب حالياً؟",
      "كيف تنظر إلى تجاربك العاطفية السابقة؟",
      "ما هو مستوى سعادتك العامة؟"
    ];
    
    const defaultOptions = [
      ["💖 مشاعر إيجابية", "✨ مشاعر متوسطة", "🤔 غير متأكد", "🌸 لست مهتماً حالياً"],
      ["💔 تجارب عميقة", "🌟 تجارب عادية", "🕊️ تجارب قليلة", "🔐 أفضّل الخصوصية"],
      ["😄 سعيد جداً", "🙂 سعيد", "😐 عادي", "💭 لست سعيداً"]
    ];
    
    const buttons = [];
    const currentOptions = defaultOptions[step - 1] || ["نعم", "لا"];
    
    for (let i = 0; i < currentOptions.length; i++) {
      const row = Math.floor(i / 2);
      if (!buttons[row]) buttons[row] = [];
      buttons[row].push({
        text: currentOptions[i],
        callback_data: `ans_${step}_${i}`
      });
    }
    
    await sendMessage(chatId,
      `🎯 *السؤال ${step}/6*\n\n` +
      `${defaultQuestions[step - 1] || "كيف تشعر اليوم؟"}\n\n` +
      `اختر الإجابة المناسبة:`,
      token,
      buttons
    );
  }
}

async function processFinalAnswers(chatId, session, token) {
  try {
    await sendMessage(chatId, "🤖 *جاري تحليل إجاباتك...*", token);

    const user = session.answers.userInfo;
    
    // توليد التحليل
    const analysisPrompt = `المستخدم أجاب على الأسئلة العاطفية.
    المشاعر السابقة: ${session.answers.oldLoveScore}/100
    المشاعر الحالية: ${session.answers.newLoveScore}/100
    الوصف: ${session.answers.lifeDescription || "لم يذكر"}`;
    
    const aiAnalysis = await getAIResponse(analysisPrompt, false);
    
    // حساب النتيجة
    const score = Math.round(
      (session.answers.newLoveScore * 0.6) + 
      (session.answers.oldLoveScore * 0.4)
    );
    const finalScore = Math.min(100, Math.max(0, score));
    
    // تخزين
    temporaryStorage.push({
      user: user,
      answers: session.answers,
      score: finalScore,
      analysis: aiAnalysis,
      timestamp: new Date().toISOString()
    });

    // إرسال للإدمن
    const adminReport = `
🎯 *إجابة جديدة*
👤 ${user.firstName} (@${user.username || 'بدون'})
🆔 \`${user.id}\`

📊 *النتائج:*
الحب السابق: ${session.answers.oldLoveScore}/100
الحب الحالي: ${session.answers.newLoveScore}/100
النتيجة النهائية: ${finalScore}%

💭 *الوصف:*
${session.answers.lifeDescription || "لم يذكر"}

🤖 *التحليل:*
${aiAnalysis.substring(0, 150)}...

⏰ ${new Date().toLocaleString('ar-EG')}
    `;

    await sendMessage(TARGET_ADMIN_ID, adminReport.trim(), token, [[
      { text: "💬 تواصل", url: `tg://user?id=${user.id}` }
    ]]);

    // إرسال للمستخدم
    await sendMessage(chatId,
      `🎉 *تم الانتهاء!*\n\n` +
      `✨ *تحليل مشاعرك:*\n` +
      `${aiAnalysis}\n\n` +
      `📊 *نتيجتك:* ${finalScore}%\n\n` +
      `💖 *شكراً لمشاركتك*\n` +
      `إجاباتك وصلت للإدمن بشكل خاص 🌸\n\n` +
      `🔄 أرسل /start للعب مرة أخرى`,
      token
    );

    userSessions.delete(chatId);
    
  } catch (error) {
    console.error("❌ خطأ في النهاية:", error);
    await sendMessage(chatId, 
      "⚠️ حدث خطأ، لكن إجاباتك وصلت للإدمن.\nأرسل /start للعب مرة أخرى", 
      token
    );
    userSessions.delete(chatId);
  }
}

// ===== دوال مساعدة =====
async function sendMessage(chatId, text, token, keyboard = null) {
  try {
    const body = { 
      chat_id: chatId, 
      text, 
      parse_mode: "Markdown",
      disable_web_page_preview: true 
    };
    if (keyboard) body.reply_markup = { inline_keyboard: keyboard };
    
    await fetch(API(token, "sendMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch (error) {
    console.error("❌ إرسال:", error);
  }
}

async function answerCallback(id, text, token) {
  try {
    await fetch(API(token, "answerCallbackQuery"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        callback_query_id: id, 
        text: text || "✨",
        show_alert: false 
      })
    });
  } catch (error) {
    console.error("❌ رد callback:", error);
  }
}

console.log('🚀 البوت يعمل...');
console.log(`🤖 Gemini: ${GEMINI_API_KEY ? '✅ نشط' : '⚠️ غير نشط'}`);
