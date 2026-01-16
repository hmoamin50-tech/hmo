// api/bot.js
import fetch from "node-fetch";

/* ========== الإعدادات ========== */
const BOT_TOKEN = process.env.BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

/* ========== ذاكرة الأسئلة ========== */
const questionCache = new Map();

/* ========== نظام التفكير والعمق ========== */
const THINKING_LEVELS = {
  light: {
    name: "💡 تفكير خفيف",
    prompt: "أسئلة بسيطة ومرحة للمحادثات اليومية"
  },
  medium: {
    name: "🤔 تفكير متوسط",
    prompt: "أسئلة تتطلب بعض التفكير والتأمل الذاتي"
  },
  deep: {
    name: "🧠 تفكير عميق",
    prompt: "أسئلة فلسفية وعميقة تتطلب تأملاً طويلاً"
  },
  creative: {
    name: "🎨 تفكير إبداعي",
    prompt: "أسئلة إبداعية تحفز الخيال والابتكار"
  },
  emotional: {
    name: "💖 تفكير عاطفي",
    prompt: "أسئلة عاطفية تلامس المشاعر والذكريات"
  }
};

/* ========== أنواع الأسئلة ========== */
const QUESTION_CATEGORIES = {
  comedy: "😂 كوميديا ومرح",
  truth: "🔥 صراحة وجرأة",
  free: "🗣️ حديث حر",
  love: "❤️ غرام وعواطف",
  couples: "💞 علاقات وعشاق",
  funny: "🤣 مواقف مضحكة",
  daily: "📔 يوميات وحياة",
  personality: "🧠 شخصية وتفكير",
  philosophy: "🌌 فلسفة وحياة",
  future: "🚀 مستقبل وتطلعات",
  memories: "📸 ذكريات وماضي"
};

/* ========== حالة المستخدم ========== */
const userStates = new Map();

/* ========== توليد الأسئلة باستخدام Gemini ========== */
async function generateQuestion(category, thinkingLevel = "medium", previousQuestions = []) {
  const cacheKey = `${category}_${thinkingLevel}`;
  
  // محاولة الاسترجاع من الذاكرة المؤقتة
  if (questionCache.has(cacheKey)) {
    const cached = questionCache.get(cacheKey);
    if (cached.questions.length > 0) {
      const question = cached.questions.pop();
      return question;
    }
  }

  try {
    const thinkingPrompt = THINKING_LEVELS[thinkingLevel].prompt;
    const categoryName = QUESTION_CATEGORIES[category];
    
    const prompt = `
أنت مساعد ذكي في لعبة أسئلة تفاعلية.
مهمتك: إنشاء سؤال واحد ${thinkingPrompt} في فئة "${categoryName}".

**المتطلبات:**
1. السؤال يجب أن يكون باللغة العربية
2. يجب أن يكون فريداً ومبتكراً
3. مناسب للعبة تفاعلية مع الأصدقاء
4. يحفز التفكير والنقاش
5. لا يتجاوز 20 كلمة
6. لا يستخدم علامات الترقيم الزائدة
7. ليس من القائمة التالية: ${previousQuestions.slice(0, 3).join(', ') || 'لا توجد'}

**أمثلة على الأسئلة الجيدة:**
- ما هو الشيء الذي تعلمته من أكبر خطأ ارتكبته؟
- كيف تتخيل نفسك بعد عشر سنوات من الآن؟
- ما هي القيمة التي لن تتخلى عنها أبداً؟
- إذا كان لديك فرصة لتعلم مهارة جديدة فماذا ستختار؟

**أنشئ سؤالاً واحداً فقط:**
    `;

    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ 
            text: prompt.trim()
          }] 
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    let question = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!question) {
      throw new Error("No question generated");
    }
    
    // تنظيف النص
    question = question
      .replace(/["']/g, '')
      .replace(/\*\*/g, '')
      .replace(/^[\d.\-•*]\s*/gm, '')
      .trim();
    
    // إذا كان النص طويلاً جداً، نأخذ الجملة الأولى
    if (question.split(' ').length > 25) {
      question = question.split(/[.!?]/)[0] + '؟';
    }
    
    // التأكد من وجود علامة استفهام
    if (!question.endsWith('؟')) {
      question += '؟';
    }
    
    // تخزين في الذاكرة المؤقتة
    if (!questionCache.has(cacheKey)) {
      questionCache.set(cacheKey, { questions: [], timestamp: Date.now() });
    }
    
    const cache = questionCache.get(cacheKey);
    cache.questions.push(question);
    
    // تنظيف الذاكرة القديمة
    setTimeout(() => {
      if (Date.now() - cache.timestamp > 300000) { // 5 دقائق
        questionCache.delete(cacheKey);
      }
    }, 300000);
    
    return question;
    
  } catch (error) {
    console.error("Error generating question:", error);
    
    // الأسئلة الاحتياطية الذكية
    const fallbackQuestions = {
      comedy: [
        "إذا استطعت إضافة قانون جديد للمجتمع، فماذا سيكون ولماذا؟",
        "ما هو الموقف الذي يضحكك كلما تذكرته؟",
        "إذا تحولت وجبة العشاء إلى مسابقة، فماذا ستقدم للفوز؟"
      ],
      philosophy: [
        "ما هو تعريفك للسعادة الحقيقية؟",
        "هل تعتقد أن الأخطاء ضرورية للتطور؟ ولماذا؟",
        "ما هي القيمة التي تعتقد أنها أهم في الحياة؟"
      ],
      future: [
        "ما هو الإنجاز الذي تأمل تحقيقه في السنوات الخمس المقبلة؟",
        "كيف تتخيل العالم بعد 50 سنة من الآن؟",
        "ما هي المهارة التي ترغب في تطويرها لتواكب المستقبل؟"
      ],
      emotional: [
        "ما هو الشعور الذي تتمنى أن يعرفه الآخرون عنك؟",
        "ما هي الذكرى التي تمنيت لو استطعت العيش فيها مرة أخرى؟",
        "ما هو الشيء الذي يجعلك تشعر بالامتنان اليوم؟"
      ]
    };
    
    const questions = fallbackQuestions[category] || fallbackQuestions.philosophy;
    return questions[Math.floor(Math.random() * questions.length)];
  }
}

