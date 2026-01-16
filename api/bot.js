// api/bot.js
import fetch from "node-fetch";

/* ========== الإعدادات ========== */
const BOT_TOKEN = process.env.BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ADMIN_ID = process.env.ADMIN_ID;

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

/* ========== Rate Limit ========== */
let requestCount = 0;
let lastReset = Date.now();
const LIMIT = 20;
const RESET_TIME = 60 * 1000;

function checkRateLimit() {
  const now = Date.now();
  if (now - lastReset > RESET_TIME) {
    requestCount = 0;
    lastReset = now;
  }
  if (requestCount >= LIMIT) return false;
  requestCount++;
  return true;
}

/* ========== أنواع اللعبة ========== */
const GAME_TYPES = {
  comedy: "😂 أسئلة كوميدية",
  truth: "🔥 صراحة وجرأة",
  free: "🗣️ تحدث بدون حواجز",
  love: "❤️ أسئلة غرامية",
  couples: "💞 أسئلة للعشاق",
  funny: "🤣 مضحكة",
  daily: "📔 يوميات",
  personality: "🧠 شخصية"
};

/* ========== حالة المستخدم ========== */
const userState = new Map(); // chatId => { type, question, userId }

/* ========== الأسئلة الافتراضية (في حالة فشل Gemini) ========== */
const DEFAULT_QUESTIONS = {
  comedy: [
    "إذا كنت ستتحول إلى حيوان ليوم واحد، فماذا تختار ولماذا؟",
    "ما هو أغرب شيء فعلته عندما كنت لوحدك؟",
    "ما هو أسوأ لقب أطلقه عليك أحدهم؟",
    "ما هو أغرب حلم تتذكره؟",
    "إذا كان بإمكانك اختراع عطلة جديدة، ماذا ستكون وكيف تحتفل بها؟"
  ],
  truth: [
    "ما هو أكبر سر لم تخبر به أحداً من قبل؟",
    "ما هو الشيء الذي تخجل منه لكنك تفعله سراً؟",
    "ما هو أسوأ خطأ ارتكبته في حياتك؟",
    "ما هو الشيء الذي تتمنى أن تعود بالزمن وتغيره؟",
    "ما هو أكبر كذبة قلتها لشخص عزيز عليك؟"
  ],
  free: [
    "ما هو الشيء الذي يجعلك تبكي بسرعة؟",
    "ما هو أكبر خوف لديك؟",
    "ما هو الشيء الذي تتمنى أن تسمعه من شخص معين؟",
    "ما هو أكثر موقف جعلك تشعر بالضعف؟",
    "ما هو الشيء الذي تندم على عدم قوله؟"
  ],
  love: [
    "ما هو أكثر شيء رومانسي فعلته من أجل شخص تحبه؟",
    "ما هو تعريفك للحب الحقيقي؟",
    "ما هو أكثر شيء يجعلك تشعر بالحب؟",
    "ما هي الصفة التي تبحث عنها في شريك الحياة؟",
    "ما هو أجمل اعتراف حب سمعته في حياتك؟"
  ],
  couples: [
    "ما هو أول شيء لاحظته في شريكك؟",
    "ما هي العادة الغريبة لشريكك التي تحبها؟",
    "ما هو أكثر شيء تفتقده عندما تكون بعيداً عن حبيبك؟",
    "ما هي الذكرى المفضلة لديك مع شريكك؟",
    "ما هي الكلمة التي تود أن تسمعها من شريكك دائماً؟"
  ],
  funny: [
    "ما هو أغرب شيء حدث لك أثناء موعد غرامي؟",
    "ما هو أسوأ هدية تلقيتها في حياتك؟",
    "ما هو أكثر موقف محرج تعرضت له؟",
    "ما هي العادة الغريبة التي لديك وتخفيها عن الجميع؟",
    "ما هو أسوأ طبق طبختِه في حياتك؟"
  ],
  daily: [
    "ما هو أول شيء تفعله عندما تستيقظ من النوم؟",
    "ما هو روتينك اليومي المفضل؟",
    "ما هو الشيء الذي يشعرك بالسعادة في يومك؟",
    "ما هي العادة اليومية التي تود التخلص منها؟",
    "ما هو أفضل جزء في يومك عادة؟"
  ],
  personality: [
    "ما هي الصفة التي تحبها في شخصيتك؟",
    "ما هو الشيء الذي يغضبك بسرعة؟",
    "ما هي الموهبة التي تتمنى أن تمتلكها؟",
    "كيف تصف نفسك في ثلاث كلمات؟",
    "ما هو الشيء الذي يجعلك تشعر بالفخر؟"
  ]
};

