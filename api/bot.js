import fs from 'fs';
import path from 'path';

const API = (token, method) => `https://api.telegram.org/bot${token}/${method}`;

const states = {};
const answers = {};
const processingUsers = new Set();
const TARGET_ADMIN_ID = process.env.ADMIN_ID || 7654355810;

const dataPath = path.join(process.cwd(), "data/responses.json");

// ===== دالة لحفظ البيانات =====
function saveData(entry) {
  try {
    let data = [];
    if (fs.existsSync(dataPath)) {
      data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
    }
    data.push(entry);
    
    // التأكد من وجود مجلد data
    const dir = path.dirname(dataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error("❌ خطأ في حفظ البيانات:", error);
    return false;
  }
}

// ===== دالة حساب نسبة الانجذاب =====
function calcAttraction(oldLove, newLove, happy) {
  let base = (newLove * 0.7) + (oldLove * 0.3);
  if (happy === "نعم") base += 10;
  return Math.min(100, Math.round(base));
}

// ===== دالة للردود البسيطة (ذكاء محدود) =====
function getSimpleAIResponse(text, userName = '') {
  const responses = [
    "مشاعرك جميلة 🌟",
    "الحب شعور رائع 😊",
    "أنت شخص طيب 💖",
    "استمر في التفاؤل 🌈",
    "يومك سيكون حلو ☀️",
    "مشاعرك مهمة 🌷",
    "أنت تستحق السعادة 😄",
    "الحياة جميلة معك 🌸",
    "لا تتوقف عن الأمل 💪",
    "أنت مصدر إيجابية ✨"
  ];
  
  let response;
  if (text.includes("حب") || text.includes("حبي") || text.includes("عشق")) {
    response = "الحب هو أجمل شعور 💖";
  } else if (text.includes("سعيد") || text.includes("فرح") || text.includes("مرح")) {
    response = "السعادة تظهر عليك 😊";
  } else if (text.includes("حزين") || text.includes("ألم") || text.includes("بكاء")) {
    response = "كل شيء سيكون أفضل 🌈";
  } else if (text.includes("مشاعر") || text.includes("شعور") || text.includes("إحساس")) {
    response = "مشاعرك صادقة 🌟";
  } else {
    const randomIndex = Math.floor(Math.random() * responses.length);
    response = responses[randomIndex];
  }
  
  if (userName && userName !== "صديق") {
    response = `${userName}، ${response.toLowerCase()}`;
  }
  
  return response;
}

// ===== البوت الرئيسي =====
export default async function handler(req, res) {
  const token = process.env.BOT_TOKEN;
  
  // رد على GET requests
  if (req.method !== "POST") {
    return res.status(200).json({ 
      status: "active",
      service: "🌸 لعبة المشاعر الجميلة",
      version: "2.0 - ذكاء محدود جداً",
      note: "النظام يعمل بشكل مثالي"
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
    // ==================== أوامر الإدمن ====================
    if (userId == TARGET_ADMIN_ID && update.message?.text) {
      const text = update.message.text;
      
      if (text === "/admin") {
        let totalAnswers = 0;
        try {
          if (fs.existsSync(dataPath)) {
            const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
            totalAnswers = data.length;
          }
        } catch (e) {}
        
        await sendMessage(TARGET_ADMIN_ID,
          `👑 *مرحباً يا أدمن!*\n\n` +
          `🤖 *لعبة المشاعر البسيطة*\n\n` +
          `📊 الإجابات المحفوظة: ${totalAnswers}\n` +
          `👤 الجلسات النشطة: ${Object.keys(states).length}\n` +
          `🆔 ID الخاص بك: \`${TARGET_ADMIN_ID}\`\n\n` +
          `✨ *الذكاء:* محدود جداً\n` +
          `💾 *التخزين:* ملف JSON\n` +
          `🎯 *الحالة:* نشط`,
          token
        );
        return res.status(200).end();
      }
      
      if (text === "/stats") {
        try {
          let data = [];
          if (fs.existsSync(dataPath)) {
            data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
          }
          
          const today = new Date().toDateString();
          const todayAnswers = data.filter(item => 
            new Date(item.date).toDateString() === today
          ).length;
          
          await sendMessage(TARGET_ADMIN_ID,
            `📊 *إحصائيات اللعبة*\n\n` +
            `🌸 إجمالي الإجابات: ${data.length}\n` +
            `🌅 إجابات اليوم: ${todayAnswers}\n` +
            `👥 جلسات نشطة: ${Object.keys(states).length}\n\n` +
            `💾 *حالة التخزين:*\n` +
            `• الملف: ${fs.existsSync(dataPath) ? '✅ موجود' : '❌ غير موجود'}\n` +
            `• المسار: ${dataPath}`,
            token
          );
        } catch (error) {
          await sendMessage(TARGET_ADMIN_ID, "❌ خطأ في قراءة الإحصائيات", token);
        }
        return res.status(200).end();
      }
      
      if (text === "/clear") {
        try {
          if (fs.existsSync(dataPath)) {
            const backup = JSON.parse(fs.readFileSync(dataPath, "utf8"));
            fs.writeFileSync(dataPath, JSON.stringify([]));
            await sendMessage(TARGET_ADMIN_ID,
              `🧹 *تم مسح البيانات*\n\n` +
              `📊 العدد السابق: ${backup.length}\n` +
              `📊 العدد الحالي: 0\n` +
              `⏰ الوقت: ${new Date().toLocaleString('ar-EG')}`,
              token
            );
          } else {
            await sendMessage(TARGET_ADMIN_ID, "📭 لا توجد بيانات للمسح", token);
          }
        } catch (error) {
          await sendMessage(TARGET_ADMIN_ID, "❌ خطأ في مسح البيانات", token);
        }
        return res.status(200).end();
      }
    }

    // ===== بدء التحدي عند /start =====
    if (update.message?.text === "/start") {
      states[chatId] = "q1";
      answers[chatId] = { user: update.message.from };

      await sendMessage(chatId,
        `🌸 *مرحباً ${update.message.from.first_name}!*\n\n` +
        `🧩 *تحدي بسيط: اعرف مشاعرك*\n\n` +
        `💡 *كيف تعمل:*\n` +
        `1. ستجيب على 6 أسئلة بسيطة\n` +
        `2. نحسب لك نسبة بسيطة\n` +
        `3. تحصل على نتيجة مبتذلة\n\n` +
        `🎯 *ملاحظة:*\n` +
        `الذكاء محدود جداً!\n` +
        `لا تتوقع تحليلاً عميقاً 😅\n\n` +
        `هل أنت مغرم بأحدهم؟`,
        token,
        [["💖 نعم", "🌸 لا"]]
      );
      return res.status(200).end();
    }

    // ===== التعامل مع أزرار المستخدم =====
    if (update.callback_query) {
      const chatId = update.callback_query.message.chat.id;
      const data = update.callback_query.data;

      switch (states[chatId]) {
        case "q1":
          answers[chatId].inLove = data.includes("نعم") ? "نعم" : "لا";
          states[chatId] = "q2";
          await sendMessage(chatId,
            "✨ *السؤال 2/6*\n\n" +
            "هل سبق لك وأن أحببت شخصًا غيره؟",
            token,
            [["💔 نعم", "🕊️ لا"]]
          );
          break;

        case "q2":
          answers[chatId].lovedBefore = data.includes("نعم") ? "نعم" : "لا";
          states[chatId] = "q3";
          await sendMessage(chatId,
            "🔢 *السؤال 3/6*\n\n" +
            "أدخل *نسبة حبك للشخص القديم*\n" +
            "(0 – 100 فقط)\n\n" +
            "مثال: 75",
            token
          );
          break;

        case "q5":
          answers[chatId].happy = data.includes("نعم") ? "نعم" : "لا";
          states[chatId] = "q6";
          await sendMessage(chatId,
            "📝 *السؤال الأخير 6/6*\n\n" +
            "اكتب أي شيء بسيط عن مشاعرك...\n\n" +
            "مثل:\n" +
            "• \"أشعر بحب\"\n" +
            "• \"أبحث عن سعادة\"\n" +
            "• \"الحياة جميلة\"\n\n" +
            "🎯 *تذكر:*\n" +
            "الذكاء محدود، لا تكتب كثيراً!",
            token
          );
          break;
      }

      // الإجابة على الكال باك
      await fetch(`${API(token, "answerCallbackQuery")}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          callback_query_id: update.callback_query.id,
          text: "✨ تم",
          show_alert: false 
        })
      });

      return res.status(200).end();
    }

    // ===== التعامل مع نصوص / أرقام =====
    if (update.message?.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      const userName = update.message.from.first_name;

      // إذا كان المستخدم يكتب أي شيء خارج الأسئلة
      if (!states[chatId]) {
        const simpleResponse = getSimpleAIResponse(text, userName);
        await sendMessage(chatId,
          `🤖 *رد بسيط جداً:*\n\n` +
          `${simpleResponse}\n\n` +
          `💡 أرسل /start للعب 🌸`,
          token
        );
        return res.status(200).end();
      }

      switch (states[chatId]) {
        case "q3":
          const oldLove = Number(text);
          if (isNaN(oldLove) || oldLove < 0 || oldLove > 100) {
            await sendMessage(chatId,
              "⚠️ *يا ريت!*\n\n" +
              "أدخل رقم بسيط من 0 لـ 100\n" +
              "مثال: 50, 75, 30\n\n" +
              "الذكاء محدود، لا تعقيد! 😊",
              token
            );
            return res.status(200).end();
          }
          answers[chatId].oldLove = oldLove;
          states[chatId] = "q4";
          await sendMessage(chatId,
            "🔢 *السؤال 4/6*\n\n" +
            "أدخل *نسبة حبك للشخص الحالي*\n" +
            "(0 – 100 فقط)\n\n" +
            "مثال: 80",
            token
          );
          break;

        case "q4":
          const newLove = Number(text);
          if (isNaN(newLove) || newLove < 0 || newLove > 100) {
            await sendMessage(chatId,
              "😅 *بسيط يا صديقي!*\n\n" +
              "رقم فقط: 0, 50, 100\n" +
              "لا تعقد الأمور!\n" +
              "حاول مرة أخرى",
              token
            );
            return res.status(200).end();
          }
          answers[chatId].newLove = newLove;
          states[chatId] = "q5";
          await sendMessage(chatId,
            "😊 *السؤال 5/6*\n\n" +
            "هل تشعر بالسعادة الآن؟",
            token,
            [["😄 نعم", "😐 لا"]]
          );
          break;

        case "q6":
          answers[chatId].lifeDesc = text;
          states[chatId] = "done";

          // حساب النسبة
          const attraction = calcAttraction(
            answers[chatId].oldLove || 0,
            answers[chatId].newLove || 0,
            answers[chatId].happy || "لا"
          );

          // تحليل بسيط جداً
          let analysis = "";
          if (attraction >= 80) analysis = "مشاعرك قوية وجميلة 💖";
          else if (attraction >= 60) analysis = "لديك مشاعر إيجابية ✨";
          else if (attraction >= 40) analysis = "مشاعرك في طور النمو 🌱";
          else analysis = "الحب يحتاج وقتاً 🌷";

          // حفظ البيانات
          const saved = saveData({
            date: new Date().toISOString(),
            chatId,
            user: answers[chatId].user,
            ...answers[chatId],
            attraction,
            analysis
          });

          // إرسال النتيجة النهائية
          await sendMessage(chatId,
            `🎉 *تم الانتهاء!*\n\n` +
            `🌸 *نتيجتك البسيطة:*\n` +
            `✨ النسبة: *${attraction}%*\n\n` +
            `🤖 *كلمة من الذكاء المحدود:*\n` +
            `${analysis}\n\n` +
            `📝 *تفسير النسبة:*\n` +
            `• ${attraction >= 80 ? "😍 علاقة قوية" : ""}\n` +
            `• ${attraction >= 60 && attraction < 80 ? "😊 علاقة جيدة" : ""}\n` +
            `• ${attraction >= 40 && attraction < 60 ? "🙂 بداية واعدة" : ""}\n` +
            `• ${attraction < 40 ? "🌱 تحتاج وقتاً" : ""}\n\n` +
            `💡 *ملاحظة مهمة:*\n` +
            `هذه لعبة بسيطة للترفيه فقط!\n` +
            `لا تأخذ النتائج بجدية 😊\n\n` +
            `💾 ${saved ? "✅ تم حفظ إجابتك" : "⚠️ لم يتم الحفظ"}`,
            token
          );

          // إرسال تقرير للإدمن
          try {
            await sendMessage(TARGET_ADMIN_ID,
              `📩 *إجابة جديدة*\n\n` +
              `👤 ${answers[chatId].user.first_name} @${answers[chatId].user.username || 'بدون'}\n` +
              `🆔 \`${answers[chatId].user.id}\`\n` +
              `🎯 النسبة: ${attraction}%\n` +
              `💬 "${text.substring(0, 50)}..."\n` +
              `⏰ ${new Date().toLocaleString('ar-EG')}`,
              token,
              [[{ text: "💬 التواصل", url: `tg://user?id=${answers[chatId].user.id}` }]]
            );
          } catch (e) {
            console.error("❌ خطأ في إرسال تقرير الإدمن:", e);
          }

          // حذف الجلسة
          delete states[chatId];
          delete answers[chatId];
          
          // زر إعادة اللعب
          await sendMessage(chatId,
            "🔄 هل تريد لعب مرة أخرى؟",
            token,
            [[{ text: "🌸 نعم، ألعب مجدداً", callback_data: "restart" }]]
          );
          
          break;
      }

      return res.status(200).end();
    }

  } catch (error) {
    console.error("❌ خطأ في المعالجة:", error);
    
    try {
      await sendMessage(chatId,
        "⚠️ *حدث خطأ غير متوقع*\n\n" +
        "الذكاء كان محدوداً جداً\n" +
        "وانكسر من البساطة! 😅\n\n" +
        "أرسل /start للبدء من جديد 🌸",
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

// ===== دالة إرسال الرسائل =====
async function sendMessage(chatId, text, token, buttons = null) {
  try {
    const body = { 
      chat_id: chatId, 
      text, 
      parse_mode: "Markdown",
      disable_web_page_preview: true 
    };

    if (buttons) {
      body.reply_markup = {
        inline_keyboard: buttons.map(row => 
          row.map(b => ({ 
            text: b, 
            callback_data: b.includes("نعم") ? "نعم" : 
                         b.includes("لا") ? "لا" : 
                         b 
          }))
        )
      };
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
    
    return response;
  } catch (error) {
    console.error("❌ خطأ في إرسال الرسالة:", error);
  }
}

// ===== تهيئة النظام =====
console.log('🚀 بدء تشغيل لعبة المشاعر الجميلة...');
console.log('🤖 النسخة: ذكاء محدود جداً');
console.log('💾 التخزين: ملف JSON');
console.log('🌸 النظام جاهز للاستقبال!');