/* ========== توليد ردود ذكية ========== */
async function generateSmartResponse(question, userAnswer) {
  try {
    const prompt = `
سؤال: "${question}"
إجابة المستخدم: "${userAnswer}"

أنت مساعد في لعبة أسئلة. مهمتك تقديم رد ذكي على إجابة المستخدم.

**المتطلبات:**
1. ابدأ بثناء لطيف على المشاركة
2. قدم ملاحظة ذكية أو سؤال متابعة
3. شجع على التفكير أكثر
4. اجعل الرد باللغة العربية
5. لا تقدم نصيحة مباشرة
6. لا تنتقد الإجابة
7. اجعل الرد قصيراً (2-3 جمل)

**مثال:**
"رائع! هذه نظرة مثيرة للاهتمام. هل فكرت في كيفية تطبيق هذا المبدأ في مواقف أخرى؟"

**الرد الذكي:**
    `;

    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ 
            text: prompt.trim()
          }] 
        }]
      })
    });

    if (!response.ok) {
      return "🌟 شكراً لمشاركتك! إجابتك تضيف منظوراً قيماً.";
    }

    const data = await response.json();
    let reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!reply) {
      return "💭 إجابة عميقة! هل تريد التفكير في سؤال آخر؟";
    }
    
    return reply.trim();
    
  } catch (error) {
    return "✨ إجابة تستحق التأمل!";
  }
}

/* ========== أدوات تيليجرام ========== */
async function sendTelegramMessage(chatId, text, options = {}) {
  try {
    const body = {
      chat_id: chatId,
      text: text,
      parse_mode: "Markdown",
      ...options
    };

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    return response.ok;
  } catch (error) {
    console.error("Error sending message:", error);
    return false;
  }
}

async function answerCallbackQuery(callbackId, text = "") {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackId,
        text: text,
        show_alert: false
      })
    });
  } catch (error) {
    console.error("Error answering callback:", error);
  }
}

