import fs from "fs";
import path from "path";

const API = (token, method) =>
  `https://api.telegram.org/bot${token}/${method}`;

const userSessions = new Map();

const dataPath = path.join(process.cwd(), "data/responses.json");

// ===== دالة محسنة لحفظ البيانات مع تتبع =====
function saveData(entry) {
  try {
    console.log('🎯 بدء حفظ البيانات للمستخدم:', entry.chatId);
    
    // التأكد من وجود مجلد data
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      console.log('📁 إنشاء مجلد data...');
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // قراءة البيانات الحالية
    let data = [];
    if (fs.existsSync(dataPath)) {
      try {
        const fileContent = fs.readFileSync(dataPath, "utf8");
        if (fileContent.trim()) {
          data = JSON.parse(fileContent);
          console.log('📖 تم قراءة', data.length, 'سجل');
        }
      } catch (parseError) {
        console.error('❌ خطأ في قراءة الملف:', parseError);
        // إنشاء ملف جديد إذا كان تالفاً
        data = [];
      }
    } else {
      console.log('📄 إنشاء ملف جديد');
    }
    
    // إضافة البيانات الجديدة
    const enhancedEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      sessionId: Date.now(),
      savedAt: new Date().toLocaleString('ar-EG')
    };
    
    data.push(enhancedEntry);
    
    // حفظ البيانات
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    console.log('✅ تم حفظ البيانات للمستخدم:', entry.chatId);
    console.log('📊 إجمالي السجلات:', data.length);
    console.log('📍 مسار الملف:', dataPath);
    
    // إنشاء نسخة احتياطية
    try {
      const backupDir = path.join(dataDir, "backup");
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const backupPath = path.join(backupDir, `responses_${Date.now()}.json`);
      fs.writeFileSync(backupPath, JSON.stringify(enhancedEntry, null, 2));
      console.log('💾 تم إنشاء نسخة احتياطية');
    } catch (backupError) {
      console.error('⚠️ خطأ في النسخ الاحتياطي:', backupError);
    }
    
    return enhancedEntry;
    
  } catch (error) {
    console.error('❌ خطأ في حفظ البيانات:', error);
    console.error('📌 تفاصيل الخطأ:', error.message);
    throw error;
  }
}

