import fs from "fs";
import path from "path";

const API = (token, method) =>
  `https://api.telegram.org/bot${token}/${method}`;

const userSessions = new Map();

// ===== إعدادات الإدمن =====
const ADMIN_IDS = [7654355810]; // ID الخاص بك هنا

// ===== مسار البيانات =====
const dataPath = path.join(process.cwd(), "data/responses.json");

// ===== إنشاء مجلد data إذا لم يكن موجوداً =====
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// ===== دالة حفظ البيانات =====
function saveData(entry) {
  try {
    let data = [];
    if (fs.existsSync(dataPath)) {
      const fileContent = fs.readFileSync(dataPath, "utf8");
      data = fileContent ? JSON.parse(fileContent) : [];
    }
    
    const enhancedEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      sessionId: Date.now(),
      savedAt: new Date().toLocaleString('ar-EG')
    };
    
    data.push(enhancedEntry);
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    
    console.log('✅ تم حفظ البيانات للمستخدم:', entry.chatId);
    return enhancedEntry;
    
  } catch (error) {
    console.error('❌ خطأ في حفظ البيانات:', error);
    throw error;
  }
}

// ===== دوال إرسال للإدمن =====
async function sendToAdmin(token, message, options = {}) {
  try {
    for (const adminId of ADMIN_IDS) {
      await sendMessage(adminId, message, token, options.inlineKeyboard);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    console.log('📤 تم إرسال الإشعار للإدمن');
  } catch (error) {
    console.error('❌ خطأ في إرسال الإشعار للإدمن:', error);
  }
}

async function sendCompleteResultsToAdmin(token, userData, answers, compatibility) {
  try {
    const formattedMessage = `
🎯 *نتيجة اختبار جديدة - ${new Date().toLocaleString('ar-EG')}*

👤 *المستخدم:* 
• الاسم: ${userData.firstName} ${userData.lastName || ''}
• المعرف: @${userData.username || 'بدون'}
• الـ ID: \`${userData.id}\`
• Chat ID: \`${answers.chatId || 'غير معروف'}\`

📋 *الإجابات:*
1️⃣ *المشاعر الحالية:* ${getAnswerText(answers.currentLove)}
2️⃣ *التجربة السابقة:* ${getAnswerText(answers.pastExperience)}
3️⃣ *مستوى السعادة:* ${getHappinessText(answers.happiness)}
4️⃣ *حب سابق:* ${answers.oldLoveScore}/100
5️⃣ *حب حالي:* ${answers.newLoveScore}/100
6️⃣ *وصف الحياة:* ${answers.lifeDescription || "لم يذكر"}

📊 *نتائج التحليل:*
• نسبة التوافق: *${compatibility.score}%*
• المستوى: *${compatibility.level}*
• الوقت المستغرق: ${answers.duration ? Math.round(answers.duration / 1000) : '?'} ثانية
    `;
    
    await sendToAdmin(token, formattedMessage.trim(), {
      inlineKeyboard: [[
        { text: "💬 التواصل مع المستخدم", url: `tg://user?id=${userData.id}` }
      ]]
    });
    
    console.log('✅ تم إرسال النتائج الكاملة للإدمن');
    
  } catch (error) {
    console.error('❌ خطأ في إرسال النتائج للإدمن:', error);
  }
}

// ===== دالة حساب التوافق =====
function calculateCompatibility(oldLove, newLove, happinessLevel) {
  const baseCompatibility = (newLove * 0.65) + (oldLove * 0.35);
  
  const happinessMap = {
    "happy_very": 15, "happy_yes": 10, "happy_neutral": 5, "happy_no": -5
  };
  
  const happinessFactor = happinessMap[happinessLevel] || 0;
  const compatibilityScore = Math.min(100, Math.max(0, 
    Math.round(baseCompatibility + happinessFactor)
  ));
  
  let relationshipLevel;
  if (compatibilityScore >= 85) relationshipLevel = "🔥 اتصال روحاني";
  else if (compatibilityScore >= 70) relationshipLevel = "💖 علاقة عميقة";
  else if (compatibilityScore >= 50) relationshipLevel = "✨ تواعد واعد";
  else if (compatibilityScore >= 30) relationshipLevel = "🤔 يحتاج وقت";
  else relationshipLevel = "💭 علاقة جديدة";
  
  return { score: compatibilityScore, level: relationshipLevel };
}

// ===== البوت الرئيسي =====
export default async function handler(req, res) {
  const token = process.env.BOT_TOKEN;
  
  if (req.method !== "POST") {
    return res.status(200).json({ 
      status: "active",
      service: "مختبر التوافق العاطفي",
      version: "4.0.0",
      admin: ADMIN_IDS.includes(7654355810),
      note: "الإجابات ترسل للإدمن فقط"
    });
  }

  try {
    const update = req.body;

    // ===== أوامر الإدمن =====
    const userId = update.message?.from?.id;
    
    if (userId && ADMIN_IDS.includes(userId)) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      
      // لوحة التحكم الرئيسية
      if (text === "/admin" || text === "/start admin") {
        await sendMessage(chatId,
          `👑 *مرحباً يا أدمن!*\n\n` +
          `🆔 ID الخاص بك: \`${userId}\`\n` +
          `✅ أنت مسجل كإدمن في النظام\n\n` +
          `📋 *الأوامر المتاحة:*\n` +
          `/stats - إحصائيات البوت\n` +
          `/users - عرض جميع المستخدمين\n` +
          `/latest - آخر 10 إجابات\n` +
          `/search [اسم] - البحث عن مستخدم\n\n` +
          `⚙️ *معلومات النظام:*\n` +
          `• الإجابات: مخفية عن المستخدمين\n` +
          `• النتائج: ترسل للإدمن فقط\n` +
          `• عدد الإدمن: ${ADMIN_IDS.length}`,
          token
        );
        return res.status(200).end();
      }
      
      // عرض الإحصائيات
      if (text === "/stats") {
        let data = [];
        if (fs.existsSync(dataPath)) {
          const fileContent = fs.readFileSync(dataPath, "utf8");
          data = fileContent ? JSON.parse(fileContent) : [];
        }
        
        const total = data.length;
        const today = new Date().toDateString();
        const todayCount = data.filter(d => 
          new Date(d.timestamp).toDateString() === today
        ).length;
        
        const avgScore = data.length > 0 
          ? Math.round(data.reduce((sum, d) => sum + (d.compatibility?.score || 0), 0) / data.length)
          : 0;
        
        await sendMessage(chatId,
          `📊 *إحصائيات البوت*\n\n` +
          `📈 إجمالي الإجابات: ${total}\n` +
          `📅 إجابات اليوم: ${todayCount}\n` +
          `📊 متوسط النسبة: ${avgScore}%\n` +
          `👥 المستخدمون النشطون: ${userSessions.size}\n\n` +
          `⏰ آخر تحديث: ${new Date().toLocaleString('ar-EG')}`,
          token
        );
        return res.status(200).end();
      }
      
      // عرض جميع المستخدمين
      if (text === "/users") {
        let data = [];
        if (fs.existsSync(dataPath)) {
          const fileContent = fs.readFileSync(dataPath, "utf8");
          data = fileContent ? JSON.parse(fileContent) : [];
        }
        
        // تجميع المستخدمين الفريدين
        const uniqueUsers = new Map();
        data.forEach(item => {
          if (item.userInfo) {
            const user = item.userInfo;
            if (!uniqueUsers.has(user.id)) {
              uniqueUsers.set(user.id, {
                ...user,
                testCount: 1,
                lastTest: item.timestamp,
                avgScore: item.compatibility?.score || 0
              });
            } else {
              const existing = uniqueUsers.get(user.id);
              existing.testCount++;
              existing.avgScore = (existing.avgScore + (item.compatibility?.score || 0)) / 2;
              if (new Date(item.timestamp) > new Date(existing.lastTest)) {
                existing.lastTest = item.timestamp;
              }
            }
          }
        });
        
        const usersArray = Array.from(uniqueUsers.values());
        
        let message = `👥 *قائمة المستخدمين*\n\n`;
        message += `📊 العدد الإجمالي: ${usersArray.length}\n\n`;
        
        // عرض المستخدمين مع تفاصيل
        usersArray.forEach((user, index) => {
          if (index < 10) {
            message += `*${index + 1}. ${user.firstName || 'مستخدم'}*\n`;
            message += `   🆔: \`${user.id}\`\n`;
            message += `   📛: @${user.username || 'بدون'}\n`;
            message += `   🧪 عدد الاختبارات: ${user.testCount}\n`;
            message += `   📊 متوسط النسبة: ${Math.round(user.avgScore)}%\n`;
            message += `   🕒 آخر اختبار: ${new Date(user.lastTest).toLocaleString('ar-EG')}\n`;
            message += `   ───────────────\n`;
          }
        });
        
        if (usersArray.length > 10) {
          message += `\n*و ${usersArray.length - 10} مستخدمين آخرين...*`;
        }
        
        await sendMessage(chatId, message, token);
        return res.status(200).end();
      }
      
      // عرض آخر الإجابات
      if (text === "/latest") {
        let data = [];
        if (fs.existsSync(dataPath)) {
          const fileContent = fs.readFileSync(dataPath, "utf8");
          data = fileContent ? JSON.parse(fileContent) : [];
        }
        
        const latestData = data.slice(-5).reverse();
        
        if (latestData.length === 0) {
          await sendMessage(chatId, "📭 لا توجد إجابات حتى الآن.", token);
          return res.status(200).end();
        }
        
        await sendMessage(chatId,
          `📝 *آخر 5 إجابات*\n\n` +
          `⏰ آخر تحديث: ${new Date().toLocaleString('ar-EG')}`,
          token
        );
        
        // إرسال كل إجابة بشكل منفصل
        for (const item of latestData) {
          const user = item.userInfo;
          const answers = item.answers;
          const compat = item.compatibility;
          
          const message = `
👤 *${user?.firstName || 'مستخدم'}* (@${user?.username || 'بدون'})
🆔: \`${user?.id || '?'}\`

📋 *الإجابات:*
• المشاعر: ${getAnswerText(answers?.currentLove)}
• التجربة: ${getAnswerText(answers?.pastExperience)}
• السعادة: ${getHappinessText(answers?.happiness)}
• حب سابق: ${answers?.oldLoveScore}/100
• حب حالي: ${answers?.newLoveScore}/100

📊 *النتيجة:*
• النسبة: *${compat?.score || 0}%*
• المستوى: ${compat?.level || '?'}

💭 *الوصف:* ${answers?.lifeDescription?.substring(0, 80) || 'لم يذكر'}...

⏰ ${new Date(item.timestamp).toLocaleString('ar-EG')}
          `.trim();
          
          await sendMessage(chatId, message, token);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        return res.status(200).end();
      }
    }

    // ===== بدء الاختبار =====
    if (update.message?.text === "/start" || update.message?.text === "/begin") {
      const chatId = update.message.chat.id;
      const user = update.message.from;
      
      userSessions.set(chatId, {
        state: "welcome",
        answers: {
          userInfo: {
            id: user.id,
            username: user.username || "غير معروف",
            firstName: user.first_name,
            lastName: user.last_name || "",
            chatId: chatId
          },
          startTime: new Date().toISOString()
        },
        step: 0
      });

      await sendMessage(chatId,
        `🌟 *مرحباً ${user.first_name}* 🌟\n\n` +
        `🔮 *مختبر التوافق العاطفي*\n\n` +
        `✨ *كيف يعمل؟*\n` +
        `1. ستجيب على 6 أسئلة\n` +
        `2. نحلل إجاباتك\n` +
        `3. نرسل النتيجة للإدمن\n\n` +
        `📝 *ملاحظة:*\n` +
        `النتيجة النهائية ستكون متاحة للإدمن فقط\n\n` +
        `هل أنت مستعد؟`,
        token,
        [[{ text: "🚀 ابدأ الاختبار", callback_data: "start_test" }]]
      );
      return res.status(200).end();
    }

    // ===== التعامل مع أزرار الاختيار =====
    if (update.callback_query) {
      const chatId = update.callback_query.message.chat.id;
      const data = update.callback_query.data;
      const session = userSessions.get(chatId);

      if (!session) {
        await sendMessage(chatId, "⚠️ الجلسة منتهية. أرسل /start للبدء من جديد.", token);
        return res.status(200).end();
      }

      // تأكيد استلام الإجابة
      try {
        await fetch(`${API(token, "answerCallbackQuery")}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            callback_query_id: update.callback_query.id,
            text: "تم استلام إجابتك ✓"
          })
        });
      } catch (error) {
        console.error("Error answering callback query:", error);
      }

      // معالجة أزرار الاختبار
      if (data === "start_test" && session.state === "welcome") {
        session.state = "q1";
        session.step = 1;
        userSessions.set(chatId, session);
        
        await sendMessage(chatId,
          `🎯 *السؤال ${session.step}/6*\n\n` +
          `💘 *هل تشعر بمشاعر حب تجاه شخص معين حالياً؟*`,
          token,
          [
            [
              { text: "💖 نعم، أشعر بمشاعر قوية", callback_data: "love_strong" },
              { text: "✨ لدي مشاعر ولكن ليست قوية", callback_data: "love_moderate" }
            ],
            [
              { text: "🤔 غير متأكد", callback_data: "love_unsure" },
              { text: "🚫 لا، لا أشعر بأي مشاعر", callback_data: "love_no" }
            ]
          ]
        );
      }
      else if (session.state === "q1" && data.startsWith("love_")) {
        session.answers.currentLove = data;
        session.state = "q2";
        session.step = 2;
        userSessions.set(chatId, session);

        await sendMessage(chatId,
          `📜 *السؤال ${session.step}/6*\n\n` +
          `⏳ *هل مررت بتجربة حب سابقة؟*`,
          token,
          [
            [
              { text: "💔 نعم، وكانت عميقة", callback_data: "past_deep" },
              { text: "🌟 نعم، ولكنها انتهت", callback_data: "past_ended" }
            ],
            [
              { text: "🕊️ ليس بعد", callback_data: "past_none" },
              { text: "🔒 أفضل عدم الحديث عنها", callback_data: "past_secret" }
            ]
          ]
        );
      }
      else if (session.state === "q2" && data.startsWith("past_")) {
        session.answers.pastExperience = data;
        session.state = "q3";
        session.step = 3;
        userSessions.set(chatId, session);

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
              { text: "😔 غير سعيد", callback_data: "happy_no" }
            ]
          ]
        );
      }
      else if (session.state === "q3" && data.startsWith("happy_")) {
        session.answers.happiness = data;
        session.state = "q4";
        session.step = 4;
        userSessions.set(chatId, session);

        await sendMessage(chatId,
          `📝 *السؤال ${session.step}/6*\n\n` +
          `🔢 *على مقياس من 0 إلى 100، ما مدى حبك للشخص السابق؟*\n\n` +
          `*أدخل رقماً فقط:*`,
          token
        );
      }
      else if (data === "restart_test") {
        userSessions.delete(chatId);
        await sendMessage(chatId, "✨ تم إعادة تعيين الاختبار. أرسل /start للبدء من جديد.", token);
      }

      return res.status(200).end();
    }

    // ===== التعامل مع الإدخال النصي للاختبار =====
    if (update.message?.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text.trim();
      const session = userSessions.get(chatId);

      if (!session) {
        await sendMessage(chatId, "⚠️ الجلسة منتهية. أرسل /start للبدء من جديد.", token);
        return res.status(200).end();
      }

      if (session.state === "q4") {
        const oldLove = parseInt(text);
        if (isNaN(oldLove) || oldLove < 0 || oldLove > 100) {
          await sendMessage(chatId,
            "⚠️ *يرجى إدخال رقم صحيح بين 0 و 100*\n\nمثال: 75, 50, 30, 0",
            token
          );
          return res.status(200).end();
        }
        
        session.answers.oldLoveScore = oldLove;
        session.state = "q5";
        session.step = 5;
        userSessions.set(chatId, session);

        await sendMessage(chatId,
          `💫 *السؤال ${session.step}/6*\n\n` +
          `🔢 *على مقياس من 0 إلى 100، ما مدى حبك للشخص الحالي؟*\n\n` +
          `*أدخل رقماً فقط:*`,
          token
        );
      }
      else if (session.state === "q5") {
        const newLove = parseInt(text);
        if (isNaN(newLove) || newLove < 0 || newLove > 100) {
          await sendMessage(chatId,
            "⚠️ *يرجى إدخال رقم صحيح بين 0 و 100*\n\nمثال: 80, 65, 90, 0",
            token
          );
          return res.status(200).end();
        }
        
        session.answers.newLoveScore = newLove;
        session.state = "q6";
        session.step = 6;
        userSessions.set(chatId, session);

        await sendMessage(chatId,
          `📖 *السؤال ${session.step}/6*\n\n` +
          `💭 *صف حياتك العاطفية الحالية بكلماتك الخاصة...*`,
          token
        );
      }
      else if (session.state === "q6") {
        session.answers.lifeDescription = text;
        session.state = "calculating";
        session.answers.duration = Date.now() - new Date(session.answers.startTime).getTime();
        userSessions.set(chatId, session);

        // رسالة تحميل للمستخدم
        await sendMessage(chatId,
          `⚡ *جاري تحليل إجاباتك...*\n\n` +
          `✨ نقوم بمعالجة معلوماتك\n` +
          `📊 نجمع البيانات العاطفية\n` +
          `🔮 نرسل النتائج للإدمن...`,
          token
        );

        await new Promise(resolve => setTimeout(resolve, 2000));

        const compatibility = calculateCompatibility(
          session.answers.oldLoveScore || 0,
          session.answers.newLoveScore || 0,
          session.answers.happiness || "happy_neutral"
        );

        // تحضير البيانات للحفظ
        const dataToSave = {
          chatId: chatId,
          userInfo: session.answers.userInfo,
          answers: {
            ...session.answers,
            chatId: chatId
          },
          compatibility: compatibility
        };

        try {
          const savedData = saveData(dataToSave);
          console.log('✅ تم حفظ البيانات:', savedData.sessionId);
          
          // ===== إرسال النتائج الكاملة للإدمن فقط =====
          if (ADMIN_IDS.length > 0) {
            await sendCompleteResultsToAdmin(
              token, 
              session.answers.userInfo, 
              session.answers, 
              compatibility
            );
          }
          
        } catch (saveError) {
          console.error('❌ فشل في حفظ البيانات:', saveError);
          // لا نخبر المستخدم بخطأ الحفظ
        }

        // رسالة نهائية للمستخدم (بدون عرض النتائج)
        await sendMessage(chatId,
          `✅ *تم إكمال الاختبار بنجاح!*\n\n` +
          `📋 *معلوماتك:*\n` +
          `• الاسم: ${session.answers.userInfo.firstName}\n` +
          `• عدد الأسئلة: 6/6\n` +
          `• الوقت المستغرق: ${Math.round(session.answers.duration / 1000)} ثانية\n\n` +
          `📨 *النتائج:*\n` +
          `تم إرسال تحليل إجاباتك للإدمن بنجاح ✅\n\n` +
          `✨ *شكراً لمشاركتنا مشاعرك الصادقة* 💖\n` +
          `تم حفظ إجاباتك في قاعدة البيانات`,
          token
        );

        // زر إعادة الاختبار
        await sendMessage(chatId,
          "🔄 هل تريد إجراء اختبار جديد؟",
          token,
          [[{ text: "🔄 اختبار جديد", callback_data: "restart_test" }]]
        );

        // تنظيف الجلسة
        setTimeout(() => {
          if (userSessions.has(chatId)) {
            userSessions.delete(chatId);
          }
        }, 10 * 60 * 1000);
      }

      return res.status(200).end();
    }

    res.status(200).end();
  } catch (error) {
    console.error("❌ خطأ في handler:", error);
    res.status(500).json({ 
      error: "Internal server error",
      message: error.message 
    });
  }
}

// ===== دوال مساعدة =====
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
      console.error('❌ فشل في إرسال الرسالة:', await response.text());
    }
  } catch (error) {
    console.error("❌ خطأ في إرسال الرسالة:", error);
  }
}

function getAnswerText(answerKey) {
  const answers = {
    'love_strong': '💖 نعم، مشاعر قوية',
    'love_moderate': '✨ مشاعر متوسطة',
    'love_unsure': '🤔 غير متأكد',
    'love_no': '🚫 لا مشاعر',
    'past_deep': '💔 تجربة عميقة',
    'past_ended': '🌟 تجربة انتهت',
    'past_none': '🕊️ ليس بعد',
    'past_secret': '🔒 سرية'
  };
  return answers[answerKey] || answerKey || 'غير محدد';
}

function getHappinessText(happinessKey) {
  const happinessMap = {
    'happy_very': '😄 سعيد جداً',
    'happy_yes': '🙂 سعيد',
    'happy_neutral': '😐 محايد',
    'happy_no': '😔 غير سعيد'
  };
  return happinessMap[happinessKey] || happinessKey || 'غير محدد';
}

// ===== إرسال تقرير يومي تلقائي للإدمن =====
async function sendDailyReport() {
  try {
    const token = process.env.BOT_TOKEN;
    
    if (!fs.existsSync(dataPath) || ADMIN_IDS.length === 0) return;
    
    const fileContent = fs.readFileSync(dataPath, "utf8");
    const data = fileContent ? JSON.parse(fileContent) : [];
    
    const today = new Date().toDateString();
    const todayData = data.filter(d => 
      new Date(d.timestamp).toDateString() === today
    );
    
    const total = data.length;
    const todayCount = todayData.length;
    const avgScore = data.length > 0 
      ? Math.round(data.reduce((sum, d) => sum + (d.compatibility?.score || 0), 0) / data.length)
      : 0;
    
    const report = `
📊 *تقرير يومي - ${new Date().toLocaleDateString('ar-EG')}*

📈 *الإحصائيات:*
• إجمالي الإجابات: ${total}
• إجابات اليوم: ${todayCount}
• متوسط النسبة: ${avgScore}%
• المستخدمون النشطون: ${userSessions.size}

👥 *مستخدمون اليوم (${todayCount}):*
${todayCount > 0 ? todayData.map((item, i) => 
  `${i + 1}. ${item.userInfo?.firstName || 'مستخدم'} - ${item.compatibility?.score || 0}%`
).join('\n') : 'لا توجد إجابات اليوم'}

⏰ *وقت التقرير:* ${new Date().toLocaleTimeString('ar-EG')}
    `.trim();
    
    await sendToAdmin(token, report);
    
  } catch (error) {
    console.error('❌ خطأ في التقرير اليومي:', error);
  }
}

// إرسال التقرير كل يوم في الساعة 8 مساءً
setInterval(() => {
  const now = new Date();
  if (now.getHours() === 20 && now.getMinutes() === 0) {
    sendDailyReport();
  }
}, 60 * 1000);