/* ========== واجهات المستخدم ========== */
function getMainMenu() {
  return {
    inline_keyboard: [
      [
        { text: "🎯 اختر مستوى التفكير", callback_data: "select_thinking" },
        { text: "📚 اختر الفئة", callback_data: "select_category" }
      ],
      [
        { text: "🎲 سؤال عشوائي ذكي", callback_data: "smart_random" },
        { text: "💭 اقترح سؤالاً عميقاً", callback_data: "suggest_deep" }
      ],
      [
        { text: "📊 إحصائياتي", callback_data: "my_stats" },
        { text: "❓ المساعدة", callback_data: "help" }
      ]
    ]
  };
}

function getThinkingLevelsMenu() {
  const levels = Object.entries(THINKING_LEVELS);
  const keyboard = [];
  
  for (let i = 0; i < levels.length; i += 2) {
    const row = [];
    row.push({ text: levels[i][1].name, callback_data: `thinking_${levels[i][0]}` });
    
    if (i + 1 < levels.length) {
      row.push({ text: levels[i + 1][1].name, callback_data: `thinking_${levels[i + 1][0]}` });
    }
    
    keyboard.push(row);
  }
  
  keyboard.push([{ text: "🔙 رجوع", callback_data: "back_to_main" }]);
  
  return { inline_keyboard: keyboard };
}

function getCategoriesMenu() {
  const categories = Object.entries(QUESTION_CATEGORIES);
  const keyboard = [];
  
  for (let i = 0; i < categories.length; i += 3) {
    const row = [];
    for (let j = 0; j < 3; j++) {
      if (i + j < categories.length) {
        row.push({ 
          text: categories[i + j][1].split(' ')[0], // أول كلمة فقط
          callback_data: `category_${categories[i + j][0]}`
        });
      }
    }
    keyboard.push(row);
  }
  
  keyboard.push([{ text: "🔙 رجوع", callback_data: "back_to_main" }]);
  
  return { inline_keyboard: keyboard };
}

function getAfterAnswerMenu() {
  return {
    inline_keyboard: [
      [
        { text: "🔄 سؤال آخر", callback_data: "another_question" },
        { text: "💡 غير مستوى التفكير", callback_data: "change_thinking" }
      ],
      [
        { text: "📝 غير الفئة", callback_data: "change_category" },
        { text: "🧠 عمق أكثر", callback_data: "deeper_question" }
      ],
      [
        { text: "🏠 القائمة الرئيسية", callback_data: "back_to_main" }
      ]
    ]
  };
}

/* ========== إدارة حالة المستخدم ========== */
function getUserState(chatId) {
  if (!userStates.has(chatId)) {
    userStates.set(chatId, {
      thinkingLevel: "medium",
      currentCategory: "philosophy",
      questionsHistory: [],
      answersHistory: [],
      stats: {
        questionsAnswered: 0,
        deepQuestions: 0,
        creativeQuestions: 0,
        lastActive: Date.now()
      }
    });
  }
  return userStates.get(chatId);
}

async function sendQuestion(chatId, state, isDeeper = false) {
  let thinkingLevel = state.thinkingLevel;
  let category = state.currentCategory;
  
  if (isDeeper) {
    // زيادة مستوى العمق
    const levels = Object.keys(THINKING_LEVELS);
    const currentIndex = levels.indexOf(thinkingLevel);
    if (currentIndex < levels.length - 1) {
      thinkingLevel = levels[currentIndex + 1];
    }
  }
  
  try {
    // إظهار حالة التفكير
    await sendTelegramMessage(chatId, "🤔 *جارٍ توليد سؤال عميق...*");
    
    const question = await generateQuestion(
      category, 
      thinkingLevel,
      state.questionsHistory
    );
    
    // تحديث الحالة
    state.questionsHistory.push(question);
    if (state.questionsHistory.length > 10) {
      state.questionsHistory.shift();
    }
    
    if (thinkingLevel === "deep" || thinkingLevel === "creative") {
      state.stats.deepQuestions++;
    }
    
    userStates.set(chatId, state);
    
    // إرسال السؤال
    await sendTelegramMessage(
      chatId,
      `*${THINKING_LEVELS[thinkingLevel].name}*\n\n` +
      `📚 الفئة: ${QUESTION_CATEGORIES[category]}\n\n` +
      `❓ *السؤال:*\n${question}\n\n` +
      "💭 *خُذ وقتك في التفكير، ثم اكتب إجابتك:*",
      { reply_markup: getAfterAnswerMenu() }
    );
    
  } catch (error) {
    await sendTelegramMessage(
      chatId,
      "⚠️ حدث خطأ في توليد السؤال. حاول مرة أخرى.",
      { reply_markup: getMainMenu() }
    );
  }
}