// ===== دالة حساب التوافق العاطفي =====
function calculateCompatibility(oldLove, newLove, happinessLevel) {
  // خوارزمية محسنة تأخذ بعين الاعتبار عوامل متعددة
  const baseCompatibility = (newLove * 0.65) + (oldLove * 0.35);
  
  let happinessFactor = 0;
  const happinessMap = {
    "happy_very": 15,
    "happy_yes": 10,
    "happy_neutral": 5,
    "happy_no": -5
  };
  
  happinessFactor = happinessMap[happinessLevel] || 0;
  
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
      service: "مختبر التوافق العاطفي",
      version: "2.1.0",
      message: "استخدم POST للتفاعل مع البوت"
    });
  }

  try {
    const update = req.body;
    console.log('📥 تحديث جديد:', update.update_id);

    // ===== أمر اختبار الحفظ =====
    if (update.message?.text === "/test") {
      const chatId = update.message.chat.id;
      const user = update.message.from;
      
      console.log('🧪 اختبار حفظ البيانات للمستخدم:', user.id);
      
      // بيانات اختبارية
      const testData = {
        chatId: chatId,
        userInfo: {
          id: user.id,
          username: user.username || "غير معروف",
          firstName: user.first_name || "مستخدم",
          lastName: user.last_name || ""
        },
        answers: {
          test: true,
          message: "هذا اختبار لحفظ البيانات"
        },
        compatibility: {
          score: 75,
          level: "✨ اختبار"
        }
      };
      
      try {
        const savedData = saveData(testData);
        await sendMessage(chatId, 
          `✅ *تم اختبار الحفظ بنجاح!*\n\n` +
          `📊 تم حفظ البيانات في النظام\n` +
          `🆔 رقم الجلسة: ${savedData.sessionId}\n` +
          `📅 الوقت: ${savedData.savedAt}\n\n` +
          `🔍 يمكنك التحقق من البيانات عبر:\n` +
          `/dashboard أو /stats`,
          token
        );
      } catch (error) {
        await sendMessage(chatId, 
          `❌ *خطأ في اختبار الحفظ*\n\n` +
          `الخطأ: ${error.message}\n` +
          `تفاصيل: ${error.toString()}`,
          token
        );
      }
      
      return res.status(200).end();
    }

    // ===== أمر عرض الإحصائيات =====
    if (update.message?.text === "/stats" || update.message?.text === "/dashboard") {
      const chatId = update.message.chat.id;
      
      try {
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
          `📍 مسار البيانات: ${dataPath}\n` +
          `📂 حجم الملف: ${fs.existsSync(dataPath) ? Math.round(fs.statSync(dataPath).size / 1024) : 0} KB`,
          token
        );
        
      } catch (error) {
        await sendMessage(chatId,
          `❌ *خطأ في تحميل الإحصائيات*\n\n` +
          `الخطأ: ${error.message}`,
          token
        );
      }
      
      return res.status(200).end();
    }

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

      console.log('🚀 بدء جلسة جديدة للمستخدم:', user.id, 'Chat ID:', chatId);

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

      console.log('🔘 ضغط زر:', data, 'للمستخدم:', chatId, 'الحالة:', session?.state);

      if (!session) {
        await sendMessage(chatId, "⚠️ الجلسة منتهية. أرسل /start للبدء من جديد.", token);
        return res.status(200).end();
      }

      // تأكيد استلام الإجابة أولاً
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
      // معالجة إجابة السؤال الثالث (مستوى السعادة)
      else if (session.state === "q3" && data.startsWith("happy_")) {
        session.answers.happiness = data;
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
      // معالجة إعادة الاختبار
      else if (data === "restart_test") {
        userSessions.delete(chatId);
        await sendMessage(chatId, "✨ تم إعادة تعيين الاختبار. أرسل /start للبدء من جديد.", token);
      }
      // إذا كانت بيانات غير معروفة
      else {
        console.log("Unknown callback data:", data, "for state:", session.state);
      }

      return res.status(200).end();
    }

    // ===== التعامل مع الإدخال النصي =====
    if (update.message?.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text.trim();
      const session = userSessions.get(chatId);

      console.log('📝 إدخال نصي:', text, 'للمستخدم:', chatId, 'الحالة:', session?.state);

      if (!session) {
        await sendMessage(chatId, "⚠️ الجلسة منتهية. أرسل /start للبدء من جديد.", token);
        return res.status(200).end();
      }

      // معالجة إجابة السؤال الرابع (نسبة الحب السابق)
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
        const dataToSave = {
          chatId: chatId,
          userInfo: session.answers.userInfo,
          answers: {
            currentLove: session.answers.currentLove,
            pastExperience: session.answers.pastExperience,
            happiness: session.answers.happiness,
            oldLoveScore: session.answers.oldLoveScore,
            newLoveScore: session.answers.newLoveScore,
            lifeDescription: session.answers.lifeDescription
          },
          compatibility: compatibility,
          duration: Date.now() - new Date(session.answers.startTime).getTime()
        };

        console.log('📝 بيانات للحفظ:', dataToSave);
        
        try {
          // حفظ البيانات مع تتبع
          const savedData = saveData(dataToSave);
          console.log('🎉 تمت العملية بنجاح:', savedData);
        } catch (saveError) {
          console.error('💥 فشل في الحفظ:', saveError);
          await sendMessage(chatId, 
            "⚠️ حدث خطأ في حفظ النتائج، لكن الاختبار مكتمل.\n" +
            "تفاصيل الخطأ: " + saveError.message, 
            token
          );
        }

        // الحصول على نص السعادة
        const happinessText = getHappinessText(session.answers.happiness);

        // إرسال النتائج
        await sendMessage(chatId,
          `🎊 *تم تحليل بياناتك بنجاح!*\n\n` +
          `📈 *نتيجة التوافق العاطفي*\n` +
          `🔢 النسبة: *${compatibility.score}%*\n` +
          `🏆 المستوى: *${compatibility.level}*\n\n` +
          `📊 *تحليل المشاعر*\n` +
          `💫 الحب الحالي: ${session.answers.newLoveScore || 0}/100\n` +
          `🕰️ الحب السابق: ${session.answers.oldLoveScore || 0}/100\n` +
          `😊 مستوى السعادة: ${happinessText}\n` +
          `💭 وصفك: ${session.answers.lifeDescription || "غير محدد"}\n\n` +
          `💬 *ملاحظاتنا*\n` +
          `${generateInsights(compatibility.score, session.answers)}\n\n` +
          `✨ *نصيحة أخيرة*\n` +
          `الحب رحلة وليس وجهة، استمتع بكل لحظة وتعلم من كل تجربة.\n\n` +
          `🔐 *بياناتك محفوظة بشكل آمن*\n` +
          `📊 يمكنك رؤية إحصائيات البوت عبر /stats\n` +
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
          if (userSessions.has(chatId)) {
            userSessions.delete(chatId);
            console.log('🗑️ تم تنظيف جلسة المستخدم:', chatId);
          }
        }, 10 * 60 * 1000);
      }
      // معالجة أي نص آخر (ليس جزءاً من الاختبار)
      else if (session.state && session.state !== "welcome") {
        await sendMessage(chatId, 
          `⚠️ يرجى الإجابة على السؤال الحالي (السؤال ${session.step}/6).\n\n` +
          `إذا أردت إلغاء الاختبار، أرسل /start من جديد.`,
          token
        );
      }

      return res.status(200).end();
    }

    res.status(200).end();
  } catch (error) {
    console.error("❌ خطأ في handler:", error);
    res.status(500).json({ 
      error: "Internal server error",
      message: error.message,
      stack: error.stack 
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

    console.log('📤 إرسال رسالة إلى:', chatId);
    
    const response = await fetch(`${API(token, "sendMessage")}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ فشل في إرسال الرسالة:', response.status, errorText);
    } else {
      console.log('✅ تم إرسال الرسالة بنجاح إلى:', chatId);
    }
  } catch (error) {
    console.error("❌ خطأ في إرسال الرسالة:", error);
  }
}

function getHappinessText(happinessKey) {
  const happinessMap = {
    "happy_very": "😄 سعيد جداً",
    "happy_yes": "🙂 سعيد",
    "happy_neutral": "😐 محايد",
    "happy_no": "😔 غير سعيد"
  };
  return happinessMap[happinessKey] || happinessKey || "غير محدد";
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
  let cleaned = 0;
  
  for (const [chatId, session] of userSessions.entries()) {
    const sessionAge = now - new Date(session.answers.startTime).getTime();
    if (sessionAge > 30 * 60 * 1000) { // 30 دقيقة
      userSessions.delete(chatId);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`🧹 تم تنظيف ${cleaned} جلسة منتهية`);
  }
}, 10 * 60 * 1000); // كل 10 دقائق

// ===== عند بدء التشغيل =====
console.log('🚀 بدء تشغيل بوت التوافق العاطفي...');
console.log('📍 مسار بيانات:', dataPath);

// التحقق من وجود مجلد data
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  console.log('📁 إنشاء مجلد data...');
  fs.mkdirSync(dataDir, { recursive: true });
}

// التحقق من وجود ملف responses.json
if (!fs.existsSync(dataPath)) {
  console.log('📄 إنشاء ملف responses.json جديد...');
  fs.writeFileSync(dataPath, JSON.stringify([], null, 2));
  console.log('✅ تم إنشاء الملف بنجاح');
} else {
  try {
    const fileContent = fs.readFileSync(dataPath, "utf8");
    const data = fileContent ? JSON.parse(fileContent) : [];
    console.log(`📊 تم تحميل ${data.length} سجل من قاعدة البيانات`);
  } catch (error) {
    console.error('❌ خطأ في قراءة الملف:', error.message);
    // إعادة إنشاء الملف إذا كان تالفاً
    fs.writeFileSync(dataPath, JSON.stringify([], null, 2));
    console.log('🔄 تم إعادة إنشاء الملف');
  }
}
