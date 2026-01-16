// api/bot.js
import fetch from "node-fetch";

/* ========== الإعدادات ========== */
const BOT_TOKEN = process.env.BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

/* ========== ذاكرة الأسئلة ========== */
const questionCache = new Map();
const userSessions = new Map();

/* ========== مستويات التفكير العميقة ========== */
const THINKING_LEVELS = {
  light: {
    name: "💡 بداية خفيفة",
    prompt: "أسئلة سهلة للبدء والتعارف",
    depth: 1
  },
  medium: {
    name: "🤔 تفكير متوسط",
    prompt: "أسئلة تتطلب تأملاً وصراحة",
    depth: 2
  },
  deep: {
    name: "🧠 تفكير عميق",
    prompt: "أسئلة فلسفية وجوهرية عن الحياة",
    depth: 3
  },
  creative: {
    name: "🎨 إبداع وخيال",
    prompt: "أسئلة إبداعية تحفز التفكير خارج الصندوق",
    depth: 4
  },
  soul: {
    name: "💖 أسئلة الروح",
    prompt: "أسئلة تلامس الأعماق والمشاعر والأحلام",
    depth: 5
  }
};

/* ========== فئات الأسئلة ========== */
const QUESTION_CATEGORIES = {
  life: "🌍 الحياة والتجارب",
  relationships: "💞 العلاقات والعواطف",
  personality: "🧠 الشخصية والتفكير",
  memories: "📸 الذكريات والماضي",
  future: "🚀 المستقبل والتطلعات",
  dreams: "✨ الأحلام والطموحات",
  fears: "😨 المخاوف والتحديات",
  values: "💎 القيم والمبادئ",
  humor: "😂 الكوميديا والمرح",
  philosophy: "🤔 الفلسفة والحكمة"
};

/* ========== توليد الأسئلة باستخدام Gemini فقط ========== */
async function generateGeminiQuestion(category, thinkingLevel, previousQuestions = []) {
  const cacheKey = `${category}_${thinkingLevel}_${previousQuestions.length}`;
  
  // تنظيف الكاش القديم (أكثر من 10 دقائق)
  const now = Date.now();
  for (const [key, value] of questionCache.entries()) {
    if (now - value.timestamp > 10 * 60 * 1000) {
      questionCache.delete(key);
    }
  }
  
  if (questionCache.has(cacheKey)) {
    return questionCache.get(cacheKey).question;
  }

  try {
    const levelInfo = THINKING_LEVELS[thinkingLevel];
    const categoryName = QUESTION_CATEGORIES[category];
    
    const prompt = `أنت مساعد خبير في إنشاء أسئلة عميقة ومحفزة للتفكير.
    
**المهمة:** إنشاء سؤال واحد فقط.

**التفاصيل:**
- مستوى التفكير: ${levelInfo.name} (${levelInfo.prompt})
- الفئة: ${categoryName}
- العمق المطلوب: ${levelInfo.depth}/5
- اللغة: العربية الفصحى أو العامية المفهومة

**مواصفات السؤال المطلوب:**
1. سؤال واحد فقط، واضح ومباشر
2. لا يزيد عن 15 كلمة
3. يحفز التفكير والتأمل
4. مناسب للمحادثات العميقة
5. غير تقليدي ويحمل عمقاً
6. لا يستخدم كلمات مبتذلة أو نمطية
7. يلامس الجوانب الإنسانية
8. ليس من هذه الأسئلة السابقة: ${previousQuestions.slice(-3).join(' | ') || 'لا يوجد'}

**أمثلة للأسئلة الممتازة (للإلهام فقط لا تكررها):**
- "ما هو الشيء الذي تعلمته من أكثر لحظة صعوبة في حياتك؟"
- "إذا استطعت تغيير قرار واحد من ماضيك، فماذا سيكون ولماذا؟"
- "ما هو تعريفك للنجاح وهل تشعر أنك نجحت؟"
- "ما هي القصة التي لم تخبرها لأحد وتود مشاركتها؟"

**أنشئ سؤالاً واحداً فريداً حسب المواصفات أعلاه:**`;

    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ 
            text: prompt 
          }] 
        }],
        generationConfig: {
          temperature: 0.9,
          topK: 1,
          topP: 0.9,
          maxOutputTokens: 100
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API Error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    let question = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!question) {
      throw new Error("لم يتم توليد سؤال من Gemini");
    }
    
    // تنظيف النص
    question = question
      .trim()
      .replace(/^["']|["']$/g, '')
      .replace(/^(سؤال|السؤال|أسألك|اسألك):?\s*/i, '')
      .replace(/\*\*/g, '')
      .split('\n')[0]
      .trim();
    
    // التأكد من أن السؤال ليس فارغاً
    if (!question || question.length < 10) {
      throw new Error("السؤال الناتج قصير جداً أو فارغ");
    }
    
    // التأكد من وجود علامة استفهام
    if (!question.endsWith('؟') && !question.endsWith('?')) {
      question += '؟';
    }
    
    // تخزين في الكاش
    questionCache.set(cacheKey, {
      question,
      timestamp: Date.now(),
      category,
      thinkingLevel
    });
    
    return question;
    
  } catch (error) {
    console.error("❌ فشل توليد سؤال من Gemini:", error.message);
    throw new Error("🤖 عذراً، لم أستطع توليد سؤال الآن. جرب مرة أخرى أو اختر فئة مختلفة.");
  }
}