/* ========== Gemini ========== */
function buildPrompt(typeName) {
  return `
أنت مولد أسئلة للعبة دردشة تفاعلية.
أنشئ سؤالاً واحداً فقط.
نوع السؤال: ${typeName}
الشروط:
- سؤال واحد فقط
- بدون ترقيم
- بدون شرح
- قصير وجذاب
- مناسب للعبة مع الأصدقاء
- باللغة العربية الفصحى أو العامية
`;
}

async function getGeminiResponse(promptText) {
  if (!checkRateLimit()) {
    throw new Error("RATE_LIMIT");
  }

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ 
            text: promptText 
          }] 
        }]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Gemini API Error:", error);
      throw new Error("GEMINI_ERROR");
    }

    const data = await response.json();
    const question = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!question || question.trim().length < 5) {
      throw new Error("INVALID_QUESTION");
    }
    
    return question.trim();
  } catch (error) {
    console.error("Error in getGeminiResponse:", error);
    throw error;
  }
}

/* ========== Telegram Helpers ========== */
async function sendMessage(chatId, text, extra = {}) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "Markdown",
        ...extra
      })
    });
  } catch (error) {
    console.error("Error sending message:", error);
  }
}

async function sendTyping(chatId) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        action: "typing"
      })
    });
  } catch (error) {
    console.error("Error sending typing:", error);
  }
}

/* ========== أزرار القائمة ========== */
function gameMenu() {
  const types = Object.entries(GAME_TYPES);
  const keyboard = [];
  
  // ترتيب الأزرار في صفين
  for (let i = 0; i < types.length; i += 2) {
    const row = [];
    row.push({ text: types[i][1], callback_data: `game_${types[i][0]}` });
    
    if (i + 1 < types.length) {
      row.push({ text: types[i + 1][1], callback_data: `game_${types[i + 1][0]}` });
    }
    
    keyboard.push(row);
  }
  
  return keyboard;
}

/* ========== أزرار بعد السؤال ========== */
function afterQuestionButtons() {
  return [
    [
      { text: "🔄 سؤال آخر", callback_data: "next_q" },
      { text: "🔙 تغيير النوع", callback_data: "back_menu" }
    ]
  ];
}

/* ========== إرسال للأدمن ========== */
async function sendToAdmin(user, question, answer) {
  try {
    if (!ADMIN_ID) return; // إذا لم يتم تعيين ID الأدمن
    
    const msg = `
📥 *لعبة الأسئلة*

👤 المستخدم:
${user.first_name || ""} ${user.last_name || ""}
@${user.username || "—"}
ID: ${user.id}

❓ السؤال:
${question}

💬 الإجابة:
${answer}
`;
    await sendMessage(ADMIN_ID, msg);
  } catch (error) {
    console.error("Error sending to admin:", error);
  }
}

/* ========== توليد سؤال ========== */
async function generateQuestion(typeKey) {
  const typeName = GAME_TYPES[typeKey];
  
  try {
    const prompt = buildPrompt(typeName);
    return await getGeminiResponse(prompt);
  } catch (error) {
    // استخدام الأسئلة الافتراضية إذا فشل Gemini
    const questions = DEFAULT_QUESTIONS[typeKey] || DEFAULT_QUESTIONS.comedy;
    const randomIndex = Math.floor(Math.random() * questions.length);
    return questions[randomIndex];
  }
}

