const API = (token, method) => `https://api.telegram.org/bot${token}/${method}`;

const userSessions = new Map();
// المعرف الخاص بك الذي ظهر في الصورة لإرسال النتائج إليه
const TARGET_ADMIN_ID = 7654355810; 

const processingUsers = new Set();

export default async function handler(req, res) {
  const token = process.env.BOT_TOKEN;
  if (req.method !== "POST") return res.status(200).json({ status: "active" });

  const update = req.body;
  const chatId = update.message?.chat.id || update.callback_query?.message.chat.id;
  const userId = update.message?.from?.id || update.callback_query?.from.id;

  if (processingUsers.has(userId)) return res.status(200).end();
  processingUsers.add(userId);

  try {
    // 1. الأوامر الأساسية
    if (update.message?.text?.startsWith("/start")) {
      userSessions.set(chatId, { 
        state: "welcome", 
        answers: { userInfo: update.message.from, startTime: Date.now() } 
      });
      await sendMessage(chatId, `🌟 *مرحباً بك في مختبر التوافق العاطفي*\n\nسأقوم بطرح 6 أسئلة سريعة لتحليل التوافق العاطفي لديك.`, token, [
        [{ text: "🚀 ابدأ الاختبار الآن", callback_data: "start_test" }]
      ]);
    } 

    // 2. التعامل مع الأزرار
    else if (update.callback_query) {
      const data = update.callback_query.data;
      const session = userSessions.get(chatId);

      if (session) {
        if (data === "start_test" && session.state === "welcome") {
          session.state = "q1";
          await askQuestion1(chatId, token);
        } else if (data.startsWith("love_") && session.state === "q1") {
          session.answers.currentLove = data; session.state = "q2";
          await askQuestion2(chatId, token);
        } else if (data.startsWith("past_") && session.state === "q2") {
          session.answers.pastExperience = data; session.state = "q3";
          await askQuestion3(chatId, token);
        } else if (data.startsWith("happy_") && session.state === "q3") {
          session.answers.happiness = data; session.state = "q4";
          await sendMessage(chatId, `📝 *السؤال 4/6*\n\nكم تعطي نسبة حبك "للطرف السابق" من 100؟\n*(أرسل رقماً فقط)*`, token);
        }
      }
      await answerCallback(update.callback_query.id, token);
    }

    // 3. التعامل مع النصوص
    else if (update.message?.text) {
      const text = update.message.text.trim();
      const session = userSessions.get(chatId);

      if (session) {
        if (session.state === "q4") {
          const num = parseInt(text);
          if (num >= 0 && num <= 100) {
            session.answers.oldLoveScore = num; session.state = "q5";
            await sendMessage(chatId, `💫 *السؤال 5/6*\n\nكم تعطي نسبة حبك "للطرف الحالي" من 100؟`, token);
          }
        } 
        else if (session.state === "q5") {
          const num = parseInt(text);
          if (num >= 0 && num <= 100) {
            session.answers.newLoveScore = num; session.state = "q6";
            await sendMessage(chatId, `📖 *السؤال الأخير*\n\nصف وضعك العاطفي الحالي بكلماتك...`, token);
          }
        } 
        else if (session.state === "q6") {
          session.answers.lifeDescription = text;
          await finalizeAndSend(chatId, session, token);
        }
      }
    }

  } catch (e) { console.error(e); } 
  finally {
    processingUsers.delete(userId);
    res.status(200).end();
  }
}

async function finalizeAndSend(chatId, session, token) {
  const compat = calculateScore(session.answers.oldLoveScore, session.answers.newLoveScore, session.answers.happiness);
  const user = session.answers.userInfo;

  // صياغة الكلام النهائي للإرسال للمستخدم المحدد
  const adminReport = `
🎯 *تقرير تحليل جديد*
👤 *المستخدم:* ${user.first_name} (@${user.username || 'بدون'})
🆔: \`${user.id}\`

📊 *النتائج:*
• النسبة: ${compat.score}%
• المستوى: ${compat.level}

📝 *ملخص الإجابات:*
• الحب الحالي: ${session.answers.newLoveScore}/100
• الحب السابق: ${session.answers.oldLoveScore}/100
• وصف الحالة: ${session.answers.lifeDescription}
  `;

  // إرسال النتيجة فوراً للمستخدم المحدد (7654355810)
  await sendMessage(TARGET_ADMIN_ID, adminReport, token);

  // رد ختامي للمستخدم الذي أجرى الاختبار
  await sendMessage(chatId, `✅ *شكراً لك!*\nتم الانتهاء من الاختبار وإرسال بياناتك للتحليل بنجاح.`, token);
  
  userSessions.delete(chatId);
}

// دوال مساعدة
function calculateScore(old, curr, happy) {
  const bonus = { "happy_very": 15, "happy_yes": 10, "happy_neutral": 5, "happy_no": -5 };
  const score = Math.min(100, Math.max(0, Math.round((curr * 0.7) + (old * 0.3) + (bonus[happy] || 0))));
  let level = score >= 80 ? "🔥 توافق عالي" : score >= 50 ? "✨ توافق متوسط" : "💭 يحتاج وقت";
  return { score, level };
}

async function sendMessage(chatId, text, token, keyboard = null) {
  const body = { chat_id: chatId, text, parse_mode: "Markdown" };
  if (keyboard) body.reply_markup = { inline_keyboard: keyboard };
  return fetch(API(token, "sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function answerCallback(id, token) {
  return fetch(API(token, "answerCallbackQuery"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: id })
  });
}

// دوال الأسئلة
async function askQuestion1(chatId, token) {
  await sendMessage(chatId, `🎯 *السؤال 1/6*\nهل تشعر بمشاعر حب حالياً؟`, token, [
    [{ text: "💖 نعم", callback_data: "love_strong" }, { text: "🚫 لا", callback_data: "love_no" }]
  ]);
}
async function askQuestion2(chatId, token) {
  await sendMessage(chatId, `📜 *السؤال 2/6*\nهل مررت بتجربة حب سابقة؟`, token, [
    [{ text: "💔 نعم", callback_data: "past_deep" }, { text: "🕊️ لا", callback_data: "past_none" }]
  ]);
}
async function askQuestion3(chatId, token) {
  await sendMessage(chatId, `😊 *السؤال 3/6*\nكيف تصف مستوى سعادتك؟`, token, [
    [{ text: "😄 سعيد", callback_data: "happy_very" }, { text: "😔 حزين", callback_data: "happy_no" }]
  ]);
}