/* ========== توليد رد ذكي باستخدام Gemini ========== */
async function generateGeminiResponse(userAnswer, originalQuestion, thinkingLevel) {
  try {
    const prompt = `أنت مساعد حكيم في محادثات عميقة.
    
**السؤال الأصلي:** ${originalQuestion}
**إجابة المستخدم:** ${userAnswer}
**مستوى العمق:** ${THINKING_LEVELS[thinkingLevel].name}

**مهمتك:** كتابة رد واحد فقط يعكس تفاعلاً ذكياً مع الإجابة.

**مواصفات الرد:**
1. ابدأ بملاحظة إيجابية عن الإجابة
2. قدم نظرة عميقة أو سؤالاً متابعة محفزاً
3. لا تقدم نقداً سلبياً
4. لا تكرر كلام المستخدم
5. اجعل الرد بين 2-3 جمل
6. استخدم لغة عربية جميلة ومؤثرة
7. حافظ على جو الحوار العميق
8. لا تقدم نصيحة مباشرة إلا إذا طلب

**الرد الذكي المناسب:**`;

    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ 
            text: prompt 
          }] 
        }],
        generationConfig: {
          temperature: 0.8,
          topK: 1,
          topP: 0.8,
          maxOutputTokens: 150
        }
      })
    });

    if (!response.ok) {
      return "💭 شكراً لمشاركتك. إجابتك تضيف عمقاً للحوار.";
    }

    const data = await response.json();
    let reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!reply) {
      return "✨ إجابة تستحق التأمل. هل تود مشاركة المزيد؟";
    }
    
    return reply.trim();
    
  } catch (error) {
    console.error("❌ فشل توليد رد من Gemini:", error);
    return "🌟 شكراً لمشاركتك أفكارك. كل إجابة تثري الحوار.";
  }
}

/* ========== أدوات تيليجرام ========== */
async function sendMessage(chatId, text, options = {}) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "Markdown",
        ...options
      })
    });
    
    return response.ok;
  } catch (error) {
    console.error("❌ Error sending message:", error);
    return false;
  }
}

async function answerCallback(callbackId) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackId
      })
    });
  } catch (error) {
    console.error("❌ Error answering callback:", error);
  }
}

/* ========== إدارة جلسات المستخدم ========== */
function getSession(chatId) {
  if (!userSessions.has(chatId)) {
    userSessions.set(chatId, {
      thinkingLevel: "medium",
      category: "life",
      questions: [],
      answers: [],
      createdAt: Date.now(),
      stats: {
        totalQuestions: 0,
        totalAnswers: 0,
        deepestLevel: "medium"
      }
    });
  }
  return userSessions.get(chatId);
}

