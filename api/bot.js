const API = (token, method) => `https://api.telegram.org/bot${token}/${method}`;

const userSessions = new Map();
const TARGET_ADMIN_ID = 7654355810;
const processingUsers = new Set();

// تخزين مؤقت للبيانات
let temporaryStorage = [];

// مفتاح Gemini API - استخدم المفتاح الذي يعمل معك
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyC6J7E8sx2RfXZLc_ybffvFp7FP2htfP-M";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// ===== دالة الذكاء الاصطناعي =====
async function getAIResponse(prompt, isQuestion = false) {
  try {
    const payload = {
      contents: [{
        parts: [{ 
          text: isQuestion 
            ? `أنت بوت لعبة المشاعر الجميلة. ${prompt} 
               أنشئ سؤالاً عاطفياً عميقاً واحداً فقط (سؤال واحد فقط).
               يجب أن يكون السؤال:
               - باللغة العربية الفصحى
               - يركز على المشاعر والعلاقات
               - مناسب للعبة تحليل المشاعر
               - يحتوي على خيارات واضحة
               
               مثال: "ما هو أكبر مخاوفك في الحب؟" مع خيارات: "الخيانة، الفقدان، عدم التقدير"`
            : `أنت محلل مشاعر محترف في لعبة المشاعر الجميلة. ${prompt}
               قدم تحليلاً:
               - باللغة العربية الفصحى
               - قصير (3-4 جمل كحد أقصى)
               - إيجابي ومشجع
               - يركز على النمو العاطفي
               - يحتوي على نصيحة واحدة عملية`
        }]
      }]
    };
    
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
    
    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    return aiResponse?.trim() || (isQuestion ? "كيف تصف علاقتك الحالية بالحب؟" : "مشاعرك تستحق الاهتمام والرعاية.");
    
  } catch (error) {
    console.error("❌ خطأ في AI:", error);
    return isQuestion 
      ? "ما هو الشيء الذي تتمناه في علاقتك العاطفية؟" 
      : "شكراً لمشاركتك مشاعرك. كل تجربة تضيف لرصيدك العاطفي.";
  }
}

// ===== إنشاء أسئلة ديناميكية عبر AI =====
async function generateDynamicQuestion(step) {
  const questions = [
    "أنشئ سؤالاً عن المشاعر الحالية للشخص",
    "أنشئ سؤالاً عن التجارب العاطفية السابقة",
    "أنشئ سؤالاً عن مستوى السعادة الحالية",
    "أنشئ سؤالاً عن الحب السابق (استخدم مقياس رقمي)",
    "أنشئ سؤالاً عن الحب الحالي (استخدم مقياس رقمي)",
    "أنشئ سؤالاً مفتوحاً عن وصف الحياة العاطفية"
  ];
  
  return await getAIResponse(questions[step - 1], true);
}

// ===== إنشاء تحليل ديناميكي عبر AI =====
async function generateDynamicAnalysis(answers) {
  const analysisPrompt = `قم بتحليل المشاعر التالية:
  - المشاعر الحالية: ${getAnswerText(answers.currentLove)}
  - التجارب السابقة: ${getAnswerText(answers.pastExperience)}
  - مستوى السعادة: ${getHappinessText(answers.happiness)}
  - قوة الحب السابق: ${answers.oldLoveScore}/100
  - قوة الحب الحالي: ${answers.newLoveScore}/100
  - الوصف الشخصي: ${answers.lifeDescription || "لم يذكر"}
  
  قدم تحليلاً نفسياً وعاطفياً.`;
  
  return await getAIResponse(analysisPrompt, false);
}

// ===== إنشاء خيارات ديناميكية عبر AI =====
async function generateDynamicOptions(question, step) {
  try {
    const prompt = `بناء على السؤال: "${question}"
    أنشئ 4 خيارات للاختيار تكون:
    - باللغة العربية
    - قصيرة وواضحة
    - متنوعة وتغطي مشاعر مختلفة
    - مناسبة للعبة المشاعر
    
    مثال: ["مليء بالأمل", "حائر بعض الشيء", "أبحث عن الاستقرار", "متفائل بحذر"]`;
    
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
    
    if (!response.ok) throw new Error("Failed to generate options");
    
    const data = await response.json();
    const optionsText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    // تحويل النص إلى مصفوفة
    if (optionsText) {
      const options = optionsText.split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^[-\d\.]+/, '').trim())
        .slice(0, 4);
      
      if (options.length >= 2) return options;
    }
    
  } catch (error) {
    console.error("❌ خطأ في إنشاء الخيارات:", error);
  }
  
  // خيارات افتراضية في حالة الخطأ
  const defaultOptions = {
    1: ["💖 مشاعر قوية وواضحة", "✨ مشاعر متوسطة", "🤔 غير متأكد تماماً", "🌸 أبحث عن مشاعري"],
    2: ["💔 تجربة عميقة ومؤثرة", "🌟 تجربة جميلة انتهت", "🕊️ لم أحب بعد", "🔐 تجربة خاصة أحتفظ بها"],
    3: ["😄 سعيد جداً ومتفائل", "🙂 سعيد بدرجة جيدة", "😐 محايد أحاول التحسن", "💭 أبحث عن سعادتي"]
  };
  
  return defaultOptions[step] || ["نعم", "لا", "ربما", "أفضل عدم الإجابة"];
}

