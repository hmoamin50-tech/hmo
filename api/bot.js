import fs from "fs";
import path from "path";

const API = (token, method) =>
  `https://api.telegram.org/bot${token}/${method}`;

const userSessions = new Map();

const dataPath = path.join(process.cwd(), "data/responses.json");

// ===== دالة لحفظ البيانات بشكل آمن =====
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
      sessionId: Date.now()
    };
    
    data.push(enhancedEntry);
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    
    // إنشاء نسخة احتياطية
    const backupDir = path.join(process.cwd(), "data/backup");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const backupPath = path.join(backupDir, `responses_${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(enhancedEntry, null, 2));
    
  } catch (error) {
    console.error("Error saving data:", error);
  }
}

// ===== دالة حساب التوافق العاطفي =====
function calculateCompatibility(oldLove, newLove, happinessLevel) {
  // خوارزمية محسنة تأخذ بعين الاعتبار عوامل متعددة
  const baseCompatibility = (newLove * 0.65) + (oldLove * 0.35);
  
  let happinessFactor = 0;
  if (happinessLevel === "happy_very") happinessFactor = 15;
  else if (happinessLevel === "happy_yes") happinessFactor = 10;
  else if (happinessLevel === "happy_neutral") happinessFactor = 5;
  else if (happinessLevel === "happy_no") happinessFactor = -5;
  
  const compatibilityScore = Math.min(100, Math.max(0, 
    Math.round(baseCompatibility + happinessFactor)
  ));
  
  // تحديد مستوى العلاقة
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
  
  // للتحقق من أن الخادم يعمل
  if (req.method !== "POST") {
    return res.status(200).json({ 
      status: "active",
      service: "Love Compatibility Bot",
      version: "2.0.0" 
    });
  }

  try {
    const update = req.body;

    // ===== بدء الاختبار =====
    if (update.message?.text === "/start" || update.message?.text === "/begin") {
      const chatId = update.message.chat.id;
      const user = update.message.from;
      
      // تهيئة جلسة المستخدم
      userSessions.set(chatId, {
        state: "welcome",
        answers: {
          userInfo: {
            id: user.id,
            username: user.username || "غير معروف",
            firstName: user.first_name,
            lastName: user.last_name || ""
          },
          startTime: new Date().toISOString()
        },
        step: 0
      });

      await sendMessage(chatId,
        `🌟 *مرحباً ${user.first_name}* 🌟

🔮 *مختبر التوافق العاطفي*

أنا هنا لمساعدتك في فهم مشاعرك بشكل أعمق وتقييم توافقك العاطفي.

📊 *ماذا سنقوم به؟*
• تحليل المشاعر الحالية والسابقة
• تقييم مستوى السعادة
• حساب نسبة التوافق

هل أنت مستعد لبدء الرحلة؟`,
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

      // معالجة اختيار البدء من واجهة الترحيب
      if (data === "start_test" && session.state === "welcome") {
        session.state = "q1";
        session.step = 1;
        userSessions.set(chatId, session);
        
        await sendMessage(chatId,
          `🎯 *السؤال ${session.step}/6*
          
💘 *هل تشعر بمشاعر حب تجاه شخص معين حالياً؟*

هذا السؤال يساعدنا في فهم حالتك العاطفية الحالية.`,
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
      // معالجة إجابة السؤال الأول
      else if (session.state === "q1" && data.startsWith("love_")) {
        session.answers.currentLove = data;
        session.state = "q2";
        session.step = 2;
        userSessions.set(chatId, session);

        await sendMessage(chatId,
          `📜 *السؤال ${session.step}/6*
          
⏳ *هل مررت بتجربة حب سابقة؟*

التجارب السابقة تساعد في تشكيل منظورنا الحالي للعلاقات.`,
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
      // معالجة إجابة السؤال الثاني
      else if (session.state === "q2" && data.startsWith("past_")) {
        session.answers.pastExperience = data;
        session.state = "q3";
        session.step = 3;
        userSessions.set(chatId, session);

        await sendMessage(chatId,
          `😊 *السؤال ${session.step}/6*
          
🌈 *كيف تصف مستوى سعادتك الحالي؟*

مستوى السعادة يؤثر بشكل كبير على نظرتنا للحياة والعلاقات.`,
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
      // معالجة إعادة الاختبار
      else if (data === "restart_test") {
        userSessions.delete(chatId);
        await sendMessage(chatId, "✨ تم إعادة تعيين الاختبار. أرسل /start للبدء من جديد.", token);
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

      return res.status(200).end();
    }

    // ===== التعامل مع الإدخال النصي =====
    if (update.message?.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text.trim();
      const session = userSessions.get(chatId);

      if (!session) {
        await sendMessage(chatId, "⚠️ الجلسة منتهية. أرسل /start للبدء من جديد.", token);
        return res.status(200).end();
      }

      // معالجة إجابة السؤال الثالث (النصي)
      if (session.state === "q3") {
        // في النسخة السابقة كان هذا يحول إلى رقم، دعنا نجعله نصياً أولاً
        session.answers.happinessDescription = text;
        session.state = "q4";
        session.step = 4;
        userSessions.set(chatId, session);

        await sendMessage(chatId,
          `📝 *السؤال ${session.step}/6*
          
🔢 *على مقياس من 0 إلى 100، ما مدى حبك للشخص السابق؟*

(0 = لا يوجد أي مشاعر، 100 = حب عميق لا ينسى)

*ملاحظة:* إذا لم يكن لديك تجربة سابقة، اكتب 0`,
          token
        );
      }
      // معالجة إجابة السؤال الرابع (نسبة الحب السابق)
      else if (session.state === "q4") {
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
          `💫 *السؤال ${session.step}/6*
          
🔢 *على مقياس من 0 إلى 100، ما مدى حبك للشخص الحالي؟*

(0 = لا توجد مشاعر، 100 = أعمق مشاعر الحب)

*ملاحظة:* إذا لم يكن لديك شخص حالي، اكتب 0`,
          token
        );
      }
      // معالجة إجابة السؤال الخامس (نسبة الحب الحالي)
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
          `📖 *السؤال ${session.step}/6*
          
💭 *صف حياتك العاطفية الحالية بكلماتك الخاصة...*

شاركنا بمشاعرك الحقيقية. كل كلمة لها معنى.`,
          token
        );
      }
      // معالجة الإجابة النهائية
      else if (session.state === "q6") {
        session.answers.lifeDescription = text;
        session.state = "calculating";
        userSessions.set(chatId, session);

        // إرسال رسالة تحميل
        await sendMessage(chatId,
          `⚡ *جاري تحليل إجاباتك...*\n\n` +
          `✨ نقوم بحساب التوافق العاطفي\n` +
          `📊 نجمع البيانات العاطفية\n` +
          `🔮 نرسم خريطة المشاعر...\n\n` +
          `_قد يستغرق هذا بضع ثوانٍ..._`,
          token
        );

        // محاكاة وقت التحليل (2 ثانية)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // حساب النتائج
        const compatibility = calculateCompatibility(
          session.answers.oldLoveScore || 0,
          session.answers.newLoveScore || 0,
          session.answers.happiness || "happy_neutral"
        );

        // تحضير البيانات للحفظ
        const finalData = {
          ...session.answers,
          compatibility,
          endTime: new Date().toISOString(),
          duration: Date.now() - new Date(session.answers.startTime).getTime()
        };

        // حفظ البيانات
        saveData(finalData);

        // إرسال النتائج
        await sendMessage(chatId,
          `🎊 *تم تحليل بياناتك بنجاح!*\n\n` +
          `📈 *نتيجة التوافق العاطفي*\n` +
          `🔢 النسبة: *${compatibility.score}%*\n` +
          `🏆 المستوى: *${compatibility.level}*\n\n` +
          `📊 *تحليل المشاعر*\n` +
          `💫 الحب الحالي: ${session.answers.newLoveScore || 0}/100\n` +
          `🕰️ الحب السابق: ${session.answers.oldLoveScore || 0}/100\n` +
          `😊 الإجابة: ${session.answers.happinessDescription || "غير محددة"}\n\n` +
          `💬 *ملاحظاتنا*\n` +
          `${generateInsights(compatibility.score, session.answers)}\n\n` +
          `✨ *نصيحة أخيرة*\n` +
          `الحب رحلة وليس وجهة، استمتع بكل لحظة وتعلم من كل تجربة.\n\n` +
          `🔐 *بياناتك محفوظة بشكل آمن*\n` +
          `شكراً لمشاركتنا مشاعرك الصادقة 💖`,
          token
        );

        // إرسال زر إعادة الاختبار
        await sendMessage(chatId,
          "🔄 هل تريد إجراء اختبار جديد؟",
          token,
          [[{ text: "🔄 اختبار جديد", callback_data: "restart_test" }]]
        );

        // حذف الجلسة بعد 10 دقائق
        setTimeout(() => {
          userSessions.delete(chatId);
        }, 10 * 60 * 1000);
      }
      // معالجة أي نص آخر (ليس جزءاً من الاختبار)
      else if (session.state && session.state !== "welcome") {
        await sendMessage(chatId, 
          "⚠️ يرجى الإجابة على السؤال الحالي. إذا أردت إلغاء الاختبار، أرسل /start من جديد.",
          token
        );
      }

      return res.status(200).end();
    }

    res.status(200).end();
  } catch (error) {
    console.error("Error in handler:", error);
    res.status(500).json({ error: "Internal server error" });
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
      console.error("Failed to send message:", await response.text());
    }
  } catch (error) {
    console.error("Error sending message:", error);
  }
}

function generateInsights(score, answers) {
  if (score >= 85) return "• لديك قلب قادر على الحب العميق\n• مشاعرك متوازنة وجميلة\n• أنت على الطريق الصحيح للعلاقة الصحية";
  if (score >= 70) return "• تمتلك مشاعر صادقة\n• تحتاج بعض الوقت لتنمية العلاقة\n• ثقتك بنفسك جيدة";
  if (score >= 50) return "• في مرحلة بناء المشاعر\n• خذ وقتك في التعرف على شريكك\n• التركيز على التواصل المفتوح";
  if (score >= 30) return "• بداية العلاقة تحتاج صبراً\n• تعلم من التجارب السابقة\n• لا تستعجل في الأحكام";
  return "• وقتك للحب لم يحن بعد\n• ركز على تطوير ذاتك\n• الحب سيأتي في وقته المناسب";
}

// ===== تنظيف الجلسات القديمة تلقائياً =====
setInterval(() => {
  const now = Date.now();
  for (const [chatId, session] of userSessions.entries()) {
    const sessionAge = now - new Date(session.answers.startTime).getTime();
    if (sessionAge > 30 * 60 * 1000) { // 30 دقيقة
      userSessions.delete(chatId);
    }
  }
}, 10 * 60 * 1000); // كل 10 دقائق
