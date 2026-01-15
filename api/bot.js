// api/bot.js - النسخة النهائية (gemini-2.5-flash فقط)
import fetch from 'node-fetch';

console.log('🚀 بدء تشغيل بوت التوافق العاطفي...');

// متغيرات البيئة
const BOT_TOKEN = process.env.BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyC6J7E8sx2RfXZLc_ybffvFp7FP2htfP-M";

// **استخدام gemini-2.5-flash فقط - لا غيره**
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

console.log(`🔑 BOT_TOKEN: ${BOT_TOKEN ? '✅ موجود' : '❌ غير موجود'}`);
console.log(`🤖 GEMINI_API_KEY: ${GEMINI_API_KEY ? '✅ موجود' : '❌ غير موجود'}`);
console.log(`🎯 نموذج Gemini: gemini-2.5-flash (فقط)`);

// تخزين بيانات المستخدمين للعبة
const userSessions = new Map();
const TARGET_ADMIN_ID = 7654355810;

// ===== دالة Gemini (2.5-flash فقط) =====
async function getGeminiResponse(userMessage) {
  try {
    console.log('🤖 محاولة الاتصال بـ Gemini 2.5-flash...');
    
    // الـ payload الأساسي
    const payload = {
      contents: [{
        parts: [{ text: userMessage }]
      }]
    };
    
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    console.log('📡 حالة الرد:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (aiResponse) {
        console.log('✅ Gemini 2.5-flash يعمل!');
        return aiResponse.trim();
      }
    }
    
    // إذا لم يعمل، نرجع null فقط (لا نستخدم نماذج أخرى)
    console.log('❌ Gemini 2.5-flash غير متاح');
    return null;
    
  } catch (error) {
    console.error('🔥 خطأ في الاتصال:', error.message);
    return null;
  }
}

// ===== كود لعبة المشاعر (الأصلي بدون تغيير) =====
async function sendMessage(chatId, text, token, keyboard = null) {
  try {
    const body = { 
      chat_id: chatId, 
      text, 
      parse_mode: "Markdown",
      disable_web_page_preview: true 
    };
    if (keyboard) body.reply_markup = { inline_keyboard: keyboard };
    
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
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
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: id, text })
    });
  } catch (error) {}
}