/* ========== واجهات المستخدم ========== */
function getMainMenu() {
  return {
    inline_keyboard: [
      [
        { text: "🧠 اختيار مستوى التفكير", callback_data: "choose_level" },
        { text: "📚 اختيار الفئة", callback_data: "choose_category" }
      ],
      [
        { text: "🎲 سؤال عشوائي عميق", callback_data: "random_deep" },
        { text: "💭 سؤال من مستوى أعمق", callback_data: "deeper_level" }
      ],
      [
        { text: "📊 إحصائياتي", callback_data: "my_stats" },
        { text: "🔄 إعادة الضبط", callback_data: "reset" }
      ]
    ]
  };
}

function getLevelsMenu() {
  const keyboard = [];
  const levels = Object.entries(THINKING_LEVELS);
  
  for (let i = 0; i < levels.length; i += 2) {
    const row = [];
    row.push({ 
      text: levels[i][1].name, 
      callback_data: `level_${levels[i][0]}` 
    });
    
    if (i + 1 < levels.length) {
      row.push({ 
        text: levels[i + 1][1].name, 
        callback_data: `level_${levels[i + 1][0]}` 
      });
    }
    
    keyboard.push(row);
  }
  
  keyboard.push([{ text: "🔙 رجوع", callback_data: "back" }]);
  
  return { inline_keyboard: keyboard };
}

function getCategoriesMenu() {
  const keyboard = [];
  const categories = Object.entries(QUESTION_CATEGORIES);
  
  for (let i = 0; i < categories.length; i += 2) {
    const row = [];
    row.push({ 
      text: categories[i][1], 
      callback_data: `cat_${categories[i][0]}` 
    });
    
    if (i + 1 < categories.length) {
      row.push({ 
        text: categories[i + 1][1], 
        callback_data: `cat_${categories[i + 1][0]}` 
      });
    }
    
    keyboard.push(row);
  }
  
  keyboard.push([{ text: "🔙 رجوع", callback_data: "back" }]);
  
  return { inline_keyboard: keyboard };
}

function getPostAnswerMenu() {
  return {
    inline_keyboard: [
      [
        { text: "🔄 سؤال آخر", callback_data: "another" },
        { text: "🧠 مستوى أعمق", callback_data: "go_deeper" }
      ],
      [
        { text: "📚 فئة جديدة", callback_data: "new_category" },
        { text: "🏠 القائمة", callback_data: "menu" }
      ]
    ]
  };
}