/* ========== Handler الرئيسي ========== */
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
      status: "OK",
      bot: "لعبة الأسئلة التفاعلية",
      active_users: userState.size,
      rate_limit: `${requestCount}/${LIMIT}`
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const update = req.body;

    /* ====== معالجة أزرار Inline ====== */
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const chatId = callbackQuery.message.chat.id;
      const user = callbackQuery.from;
      const data = callbackQuery.data;

      await sendTyping(chatId);

      // اختيار نوع اللعبة
      if (data.startsWith("game_")) {
        const typeKey = data.replace("game_", "");
        
        if (!GAME_TYPES[typeKey]) {
          await sendMessage(chatId, "⚠️ نوع اللعبة غير صحيح");
          return res.status(200).end();
        }

        const question = await generateQuestion(typeKey);
        
        userState.set(chatId, { 
          type: typeKey, 
          question: question,
          userId: user.id 
        });

        await sendMessage(chatId, `*${GAME_TYPES[typeKey]}*\n\n❓ ${question}`, {
          reply_markup: {
            inline_keyboard: afterQuestionButtons()
          }
        });

        // إرسال إشعار الضغط
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: callbackQuery.id
          })
        });
      }

      // سؤال آخر من نفس النوع
      else if (data === "next_q") {
        const state = userState.get(chatId);
        
        if (!state) {
          await sendMessage(chatId, "⚠️ لا توجد لعبة نشطة. ابدأ بالضغط على /start");
          return res.status(200).end();
        }

        const question = await generateQuestion(state.type);
        
        state.question = question;
        userState.set(chatId, state);

        await sendMessage(chatId, `❓ ${question}`, {
          reply_markup: {
            inline_keyboard: afterQuestionButtons()
          }
        });

        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: callbackQuery.id
          })
        });
      }

      // الرجوع للقائمة الرئيسية
      else if (data === "back_menu") {
        await sendMessage(chatId, "🎮 *اختر نوع اللعبة:*", {
          reply_markup: {
            inline_keyboard: gameMenu()
          }
        });

        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: callbackQuery.id
          })
        });
      }

      return res.status(200).end();
    }

    /* ====== معالجة الرسائل النصية ====== */
    if (!update.message) {
      return res.status(200).end();
    }

    const message = update.message;
    const chatId = message.chat.id;
    const text = message.text || "";
    const user = message.from;

    // أمر /start
    if (text === "/start") {
      await sendMessage(chatId, "🎮 *مرحباً بك في لعبة الأسئلة التفاعلية!*\n\nاختر نوع الأسئلة الذي تريد:", {
        reply_markup: {
          inline_keyboard: gameMenu()
        }
      });
      
      return res.status(200).end();
    }

    // أمر /help
    if (text === "/help") {
      await sendMessage(chatId, "📖 *كيفية اللعب:*\n\n1. اختر نوع الأسئلة من القائمة\n2. اقرأ السؤال وأجب عليه\n3. يمكنك طلب سؤال آخر أو تغيير النوع\n4. إجاباتك تصل للإدمن للتحليل\n\n📌 أوامر:\n/start - بدء اللعبة\n/menu - عرض القائمة");
      return res.status(200).end();
    }

    // أمر /menu
    if (text === "/menu") {
      await sendMessage(chatId, "🎮 *اختر نوع اللعبة:*", {
        reply_markup: {
          inline_keyboard: gameMenu()
        }
      });
      return res.status(200).end();
    }

    // معالجة إجابة المستخدم
    const state = userState.get(chatId);
    if (state && text && !text.startsWith("/")) {
      await sendTyping(chatId);
      
      // إرسال الإجابة للإدمن
      await sendToAdmin(user, state.question, text);
      
      // رد على المستخدم
      await sendMessage(
        chatId,
        "✅ *تم تسجيل إجابتك!*\n\nاضغط على زر 🔄 لسؤال آخر أو غيّر النوع:",
        {
          reply_markup: {
            inline_keyboard: afterQuestionButtons()
          }
        }
      );
      
      return res.status(200).end();
    }

    // إذا كتب رسالة عادية بدون لعبة نشطة
    if (text && !text.startsWith("/")) {
      await sendMessage(chatId, "🎮 *ابدأ اللعبة أولاً بالضغط على /start*");
      return res.status(200).end();
    }

    return res.status(200).end();

  } catch (error) {
    console.error("Handler error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