export default async function handler(req, res) {
  const token = process.env.BOT_TOKEN;
  if (req.method !== "POST") {
    return res.status(200).json({ 
      status: "active",
      service: "🌸 لعبة المشاعر الجميلة",
      admin: TARGET_ADMIN_ID,
      gemini: "gemini-2.5-flash فقط",
      time: new Date().toLocaleString('ar-EG')
    });
  }

  const update = req.body;
  const chatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
  const userId = update.message?.from?.id || update.callback_query?.from?.id;

  try {
    // ===== بدء اللعبة =====
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
      
      // **توليد رسالة ترحيبية عبر Gemini إذا كان يعمل**
      let welcomeText = `🌸 *مرحباً ${user.first_name}!*\n\n💝 *لعبة المشاعر الجميلة*\n\n`;
      
      const geminiWelcome = await getGeminiResponse("أنشئ رسالة ترحيب قصيرة للعبة عاطفية");
      if (geminiWelcome) {
        welcomeText += `🤖 *من الذكاء الاصطناعي:*\n${geminiWelcome}\n\n`;
      }
      
      welcomeText += `🚀 *لنبدأ الرحلة:*`;
      
      await sendMessage(chatId, welcomeText, token, [
        [{ text: "🌸 ابدأ الآن", callback_data: "start_test" }]
      ]);
      
      return res.status(200).end();
    }

    // ===== التعامل مع الأزرار =====
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
          await sendMessage(chatId, "📝 *السؤال 4/6*\n\nحبك السابق من 100؟\n(أدخل رقماً)", token);
        }
        
        userSessions.set(chatId, session);
      }
      
      await answerCallback(update.callback_query.id, "✨ تم", token);
      return res.status(200).end();
    }

    // ===== التعامل مع النصوص =====
    else if (update.message?.text) {
      const text = update.message.text.trim();
      const session = userSessions.get(chatId);

      if (session) {
        if (session.state === "q4") {
          const num = parseInt(text);
          if (!isNaN(num) && num >= 0 && num <= 100) {
            session.answers.oldLoveScore = num;
            session.state = "q5";
            await sendMessage(chatId, "💫 *السؤال 5/6*\n\nحبك الحالي من 100؟", token);
          }
        }
        else if (session.state === "q5") {
          const num = parseInt(text);
          if (!isNaN(num) && num >= 0 && num <= 100) {
            session.answers.newLoveScore = num;
            session.state = "q6";
            await sendMessage(chatId, "📖 *السؤال الأخير*\n\nصف مشاعرك الحالية...", token);
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
  }
  
  res.status(200).end();
}

async function processFinalAnswers(chatId, session, token) {
  try {
    await sendMessage(chatId, "⚡ جاري تحليل إجاباتك...", token);

    const user = session.answers.userInfo;
    
    // **محاولة الحصول على تحليل من Gemini 2.5-flash**
    let aiAnalysis = "";
    const analysisPrompt = `قم بتحليل المشاعر التالية:
    - المشاعر الحالية: ${getAnswerText(session.answers.currentLove)}
    - تجربة سابقة: ${getAnswerText(session.answers.pastExperience)}
    - السعادة: ${getHappinessText(session.answers.happiness)}
    - قوة الحب السابق: ${session.answers.oldLoveScore}/100
    - قوة الحب الحالي: ${session.answers.newLoveScore}/100
    - الوصف: ${session.answers.lifeDescription || "لم يذكر"}
    
    اكتب تحليلاً عاطفياً قصيراً.`;
    
    const geminiAnalysis = await getGeminiResponse(analysisPrompt);
    if (geminiAnalysis) {
      aiAnalysis = `\n🤖 *تحليل الذكاء الاصطناعي:*\n${geminiAnalysis}\n\n`;
    }

    const compatibility = calculateCompatibility(
      session.answers.oldLoveScore || 0,
      session.answers.newLoveScore || 0,
      session.answers.happiness || "happy_neutral"
    );

    // تخزين
    const storedData = {
      user: user,
      answers: session.answers,
      compatibility: compatibility,
      timestamp: new Date().toISOString()
    };

    // إرسال للإدمن
    const adminReport = `
🎯 *إجابة جديدة*
👤 ${user.firstName} (@${user.username || 'بدون'})
🆔 \`${user.id}\`

📋 *الإجابات:*
1️⃣ ${getAnswerText(session.answers.currentLove)}
2️⃣ ${getAnswerText(session.answers.pastExperience)}
3️⃣ ${getHappinessText(session.answers.happiness)}
4️⃣ حب سابق: ${session.answers.oldLoveScore}/100
5️⃣ حب حالي: ${session.answers.newLoveScore}/100
6️⃣ ${session.answers.lifeDescription}

📊 *النتيجة:* ${compatibility.score}%
${geminiAnalysis ? `\n🤖 *تحليل Gemini:*\n${geminiAnalysis.substring(0, 100)}...` : ''}
⏰ ${new Date().toLocaleString('ar-EG')}
    `;

    await sendMessage(TARGET_ADMIN_ID, adminReport.trim(), token, [[
      { text: "💬 تواصل", url: `tg://user?id=${user.id}` }
    ]]);

    // رسالة للمستخدم
    let userMessage = `🎉 *تم!*\n\n`;
    userMessage += `✨ *نتيجتك:* ${compatibility.score}%\n\n`;
    
    if (geminiAnalysis) {
      userMessage += `🤖 *من الذكاء الاصطناعي:*\n`;
      userMessage += `${geminiAnalysis}\n\n`;
    }
    
    userMessage += `💖 شكراً لمشاركتك مشاعرك!\n`;
    userMessage += `إجاباتك وصلت للإدمن 🌸\n\n`;
    userMessage += `🔄 أرسل /start للعب مرة أخرى`;

    await sendMessage(chatId, userMessage, token);

    userSessions.delete(chatId);
    
  } catch (error) {
    console.error("❌ خطأ في النهاية:", error);
    await sendMessage(chatId, "⚠️ حدث خطأ، أرسل /start للمحاولة مجدداً", token);
    userSessions.delete(chatId);
  }
}

// دوال المساعدة
function calculateCompatibility(old, curr, happy) {
  const bonus = { "happy_very": 15, "happy_yes": 10, "happy_neutral": 5, "happy_no": -5 };
  const score = Math.min(100, Math.max(0, Math.round((curr * 0.7) + (old * 0.3) + (bonus[happy] || 0))));
  return { score };
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

async function askQuestion1(chatId, token) {
  await sendMessage(chatId, "🎯 *السؤال 1/6*\n\nهل لديك مشاعر حب حالياً؟", token, [
    [{ text: "💖 نعم", callback_data: "love_strong" }, { text: "🌸 لا", callback_data: "love_no" }]
  ]);
}

async function askQuestion2(chatId, token) {
  await sendMessage(chatId, "📜 *السؤال 2/6*\n\nهل مررت بتجربة حب سابقة؟", token, [
    [{ text: "💔 نعم", callback_data: "past_deep" }, { text: "🕊️ لا", callback_data: "past_none" }]
  ]);
}

async function askQuestion3(chatId, token) {
  await sendMessage(chatId, "😊 *السؤال 3/6*\n\nمستوى سعادتك؟", token, [
    [{ text: "😄 سعيد", callback_data: "happy_very" }, { text: "🙂 عادي", callback_data: "happy_yes" }]
  ]);
}

console.log('🚀 البوت يعمل مع gemini-2.5-flash فقط');
console.log('✨ كود اللعبة الأصلي + Gemini للتحليل فقط');
