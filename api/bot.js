import fs from "fs";
import path from "path";

const API = (token, method) =>
  `https://api.telegram.org/bot${token}/${method}`;

// ===== إعدادات الإدمن =====
const ADMIN_ID = 7654355810; // ID الخاص بك هنا

// ===== متغير لتخزين البيانات مؤقتاً =====
let temporaryStorage = [];

// ===== دالة إرسال الرسائل =====
async function sendMessage(chatId, text, token, inlineKeyboard = null) {
  try {
    const body = {
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
      disable_web_page_preview: true
    };

    if (inlineKeyboard) {
      body.reply_markup = { inline_keyboard: inlineKeyboard };
    }

    const response = await fetch(`${API(token, "sendMessage")}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ فشل في إرسال الرسالة:', errorText);
    }
  } catch (error) {
    console.error("❌ خطأ في إرسال الرسالة:", error);
  }
}

// ===== دالة إرسال البيانات للإدمن =====
async function sendDataToAdmin(token, userData, answers) {
  try {
    const message = `
🌸 *إجابة جديدة - ${new Date().toLocaleString('ar-EG')}*

👤 *المستخدم:*
• الاسم: ${userData.firstName} ${userData.lastName || ''}
• المعرف: @${userData.username || 'بدون'}
• الـ ID: \`${userData.id}\`

📋 *الإجابات:*
1️⃣ *المشاعر الحالية:* ${getAnswerText(answers.currentLove)}
2️⃣ *التجربة السابقة:* ${getAnswerText(answers.pastExperience)}
3️⃣ *مستوى السعادة:* ${getHappinessText(answers.happiness)}
4️⃣ *حب سابق:* ${answers.oldLoveScore}/100
5️⃣ *حب حالي:* ${answers.newLoveScore}/100
6️⃣ *وصف الحياة:* ${answers.lifeDescription || "لم يذكر"}

⏰ *التوقيت:* ${new Date().toLocaleString('ar-EG')}
✨ *رقم الإجابة:* ${temporaryStorage.length + 1}
    `;

    await sendMessage(ADMIN_ID, message.trim(), token, [[
      { text: "💬 التواصل", url: `tg://user?id=${userData.id}` }
    ]));

    // تخزين مؤقت
    temporaryStorage.push({
      user: userData,
      answers: answers,
      timestamp: new Date().toISOString()
    });

    // حفظ فقط آخر 100 إجابة لتجنب امتلاء الذاكرة
    if (temporaryStorage.length > 100) {
      temporaryStorage = temporaryStorage.slice(-100);
    }

    console.log('✅ تم إرسال البيانات للإدمن');

  } catch (error) {
    console.error('❌ خطأ في إرسال البيانات للإدمن:', error);
  }
}

// ===== دوال المساعدة =====
function getAnswerText(answerKey) {
  const answers = {
    'love_strong': '💖 نعم، مشاعر قوية',
    'love_moderate': '✨ مشاعر متوسطة',
    'love_unsure': '🤔 غير متأكد',
    'love_no': '🌸 ليس الآن',
    'past_deep': '💔 تجربة عميقة',
    'past_ended': '🌟 تجربة انتهت',
    'past_none': '🕊️ ليس بعد',
    'past_secret': '🔐 خصوصية'
  };
  return answers[answerKey] || answerKey || 'غير محدد';
}

function getHappinessText(happinessKey) {
  const happinessMap = {
    'happy_very': '😄 سعيد جداً',
    'happy_yes': '🙂 سعيد',
    'happy_neutral': '😐 محايد',
    'happy_no': '💭 أبحث عن السعادة'
  };
  return happinessMap[happinessKey] || happinessKey || 'غير محدد';
}

// ===== البوت الرئيسي =====
export default async function handler(req, res) {
  const token = process.env.BOT_TOKEN;
  
  if (req.method !== "POST") {
    return res.status(200).json({ 
      status: "active",
      service: "🌸 لعبة التوافق العاطفي",
      note: "كل الإجابات ترسل للإدمن مباشرة"
    });
  }

  try {
    const update = req.body;

    // ===== الأمر لعرض عدد الإجابات =====
    if (update.message?.text === "/count" && update.message.from.id === ADMIN_ID) {
      await sendMessage(ADMIN_ID,
        `📊 *عدد الإجابات المخزنة مؤقتاً:* ${temporaryStorage.length}\n\n` +
        `⏰ *آخر إجابة:* ${temporaryStorage.length > 0 ? 
          new Date(temporaryStorage[temporaryStorage.length - 1].timestamp).toLocaleString('ar-EG') : 
          'لا توجد إجابات'}\n\n` +
        `✨ *ملاحظة:*\n` +
        `البيانات مخزنة في الذاكرة فقط\n` +
        `وستفقد عند إعادة تشغيل البوت`,
        token
      );
      return res.status(200).end();
    }

    // ===== الأمر لعرض آخر الإجابات =====
    if (update.message?.text === "/latest" && update.message.from.id === ADMIN_ID) {
      if (temporaryStorage.length === 0) {
        await sendMessage(ADMIN_ID, "📭 لا توجد إجابات حتى الآن.", token);
        return res.status(200).end();
      }

      const latest = temporaryStorage.slice(-5).reverse();
      
      let message = `📝 *آخر ${latest.length} إجابة*\n\n`;
      
      latest.forEach((item, index) => {
        message += `*${index + 1}. ${item.user.firstName || 'مستخدم'}*\n`;
        message += `   📛 @${item.user.username || 'بدون'}\n`;
        message += `   💖 المشاعر: ${getAnswerText(item.answers.currentLove)}\n`;
        message += `   📊 حب سابق: ${item.answers.oldLoveScore}/100\n`;
        message += `   📊 حب حالي: ${item.answers.newLoveScore}/100\n`;
        message += `   ⏰ ${new Date(item.timestamp).toLocaleString('ar-EG')}\n`;
        message += `   ───────────────\n`;
      });

      await sendMessage(ADMIN_ID, message, token);
      return res.status(200).end();
    }

    // ===== بدء اللعبة =====
    if (update.message?.text === "/start") {
      const chatId = update.message.chat.id;
      const user = update.message.from;
      
      // تخزين جلسة بسيطة
      const session = {
        state: "q1",
        answers: {
          userInfo: {
            id: user.id,
            username: user.username || "بدون",
            firstName: user.first_name,
            lastName: user.last_name || "",
            chatId: chatId
          }
        },
        step: 1
      };

      await sendMessage(chatId,
        `🌸 *مرحباً ${user.first_name}*\n\n` +
        `💝 *لعبة التوافق العاطفي*\n\n` +
        `✨ هذه لعبة جميلة للتعبير عن مشاعرك\n` +
        `📝 ستجيب على 6 أسئلة بسيطة\n` +
        `💌 إجاباتك ستصل للإدمن بشكل خاص\n\n` +
        `🎯 *السؤال 1/6*\n\n` +
        `💘 *هل تشعر بمشاعر حب تجاه شخص معين حالياً؟*`,
        token,
        [
          [
            { text: "💖 نعم، مشاعر قوية", callback_data: "love_strong" },
            { text: "✨ مشاعر متوسطة", callback_data: "love_moderate" }
          ],
          [
            { text: "🤔 غير متأكد", callback_data: "love_unsure" },
            { text: "🌸 ليس الآن", callback_data: "love_no" }
          ]
        ]
      );
      
      // تخزين الجلسة في كائن بسيط
      global.sessions = global.sessions || {};
      global.sessions[chatId] = session;
      
      return res.status(200).end();
    }

    // ===== التعامل مع أزرار الاختيار =====
    if (update.callback_query) {
      const chatId = update.callback_query.message.chat.id;
      const data = update.callback_query.data;
      const session = global.sessions?.[chatId];

      if (!session) {
        await sendMessage(chatId, "💔 الجلسة انتهت. أرسل /start للبدء من جديد.", token);
        return res.status(200).end();
      }

      // تأكيد استلام الإجابة
      try {
        await fetch(`${API(token, "answerCallbackQuery")}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            callback_query_id: update.callback_query.id,
            text: "✨ تم الاستلام"
          })
        });
      } catch (error) {
        console.error("Error answering callback query:", error);
      }

      // معالجة الأسئلة
      if (session.state === "q1" && data.startsWith("love_")) {
        session.answers.currentLove = data;
        session.state = "q2";
        session.step = 2;
        
        await sendMessage(chatId,
          `🌷 *السؤال ${session.step}/6*\n\n` +
          `⏳ *هل مررت بتجربة حب سابقة؟*`,
          token,
          [
            [
              { text: "💔 نعم، عميقة", callback_data: "past_deep" },
              { text: "🌟 نعم، انتهت", callback_data: "past_ended" }
            ],
            [
              { text: "🕊️ ليس بعد", callback_data: "past_none" },
              { text: "🔐 خصوصية", callback_data: "past_secret" }
            ]
          ]
        );
      }
      else if (session.state === "q2" && data.startsWith("past_")) {
        session.answers.pastExperience = data;
        session.state = "q3";
        session.step = 3;
        
        await sendMessage(chatId,
          `😊 *السؤال ${session.step}/6*\n\n` +
          `🌈 *كيف تصف مستوى سعادتك الحالي؟*`,
          token,
          [
            [
              { text: "😄 سعيد جداً", callback_data: "happy_very" },
              { text: "🙂 سعيد", callback_data: "happy_yes" }
            ],
            [
              { text: "😐 محايد", callback_data: "happy_neutral" },
              { text: "💭 أبحث عن السعادة", callback_data: "happy_no" }
            ]
          ]
        );
      }
      else if (session.state === "q3" && data.startsWith("happy_")) {
        session.answers.happiness = data;
        session.state = "q4";
        session.step = 4;
        
        await sendMessage(chatId,
          `📝 *السؤال ${session.step}/6*\n\n` +
          `🔢 *على مقياس من 0 إلى 100*\n` +
          `ما مدى حبك للشخص السابق؟\n\n` +
          `*أدخل رقماً فقط:*`,
          token
        );
      }

      global.sessions[chatId] = session;
      return res.status(200).end();
    }

    // ===== التعامل مع الإدخال النصي =====
    if (update.message?.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text.trim();
      const session = global.sessions?.[chatId];

      if (!session) {
        await sendMessage(chatId, "💔 الجلسة انتهت. أرسل /start للبدء من جديد.", token);
        return res.status(200).end();
      }

      if (session.state === "q4") {
        const oldLove = parseInt(text);
        if (isNaN(oldLove) || oldLove < 0 || oldLove > 100) {
          await sendMessage(chatId,
            "⚠️ *يرجى إدخال رقم بين 0 و 100 فقط*\nمثال: 75, 50, 30, 0",
            token
          );
          return res.status(200).end();
        }
        
        session.answers.oldLoveScore = oldLove;
        session.state = "q5";
        session.step = 5;
        
        await sendMessage(chatId,
          `💫 *السؤال ${session.step}/6*\n\n` +
          `🔢 *على مقياس من 0 إلى 100*\n` +
          `ما مدى حبك للشخص الحالي؟\n\n` +
          `*أدخل رقماً فقط:*`,
          token
        );
      }
      else if (session.state === "q5") {
        const newLove = parseInt(text);
        if (isNaN(newLove) || newLove < 0 || newLove > 100) {
          await sendMessage(chatId,
            "⚠️ *يرجى إدخال رقم بين 0 و 100 فقط*\nمثال: 80, 65, 90, 0",
            token
          );
          return res.status(200).end();
        }
        
        session.answers.newLoveScore = newLove;
        session.state = "q6";
        session.step = 6;
        
        await sendMessage(chatId,
          `📖 *السؤال ${session.step}/6*\n\n` +
          `💭 *صف حياتك العاطفية بكلماتك...*\n\n` +
          `اكتب ما تشعر به:`,
          token
        );
      }
      else if (session.state === "q6") {
        session.answers.lifeDescription = text;
        
        // إرسال البيانات للإدمن
        await sendDataToAdmin(token, session.answers.userInfo, session.answers);
        
        // رسالة شكر للمستخدم
        await sendMessage(chatId,
          `🎉 *تم إكمال اللعبة بنجاح!*\n\n` +
          `🌸 *شكراً جزيلاً لك*\n` +
          `✨ لقد شاركتنا مشاعرك الجميلة\n` +
          `💝 إجاباتك وصلت للإدمن بنجاح\n\n` +
          `*رسالة خاصة:*\n` +
          `"كل مشاعرك تستحق أن تُسمع"\n` +
          `كن دائماً كما أنت 🌷\n\n` +
          `🔄 أرسل /start للعب مرة أخرى`,
          token
        );
        
        // حذف الجلسة
        delete global.sessions[chatId];
      }

      if (session) {
        global.sessions[chatId] = session;
      }
      
      return res.status(200).end();
    }

    res.status(200).end();
  } catch (error) {
    console.error("❌ خطأ في البوت:", error);
    res.status(500).json({ 
      error: "Internal server error",
      message: error.message 
    });
  }
}

// ===== تنظيف الجلسات القديمة كل 10 دقائق =====
setInterval(() => {
  if (global.sessions) {
    const now = Date.now();
    let cleaned = 0;
    
    for (const chatId in global.sessions) {
      // إذا مرت أكثر من 30 دقيقة على الجلسة
      if (global.sessions[chatId].timestamp && (now - global.sessions[chatId].timestamp > 30 * 60 * 1000)) {
        delete global.sessions[chatId];
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 تم تنظيف ${cleaned} جلسة منتهية`);
    }
  }
}, 10 * 60 * 1000);

console.log('🚀 بدء تشغيل لعبة التوافق العاطفي...');
console.log(`🌸 الإدمن: ${ADMIN_ID}`);
console.log('💾 التخزين: في الذاكرة فقط');