/* ========== المعالج الرئيسي ========== */
export default async function handler(req, res) {
  // تمكين CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({
      status: "✅ البوت يعمل",
      users: userStates.size,
      cache: questionCache.size,
      description: "لعبة أسئلة ذكية تعتمد على الذكاء الاصطناعي"
    });
  }

  try {
    const update = req.body;
    
    // معالجة الأزرار
    if (update.callback_query) {
      const callback = update.callback_query;
      const chatId = callback.message.chat.id;
      const user = callback.from;
      const data = callback.data;
      
      await answerCallbackQuery(callback.id);
      
      const state = getUserState(chatId);
      
      switch (data) {
        case "back_to_main":
          await sendTelegramMessage(
            chatId,
            "🏠 *القائمة الرئيسية*\n\n" +
            "اختر أحد الخيارات للبدء:",
            { reply_markup: getMainMenu() }
          );
          break;
          
        case "select_thinking":
          await sendTelegramMessage(
            chatId,
            "🧠 *اختر مستوى التفكير*\n\n" +
            "كل مستوى يقدم أسئلة مختلفة في العمق والتعقيد:",
            { reply_markup: getThinkingLevelsMenu() }
          );
          break;
          
        case "select_category":
          await sendTelegramMessage(
            chatId,
            "📚 *اختر فئة الأسئلة*\n\n" +
            "اختر الموضوع الذي تريد التحدث عنه:",
            { reply_markup: getCategoriesMenu() }
          );
          break;
          
        case "smart_random":
          // فئة عشوائية
          const categories = Object.keys(QUESTION_CATEGORIES);
          state.currentCategory = categories[Math.floor(Math.random() * categories.length)];
          await sendQuestion(chatId, state);
          break;
          
        case "suggest_deep":
          state.thinkingLevel = "deep";
          state.currentCategory = "philosophy";
          await sendQuestion(chatId, state);
          break;
          
        case "another_question":
          await sendQuestion(chatId, state);
          break;
          
        case "deeper_question":
          await sendQuestion(chatId, state, true);
          break;
          
        case "change_thinking":
          await sendTelegramMessage(
            chatId,
            "🔄 *تغيير مستوى التفكير*\n\n" +
            "اختر المستوى الجديد:",
            { reply_markup: getThinkingLevelsMenu() }
          );
          break;
          
        case "change_category":
          await sendTelegramMessage(
            chatId,
            "🔄 *تغيير الفئة*\n\n" +
            "اختر الفئة الجديدة:",
            { reply_markup: getCategoriesMenu() }
          );
          break;
          
        case "my_stats":
          const statsText = `📊 *إحصائياتك*\n\n` +
            `• الأسئلة المجاب عنها: ${state.stats.questionsAnswered}\n` +
            `• الأسئلة العميقة: ${state.stats.deepQuestions}\n` +
            `• الأسئلة الإبداعية: ${state.stats.creativeQuestions}\n` +
            `\n💭 *حالتك الحالية:*\n` +
            `• مستوى التفكير: ${THINKING_LEVELS[state.thinkingLevel].name}\n` +
            `• الفئة: ${QUESTION_CATEGORIES[state.currentCategory]}\n\n` +
            `استمر في التفكير والنمو!`;
          
          await sendTelegramMessage(chatId, statsText);
          break;
          
        case "help":
          await sendTelegramMessage(
            chatId,
            "❓ *كيفية اللعب*\n\n" +
            "1. اختر مستوى التفكير (خفيف/متوسط/عميق)\n" +
            "2. اختر فئة الأسئلة\n" +
            "3. اقرأ السؤال بعناية\n" +
            "4. خذ وقتك في التفكير\n" +
            "5. اكتب إجابتك\n" +
            "6. احصل على رد ذكي\n\n" +
            "✨ *نصائح:*\n" +
            "• خذ وقتك، التفكير العميق يحتاج صبراً\n" +
            "• جرب مستويات تفكير مختلفة\n" +
            "• لا توجد إجابات صحيحة أو خاطئة\n" +
            "• استمتع بعملية التفكير نفسها\n\n" +
            "🧠 *مستويات التفكير:*\n" +
            Object.entries(THINKING_LEVELS).map(([key, value]) => 
              `• ${value.name}: ${value.prompt}`
            ).join('\n')
          );
          break;
          
        default:
          if (data.startsWith("thinking_")) {
            const level = data.replace("thinking_", "");
            state.thinkingLevel = level;
            await sendTelegramMessage(
              chatId,
              `✅ تم اختيار: ${THINKING_LEVELS[level].name}\n\n` +
              "الآن اختر فئة الأسئلة:",
              { reply_markup: getCategoriesMenu() }
            );
          }
          else if (data.startsWith("category_")) {
            const category = data.replace("category_", "");
            state.currentCategory = category;
            await sendQuestion(chatId, state);
          }
          break;
      }
      
      return res.status(200).end();
    }
    
    // معالجة الرسائل النصية
    if (update.message) {
      const message = update.message;
      const chatId = message.chat.id;
      const text = message.text || "";
      const user = message.from;
      
      // بدء البوت
      if (text.startsWith("/start")) {
        const welcomeText = `🧠 *مرحباً ${user.first_name || "صديقي"}!*\n\n` +
          "أهلاً بك في *لعبة التفكير العميق*\n\n" +
          "🎯 *مميزات اللعبة:*\n" +
          "• أسئلة ذكية بتدرج في العمق\n" +
          "• ردود ذكية مخصصة\n" +
          "• مستويات تفكير مختلفة\n" +
          "• فئات متنوعة من الأسئلة\n" +
          "• نظام إحصائيات متقدم\n\n" +
          "💭 *خذ وقتك في التفكير* - لا تستعجل في الإجابات\n\n" +
          "اختر نقطة البداية:";
        
        await sendTelegramMessage(chatId, welcomeText, { reply_markup: getMainMenu() });
        return res.status(200).end();
      }
      
      // إجابة المستخدم على سؤال
      const state = getUserState(chatId);
      if (state.questionsHistory.length > 0 && text && !text.startsWith("/")) {
        const lastQuestion = state.questionsHistory[state.questionsHistory.length - 1];
        
        // تحديث الإحصائيات
        state.stats.questionsAnswered++;
        state.answersHistory.push({
          question: lastQuestion,
          answer: text,
          timestamp: Date.now()
        });
        
        if (state.answersHistory.length > 20) {
          state.answersHistory.shift();
        }
        
        // إرسال رد ذكي
        await sendTelegramMessage(
          chatId,
          "🤔 *جارٍ تحليل إجابتك...*"
        );
        
        const smartReply = await generateSmartResponse(lastQuestion, text);
        
        await sendTelegramMessage(
          chatId,
          `✨ *تحليلك الشخصي:*\n\n${smartReply}\n\n` +
          "💭 *ماذا تريد الآن؟*",
          { reply_markup: getAfterAnswerMenu() }
        );
        
        userStates.set(chatId, state);
        return res.status(200).end();
      }
      
      // رسالة عادية بدون سياق
      if (text && !text.startsWith("/")) {
        await sendTelegramMessage(
          chatId,
          "🧠 *لعبة التفكير العميق*\n\n" +
          "اكتب /start للبدء، أو اختر من القائمة أدناه:",
          { reply_markup: getMainMenu() }
        );
      }
    }
    
    return res.status(200).end();
    
  } catch (error) {
    console.error("Handler error:", error);
    return res.status(200).json({ 
      ok: false,
      error: "حدث خطأ داخلي"
    });
  }
}