/* ========== المعالج الرئيسي ========== */
export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({
      status: "✅ البوت يعمل",
      sessions: userSessions.size,
      cache: questionCache.size,
      description: "لعبة أسئلة عميقة تعتمد 100% على الذكاء الاصطناعي"
    });
  }

  try {
    const update = req.body;
    
    // معالجة Callback Queries
    if (update.callback_query) {
      const callback = update.callback_query;
      const chatId = callback.message.chat.id;
      const data = callback.data;
      
      await answerCallback(callback.id);
      
      const session = getSession(chatId);
      
      switch (data) {
        case "back":
        case "menu":
          await sendMessage(
            chatId,
            "🏠 *القائمة الرئيسية*\n\nاختر الخيار المناسب:",
            { reply_markup: getMainMenu() }
          );
          break;
          
        case "choose_level":
          await sendMessage(
            chatId,
            "🧠 *اختر مستوى التفكير:*\n\n" +
            "كل مستوى يقدم أسئلة مختلفة في العمق والتعقيد:",
            { reply_markup: getLevelsMenu() }
          );
          break;
          
        case "choose_category":
          await sendMessage(
            chatId,
            "📚 *اختر فئة الأسئلة:*\n\n" +
            "اختر الموضوع الذي تريد استكشافه:",
            { reply_markup: getCategoriesMenu() }
          );
          break;
          
        case "random_deep": {
          // اختيار عشوائي للفئة
          const categories = Object.keys(QUESTION_CATEGORIES);
          const randomCat = categories[Math.floor(Math.random() * categories.length)];
          session.category = randomCat;
          
          try {
            const question = await generateGeminiQuestion(
              session.category,
              session.thinkingLevel,
              session.questions
            );
            
            session.questions.push(question);
            await sendMessage(
              chatId,
              `🎲 *سؤال عشوائي عميق*\n\n` +
              `📚 الفئة: ${QUESTION_CATEGORIES[session.category]}\n` +
              `🧠 المستوى: ${THINKING_LEVELS[session.thinkingLevel].name}\n\n` +
              `❓ ${question}\n\n` +
              `💭 *اكتب إجابتك الآن:*`,
              { reply_markup: getPostAnswerMenu() }
            );
          } catch (error) {
            await sendMessage(
              chatId,
              `❌ ${error.message}\n\n` +
              `حاول مرة أخرى أو اختر خياراً آخر.`,
              { reply_markup: getMainMenu() }
            );
          }
          break;
        }
          
        case "deeper_level": {
          // زيادة مستوى العمق
          const levels = Object.keys(THINKING_LEVELS);
          const currentIndex = levels.indexOf(session.thinkingLevel);
          if (currentIndex < levels.length - 1) {
            session.thinkingLevel = levels[currentIndex + 1];
            session.stats.deepestLevel = session.thinkingLevel;
          }
          
          try {
            const question = await generateGeminiQuestion(
              session.category,
              session.thinkingLevel,
              session.questions
            );
            
            session.questions.push(question);
            await sendMessage(
              chatId,
              `🧠 *انتقلت لمستوى أعمق*\n\n` +
              `📚 الفئة: ${QUESTION_CATEGORIES[session.category]}\n` +
              `🎯 المستوى: ${THINKING_LEVELS[session.thinkingLevel].name}\n\n` +
              `❓ ${question}\n\n` +
              `💭 *خُذ وقتك في التفكير ثم اكتب إجابتك:*`,
              { reply_markup: getPostAnswerMenu() }
            );
          } catch (error) {
            await sendMessage(
              chatId,
              `❌ ${error.message}\n\n` +
              `حاول مرة أخرى أو اختر مستوى أسهل.`,
              { reply_markup: getMainMenu() }
            );
          }
          break;
        }
          
        case "another": {
          try {
            const question = await generateGeminiQuestion(
              session.category,
              session.thinkingLevel,
              session.questions
            );
            
            session.questions.push(question);
            await sendMessage(
              chatId,
              `❓ ${question}\n\n` +
              `💭 *اكتب إجابتك الآن:*`,
              { reply_markup: getPostAnswerMenu() }
            );
          } catch (error) {
            await sendMessage(
              chatId,
              `❌ ${error.message}\n\n` +
              `حاول مرة أخرى.`,
              { reply_markup: getMainMenu() }
            );
          }
          break;
        }
          
        case "go_deeper": {
          // زيادة مستوى العمق مع سؤال جديد
          const levels = Object.keys(THINKING_LEVELS);
          const currentIndex = levels.indexOf(session.thinkingLevel);
          if (currentIndex < levels.length - 1) {
            session.thinkingLevel = levels[currentIndex + 1];
            session.stats.deepestLevel = session.thinkingLevel;
          }
          
          try {
            const question = await generateGeminiQuestion(
              session.category,
              session.thinkingLevel,
              session.questions
            );
            
            session.questions.push(question);
            await sendMessage(
              chatId,
              `🧠 *سؤال من مستوى أعمق*\n\n` +
              `❓ ${question}\n\n` +
              `💭 *تأمل جيداً ثم اكتب إجابتك:*`,
              { reply_markup: getPostAnswerMenu() }
            );
          } catch (error) {
            await sendMessage(
              chatId,
              `❌ ${error.message}\n\n` +
              `حاول مرة أخرى أو اختر مستوى أسهل.`,
              { reply_markup: getMainMenu() }
            );
          }
          break;
        }
          
        case "new_category":
          await sendMessage(
            chatId,
            "📚 *اختر فئة جديدة:*",
            { reply_markup: getCategoriesMenu() }
          );
          break;
          
        case "my_stats": {
          const statsText = `📊 *إحصائيات جلستك*\n\n` +
            `• الأسئلة: ${session.questions.length}\n` +
            `• الإجابات: ${session.answers.length}\n` +
            `• أعمق مستوى وصلت إليه: ${THINKING_LEVELS[session.stats.deepestLevel].name}\n` +
            `• الفئة الحالية: ${QUESTION_CATEGORIES[session.category]}\n` +
            `• المستوى الحالي: ${THINKING_LEVELS[session.thinkingLevel].name}\n\n` +
            `🎯 *استمر في استكشاف أعماق تفكيرك*`;
          
          await sendMessage(chatId, statsText);
          break;
        }
          
        case "reset":
          userSessions.delete(chatId);
          await sendMessage(
            chatId,
            "🔄 *تم إعادة الضبط*\n\n" +
            "جلستك الجديدة جاهزة. اختر مستوى التفكير:",
            { reply_markup: getLevelsMenu() }
          );
          break;
          
        default:
          if (data.startsWith("level_")) {
            const level = data.replace("level_", "");
            session.thinkingLevel = level;
            
            await sendMessage(
              chatId,
              `✅ تم اختيار: ${THINKING_LEVELS[level].name}\n\n` +
              `الآن اختر فئة الأسئلة:`,
              { reply_markup: getCategoriesMenu() }
            );
          }
          else if (data.startsWith("cat_")) {
            const category = data.replace("cat_", "");
            session.category = category;
            
            try {
              const question = await generateGeminiQuestion(
                session.category,
                session.thinkingLevel,
                session.questions
              );
              
              session.questions.push(question);
              await sendMessage(
                chatId,
                `📚 *${QUESTION_CATEGORIES[session.category]}*\n` +
                `🧠 *${THINKING_LEVELS[session.thinkingLevel].name}*\n\n` +
                `❓ ${question}\n\n` +
                `💭 *اكتب إجابتك الآن:*`,
                { reply_markup: getPostAnswerMenu() }
              );
            } catch (error) {
              await sendMessage(
                chatId,
                `❌ ${error.message}\n\n` +
                `حاول اختيار فئة أو مستوى مختلف.`,
                { reply_markup: getMainMenu() }
              );
            }
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
      
      // أمر /start
      if (text.startsWith("/start")) {
        const welcomeMessage = `🧠 *مرحباً ${user.first_name || "صديقي"}!*\n\n` +
          `*لعبة الأسئلة العميقة*\n\n` +
          `🔍 *مميزات اللعبة:*\n` +
          `• أسئلة ذكية 100% من الذكاء الاصطناعي\n` +
          `• 5 مستويات مختلفة للتفكير\n` +
          `• 10 فئات متنوعة من الأسئلة\n` +
          `• ردود ذكية مخصصة لكل إجابة\n` +
          `• نظام تتبع للإحصائيات\n\n` +
          `💭 *نصيحة:* خذ وقتك في التفكير، لا تستعجل الإجابة.\n\n` +
          `اختر نقطة البداية:`;
        
        await sendMessage(chatId, welcomeMessage, { 
          reply_markup: getMainMenu() 
        });
        return res.status(200).end();
      }
      
      // إجابة المستخدم على سؤال
      const session = getSession(chatId);
      if (session.questions.length > 0 && text && !text.startsWith("/")) {
        const lastQuestion = session.questions[session.questions.length - 1];
        
        // حفظ الإجابة
        session.answers.push({
          question: lastQuestion,
          answer: text,
          timestamp: Date.now(),
          level: session.thinkingLevel
        });
        
        // تحديث الإحصائيات
        session.stats.totalAnswers++;
        
        // توليد رد ذكي
        await sendMessage(chatId, "🤔 *جارٍ تحليل إجابتك...*");
        
        const smartResponse = await generateGeminiResponse(
          text,
          lastQuestion,
          session.thinkingLevel
        );
        
        await sendMessage(
          chatId,
          `✨ *تحليلك الشخصي*\n\n${smartResponse}\n\n` +
          `💭 *ماذا تريد الآن؟*`,
          { reply_markup: getPostAnswerMenu() }
        );
        
        return res.status(200).end();
      }
      
      // أي رسالة أخرى
      if (text && !text.startsWith("/")) {
        await sendMessage(
          chatId,
          "🧠 *لعبة الأسئلة العميقة*\n\n" +
          "اكتب /start للبدء في رحلة التفكير العميق.",
          { reply_markup: getMainMenu() }
        );
      }
    }
    
    return res.status(200).end();
    
  } catch (error) {
    console.error("❌ Handler error:", error);
    return res.status(200).json({ 
      ok: false,
      error: "حدث خطأ في الخادم"
    });
  }
}