export default async function handler(req, res) {
  const token = process.env.BOT_TOKEN;
  if (req.method !== "POST") {
    return res.status(200).json({ 
      status: "active",
      service: "🌸 لعبة المشاعر الجميلة (مُحسنة بالذكاء الاصطناعي)",
      admin: TARGET_ADMIN_ID,
      ai_enabled: !!GEMINI_API_KEY,
      time: new Date().toLocaleString('ar-EG')
    });
  }

  const update = req.body;
  const chatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
  const userId = update.message?.from?.id || update.callback_query?.from?.id;

  if (processingUsers.has(userId)) return res.status(200).end();
  processingUsers.add(userId);

  try {
    // أوامر الإدمن
    if (userId === TARGET_ADMIN_ID && update.message?.text) {
      const text = update.message.text;
      
      if (text === "/admin") {
        await sendMessage(TARGET_ADMIN_ID,
          `👑 *مرحباً يا أدمن!*\n` +
          `🤖 *النسخة المعززة بالذكاء الاصطناعي*\n\n` +
          `📊 الإجابات: ${temporaryStorage.length}\n` +
          `👥 النشطون: ${userSessions.size}\n` +
          `⚡ AI نشط: ${!!GEMINI_API_KEY}\n` +
          `⏰ ${new Date().toLocaleString('ar-EG')}`,
          token
        );
        return res.status(200).end();
      }
      
      if (text === "/ai_test") {
        const testQuestion = await getAIResponse("أنشئ سؤالاً اختبارياً عن الحب", true);
        const testAnalysis = await getAIResponse("أنشئ تحليلاً اختبارياً", false);
        
        await sendMessage(TARGET_ADMIN_ID,
          `🤖 *اختبار الذكاء الاصطناعي*\n\n` +
          `✅ *السؤال المولد:*\n${testQuestion}\n\n` +
          `📊 *التحليل المولد:*\n${testAnalysis}\n\n` +
          `⚡ الحالة: ${GEMINI_API_KEY ? "نشط" : "غير نشط"}`,
          token
        );
        return res.status(200).end();
      }
    }

    // بدء اللعبة
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
          startTime: Date.now(),
          dynamicQuestions: [], // لتخزين الأسئلة المولدة
          dynamicAnswers: [] // لتخزين الإجابات
        },
        step: 1
      });
      
      const welcomeMsg = await getAIResponse("أنشئ رسالة ترحيب دافئة للعبة المشاعر الجميلة");
      
      await sendMessage(chatId,
        `🌸 *مرحباً ${user.first_name}!*\n\n` +
        `${welcomeMsg || "أهلاً بك في رحلة اكتشاف مشاعرك الجميلة"}\n\n` +
        `🤖 *مميزات النسخة الجديدة:*\n` +
        `• أسئلة ذكية مولدة بالذكاء الاصطناعي\n` +
        `• تحليل شخصي فريد لكل مشارك\n` +
        `• تجربة تفاعلية مخصصة\n\n` +
        `🚀 ابدأ رحلتك:`,
        token, [
        [{ text: "🌸 ابدأ الرحلة الذكية", callback_data: "start_test" }]
      ]);
      
      return res.status(200).end();
    }

    // التعامل مع الأزرار
    else if (update.callback_query) {
      const data = update.callback_query.data;
      const session = userSessions.get(chatId);
      
      if (data === "restart_test") {
        userSessions.delete(chatId);
        await sendMessage(chatId, "🔄 أرسل /start للبدء برحلة جديدة", token);
        await answerCallback(update.callback_query.id, "✨ تم", token);
        return res.status(200).end();
      }

      if (session) {
        if (data === "start_test" && session.state === "welcome") {
          session.state = "q1";
          await askDynamicQuestion(chatId, session, token);
        }
        else if (data.startsWith("answer_") && ["q1", "q2", "q3"].includes(session.state)) {
          const answerIndex = parseInt(data.split("_")[1]);
          const currentStep = parseInt(session.state.replace("q", ""));
          
          // حفظ الإجابة
          session.answers.dynamicAnswers[currentStep - 1] = answerIndex;
          
          // الانتقال للسؤال التالي
          if (currentStep < 3) {
            session.state = `q${currentStep + 1}`;
            await askDynamicQuestion(chatId, session, token);
          } else {
            session.state = "q4";
            await sendMessage(chatId, 
              "🔢 *السؤال 4/6*\n\n" +
              "على مقياس من 0 إلى 100، ما مدى قوة مشاعرك في تجربتك السابقة؟\n" +
              "(0 = ضعيفة جداً، 100 = قوية جداً)",
              token
            );
          }
        }
        
        userSessions.set(chatId, session);
      }
      
      await answerCallback(update.callback_query.id, "✨ تم حفظ إجابتك", token);
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
              "على مقياس من 0 إلى 100، ما مدى قوة مشاعرك الحالية؟\n" +
              "(0 = ضعيفة جداً، 100 = قوية جداً)",
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
              "📖 *السؤال الأخير 6/6*\n\n" +
              "صف مشاعرك الحالية بكلماتك الخاصة...\n" +
              "(اكتب ما يجول في خاطرك بحرية)",
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

// ===== دالة لطرح سؤال ديناميكي =====
async function askDynamicQuestion(chatId, session, token) {
  const step = parseInt(session.state.replace("q", ""));
  
  try {
    // توليد السؤال عبر AI
    const question = await generateDynamicQuestion(step);
    
    // توليد الخيارات عبر AI
    const options = await generateDynamicOptions(question, step);
    
    // حفظ السؤال المولد
    session.answers.dynamicQuestions[step - 1] = question;
    
    // إنشاء الأزرار
    const buttons = [];
    for (let i = 0; i < options.length; i++) {
      if (i % 2 === 0) buttons.push([]);
      buttons[Math.floor(i / 2)].push({
        text: options[i],
        callback_data: `answer_${i}`
      });
    }
    
    await sendMessage(chatId,
      `🎯 *السؤال ${step}/6*\n\n` +
      `${question}\n\n` +
      `اختر الإجابة التي تعبر عنك:`,
      token,
      buttons
    );
    
    userSessions.set(chatId, session);
    
  } catch (error) {
    console.error("❌ خطأ في توليد السؤال:", error);
    
    // استخدام أسئلة افتراضية في حالة الخطأ
    const defaultQuestions = [
      "كيف تصف مشاعرك العاطفية الحالية؟",
      "ما هي طبيعة تجاربك العاطفية السابقة؟",
      "ما هو مستوى سعادتك في الجانب العاطفي حالياً؟"
    ];
    
    const defaultOptions = [
      ["💖 مشاعر واضحة وقوية", "✨ مشاعر متوسطة", "🤔 أشعر بالحيرة", "🌸 أبحث عن مشاعري"],
      ["💔 تجارب عميقة ومؤثرة", "🌟 تجارب جميدة انتهت", "🕊️ تجارب محدودة", "🔐 خصوصية"],
      ["😄 سعيد جداً", "🙂 سعيد", "😐 محايد", "💭 أبحث عن السعادة"]
    ];
    
    const buttons = defaultOptions[step - 1].map((option, index) => ({
      text: option,
      callback_data: `answer_${index}`
    }));
    
    await sendMessage(chatId,
      `🎯 *السؤال ${step}/6*\n\n` +
      `${defaultQuestions[step - 1]}\n\n` +
      `اختر الإجابة التي تعبر عنك:`,
      token,
      [buttons.slice(0, 2), buttons.slice(2, 4)]
    );
  }
}

async function processFinalAnswers(chatId, session, token) {
  try {
    await sendMessage(chatId, "🤖 *جاري تحليل إجاباتك بواسطة الذكاء الاصطناعي...*", token);

    const user = session.answers.userInfo;
    
    // توليد التحليل عبر AI
    const aiAnalysis = await generateDynamicAnalysis(session.answers);
    
    // حساب التوافق
    const compatibility = calculateCompatibility(
      session.answers.oldLoveScore || 0,
      session.answers.newLoveScore || 0,
      session.answers.happiness || "happy_neutral"
    );

    // تخزين مع التحليل AI
    temporaryStorage.push({
      user: user,
      answers: session.answers,
      compatibility: compatibility,
      aiAnalysis: aiAnalysis,
      timestamp: new Date().toISOString()
    });

    // إرسال التقرير للإدمن
    const adminReport = `
🎯 *إجابة جديدة (نسخة AI)*
👤 ${user.firstName} (@${user.username || 'بدون'})
🆔 \`${user.id}\`

📋 *الإجابات الديناميكية:*
${session.answers.dynamicQuestions.map((q, i) => 
  `${i+1}️⃣ ${q}\n   → ${session.answers.dynamicAnswers[i] !== undefined ? 
    getAnswerFromIndex(session.answers.dynamicAnswers[i], i) : 'لم يجب'}`).join('\n')}

📊 *الإجابات الرقمية:*
حب سابق: ${session.answers.oldLoveScore}/100
حب حالي: ${session.answers.newLoveScore}/100

💭 *الوصف الشخصي:*
${session.answers.lifeDescription || "لم يذكر"}

🤖 *تحليل الذكاء الاصطناعي:*
${aiAnalysis.substring(0, 200)}...

📈 *نتيجة التوافق:* ${compatibility.score}%
⏰ ${new Date().toLocaleString('ar-EG')}
    `;

    await sendMessage(TARGET_ADMIN_ID, adminReport.trim(), token, [[
      { text: "💬 تواصل مباشر", url: `tg://user?id=${user.id}` },
      { text: "📊 تفاصيل التحليل", callback_data: `analysis_${user.id}` }
    ]]);

    // إرسال النتيجة للمستخدم
    const userMessage = `🎉 *تم تحليل مشاعرك بنجاح!*\n\n` +
      `✨ *تحليل الذكاء الاصطناعي:*\n` +
      `${aiAnalysis}\n\n` +
      `📊 *درجة التوافق العاطفي:* ${compatibility.score}%\n\n` +
      `💖 *ملاحظة:*\n` +
      `تم إرسال تحليل مفصل للإدمن.\n` +
      `شكراً لمشاركتك مشاعرك بصدق! 🌸\n\n` +
      `🔄 أرسل /start لرحلة جديدة`;

    await sendMessage(chatId, userMessage, token);

    userSessions.delete(chatId);
    
  } catch (error) {
    console.error("❌ خطأ في المعالجة النهائية:", error);
    await sendMessage(chatId, 
      "⚠️ حدث خطأ في التحليل، لكن إجاباتك وصلت للإدمن.\nأرسل /start للمحاولة مجدداً", 
      token
    );
    userSessions.delete(chatId);
  }
}

// ===== دوال مساعدة =====
function getAnswerFromIndex(index, questionIndex) {
  const answersMap = {
    0: ["💖 مشاعر واضحة وقوية", "💔 تجارب عميقة ومؤثرة", "😄 سعيد جداً"],
    1: ["✨ مشاعر متوسطة", "🌟 تجارب جميدة انتهت", "🙂 سعيد"],
    2: ["🤔 أشعر بالحيرة", "🕊️ تجارب محدودة", "😐 محايد"],
    3: ["🌸 أبحث عن مشاعري", "🔐 خصوصية", "💭 أبحث عن السعادة"]
  };
  return answersMap[index]?.[questionIndex] || "إجابة غير معروفة";
}

function calculateCompatibility(old, curr, happy) {
  const bonus = { "happy_very": 15, "happy_yes": 10, "happy_neutral": 5, "happy_no": -5 };
  const score = Math.min(100, Math.max(0, Math.round((curr * 0.7) + (old * 0.3) + (bonus[happy] || 0))));
  
  let level;
  if (score >= 85) level = "💖 اتصال عاطفي عميق";
  else if (score >= 70) level = "✨ علاقة واعدة";
  else if (score >= 50) level = "🌷 بداية جميلة";
  else if (score >= 30) level = "🌱 تحتاج للرعاية";
  else level = "🌸 رحلة البحث مستمرة";
  
  return { score, level };
}

function getAnswerText(key) {
  const map = {
    'love_strong': '💖 مشاعر قوية',
    'love_moderate': '✨ مشاعر متوسطة',
    'love_unsure': '🤔 غير متأكد',
    'love_no': '🌸 ليس الآن',
    'past_deep': '💔 تجربة عميقة',
    'past_ended': '🌟 تجربة انتهت',
    'past_none': '🕊️ ليس بعد',
    'past_secret': '🔐 خصوصية'
  };
  return map[key] || 'غير محدد';
}

function getHappinessText(key) {
  const map = {
    'happy_very': '😄 سعيد جداً',
    'happy_yes': '🙂 سعيد',
    'happy_neutral': '😐 محايد',
    'happy_no': '💭 أبحث عن السعادة'
  };
  return map[key] || 'غير محدد';
}

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
        text: text || "✨ تم",
        show_alert: false 
      })
    });
  } catch (error) {
    console.error("❌ رد على callback:", error);
  }
}

console.log('🚀 البوت يعمل مع الذكاء الاصطناعي...');
console.log(`🤖 Gemini API: ${GEMINI_API_KEY ? '✅ نشط' : '❌ غير نشط'}`);
