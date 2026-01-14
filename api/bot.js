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
(function initDataFolder() {
  try {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('📁 تم إنشاء مجلد data');
    }
    
    // إنشاء ملف إذا لم يكن موجوداً
    if (!fs.existsSync(dataPath)) {
      fs.writeFileSync(dataPath, JSON.stringify([], null, 2));
      console.log('📄 تم إنشاء ملف responses.json');
    }
  } catch (error) {
    console.error('❌ خطأ في تهيئة المجلد:', error);
  }
})();

// ===== دالة محسنة لحفظ البيانات مع تتبع =====
function saveData(entry) {
  try {
    console.log('💾 محاولة حفظ البيانات...');
    console.log('📝 البيانات:', JSON.stringify(entry, null, 2));
    
    // قراءة البيانات الحالية
    let data = [];
    if (fs.existsSync(dataPath)) {
      try {
        const fileContent = fs.readFileSync(dataPath, "utf8");
        console.log('📖 محتوى الملف:', fileContent.substring(0, 200));
        
        if (fileContent.trim()) {
          data = JSON.parse(fileContent);
          console.log(`✅ تم تحميل ${data.length} سجلات`);
        } else {
          console.log('📭 الملف فارغ، سيتم إنشاء بيانات جديدة');
        }
      } catch (parseError) {
        console.error('❌ خطأ في تحليل JSON:', parseError);
        // إذا كان الملف تالفاً، نبدأ من جديد
        data = [];
      }
    } else {
      console.log('📄 الملف غير موجود، سيتم إنشاؤه');
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
    console.log('✅ تم حفظ البيانات بنجاح');
    console.log('📊 إجمالي السجلات:', data.length);
    console.log('📍 المسار:', dataPath);
    
    // التحقق من أن الملف موجود ومحتواه
    if (fs.existsSync(dataPath)) {
      const checkContent = fs.readFileSync(dataPath, "utf8");
      console.log('🔍 حجم الملف بعد الحفظ:', checkContent.length, 'حرف');
    }
    
    return enhancedEntry;
    
  } catch (error) {
    console.error('❌ خطأ فادح في حفظ البيانات:', error);
    console.error('📌 تفاصيل الخطأ:', error.message);
    console.error('📌 المسار:', dataPath);
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
🎯 *نتيجة اختبار جديدة* - ${new Date().toLocaleString('ar-EG')}

👤 *المستخدم:* 
✨ الاسم: ${userData.firstName} ${userData.lastName || ''}
✨ المعرف: @${userData.username || 'بدون'}
✨ الـ ID: \`${userData.id}\`
✨ Chat ID: \`${answers.chatId || 'غير معروف'}\`

🌸 *الإجابات:*
1️⃣ *المشاعر الحالية:* ${getAnswerText(answers.currentLove)}
2️⃣ *التجربة السابقة:* ${getAnswerText(answers.pastExperience)}
3️⃣ *مستوى السعادة:* ${getHappinessText(answers.happiness)}
4️⃣ *حب سابق:* ${answers.oldLoveScore}/100
5️⃣ *حب حالي:* ${answers.newLoveScore}/100
6️⃣ *وصف الحياة:* ${answers.lifeDescription || "لم يذكر"}

💫 *نتائج التحليل:*
✨ نسبة التوافق: *${compatibility.score}%*
✨ المستوى: *${compatibility.level}*
✨ الوقت المستغرق: ${answers.duration ? Math.round(answers.duration / 1000) : '؟'} ثانية

${getLoveMessage(compatibility.score)}
    `;
    
    await sendToAdmin(token, formattedMessage.trim(), {
      inlineKeyboard: [[
        { text: "💌 التواصل مع المستخدم", url: `tg://user?id=${userData.id}` },
        { text: "📊 تفاصيل أكثر", callback_data: `admin_detail_${userData.id}` }
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
  if (compatibilityScore >= 85) relationshipLevel = "💖 اتصال روحاني عميق";
  else if (compatibilityScore >= 70) relationshipLevel = "✨ علاقة واعدة وجميلة";
  else if (compatibilityScore >= 50) relationshipLevel = "🌷 بداية جميلة تحتاج صبراً";
  else if (compatibilityScore >= 30) relationshipLevel = "🌱 تحتاج وقتاً ورعاية";
  else relationshipLevel = "🌸 رحلة البحث عن الحب مستمرة";
  
  return { score: compatibilityScore, level: relationshipLevel };
}

// ===== البوت الرئيسي =====
export default async function handler(req, res) {
  const token = process.env.BOT_TOKEN;
  
  if (req.method !== "POST") {
    return res.status(200).json({ 
      status: "active",
      service: "🌸 مختبر التوافق العاطفي",
      version: "5.0.0",
      admin: ADMIN_IDS.includes(7654355810),
      note: "لعبة جميلة للتعبير عن المشاعر"
    });
  }

  try {
    const update = req.body;
    console.log('📥 تحديث وارد:', update.update_id);

    // ===== أوامر الإدمن =====
    const userId = update.message?.from?.id;
    
    if (userId && ADMIN_IDS.includes(userId)) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      
      // لوحة التحكم الرئيسية
      if (text === "/admin") {
        await sendMessage(chatId,
          `🌸 *مرحباً يا أدمن الجميل!*\n\n` +
          `🆔 ID الخاص بك: \`${userId}\`\n` +
          `✨ أنت المسؤول عن هذه اللعبة الجميلة\n\n` +
          `📋 *الأوامر المتاحة:*\n` +
          `/stats - إحصائيات اللعبة\n` +
          `/users - عرض قلوب المستخدمين\n` +
          `/latest - آخر المشاعر المسجلة\n` +
          `/testdata - اختبار حفظ البيانات\n\n` +
          `💝 *معلومات النظام:*\n` +
          `• هذه لعبة للتعبير عن المشاعر\n` +
          `• البيانات تصل لك فقط\n` +
          `• كل قلب له قصته الخاصة`,
          token
        );
        return res.status(200).end();
      }
      
      // عرض الإحصائيات
      if (text === "/stats") {
        try {
          let data = [];
          if (fs.existsSync(dataPath)) {
            const fileContent = fs.readFileSync(dataPath, "utf8");
            console.log('🔍 محتوى الملف للإحصائيات:', fileContent.length, 'حرف');
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
            `🌸 *إحصائيات اللعبة الجميلة*\n\n` +
            `💖 إجمالي المشاعر المسجلة: ${total}\n` +
            `🌅 مشاعر اليوم: ${todayCount}\n` +
            `✨ متوسط النسبة: ${avgScore}%\n` +
            `👥 القلوب النابضة الآن: ${userSessions.size}\n\n` +
            `⏰ آخر تحديث: ${new Date().toLocaleString('ar-EG')}\n\n` +
            `${getRandomHeartMessage()}`,
            token
          );
        } catch (error) {
          await sendMessage(chatId,
            `❌ *خطأ في قراءة البيانات*\n\n` +
            `الخطأ: ${error.message}\n` +
            `📍 المسار: ${dataPath}\n` +
            `📁 الملف موجود: ${fs.existsSync(dataPath) ? '✅ نعم' : '❌ لا'}`,
            token
          );
        }
        return res.status(200).end();
      }
      
      // اختبار حفظ البيانات
      if (text === "/testdata") {
        try {
          const testEntry = {
            chatId: chatId,
            userInfo: {
              id: userId,
              username: "admin_test",
              firstName: "أدمن",
              lastName: "الاختبار"
            },
            answers: {
              currentLove: "love_strong",
              pastExperience: "past_deep",
              happiness: "happy_very",
              oldLoveScore: 90,
              newLoveScore: 95,
              lifeDescription: "هذا اختبار لحفظ البيانات"
            },
            compatibility: {
              score: 92,
              level: "💖 اتصال روحاني عميق"
            }
          };
          
          const savedData = saveData(testEntry);
          
          await sendMessage(chatId,
            `✅ *اختبار الحفظ ناجح!*\n\n` +
            `📊 تم حفظ بيانات الاختبار بنجاح\n` +
            `🆔 رقم الجلسة: ${savedData.sessionId}\n` +
            `📅 الوقت: ${savedData.savedAt}\n\n` +
            `📍 مسار الملف: ${dataPath}\n` +
            `📁 الملف موجود: ${fs.existsSync(dataPath) ? '✅ نعم' : '❌ لا'}`,
            token
          );
          
        } catch (error) {
          await sendMessage(chatId,
            `❌ *فشل اختبار الحفظ*\n\n` +
            `الخطأ: ${error.message}\n` +
            `تفاصيل: ${error.toString()}`,
            token
          );
        }
        return res.status(200).end();
      }
    }

    // ===== بدء اللعبة =====
    if (update.message?.text === "/start") {
      const chatId = update.message.chat.id;
      const user = update.message.from;
      
      userSessions.set(chatId, {
        state: "welcome",
        answers: {
          userInfo: {
            id: user.id,
            username: user.username || "قلب جميل",
            firstName: user.first_name,
            lastName: user.last_name || "",
            chatId: chatId
          },
          startTime: new Date().toISOString()
        },
        step: 0
      });

      await sendMessage(chatId,
        `🌸 *مرحباً ${user.first_name}*\n\n` +
        `💝 *لعبة التوافق العاطفي*\n\n` +
        `✨ هذه لعبة جميلة للتعبير عن مشاعرك\n` +
        `🌷 سنساعدك في فهم مشاعرك بشكل أفضل\n` +
        `💌 نتائجك ستصل للإدمن بشكل خاص\n\n` +
        `*كيف تعمل اللعبة؟*\n` +
        `1️⃣ ستجيب على 6 أسئلة بسيطة\n` +
        `2️⃣ نحلل إجاباتك بعناية\n` +
        `3️⃣ نرسل النتائج للإدمن\n\n` +
        `📝 *ملاحظة:*\n` +
        `هذه لعبة للتسلية والتعبير عن المشاعر\n` +
        `كل إجابة لها قيمتها الخاصة 💖\n\n` +
        `هل أنت مستعد لبدء هذه الرحلة الجميلة؟`,
        token,
        [[{ text: "🌸 ابدأ الرحلة", callback_data: "start_test" }]]
      );
      return res.status(200).end();
    }

    // ===== التعامل مع أزرار الاختيار =====
    if (update.callback_query) {
      const chatId = update.callback_query.message.chat.id;
      const data = update.callback_query.data;
      const session = userSessions.get(chatId);

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
            text: "✨ تم استلام إجابتك"
          })
        });
      } catch (error) {
        console.error("Error answering callback query:", error);
      }

      // معالجة أزرار اللعبة
      if (data === "start_test" && session.state === "welcome") {
        session.state = "q1";
        session.step = 1;
        userSessions.set(chatId, session);
        
        await sendMessage(chatId,
          `🌸 *السؤال ${session.step}/6*\n\n` +
          `💘 *هل تشعر بمشاعر حب تجاه شخص معين حالياً؟*\n\n` +
          `اختر الإجابة التي تعبر عن مشاعرك:`,
          token,
          [
            [
              { text: "💖 نعم، أشعر بمشاعر قوية", callback_data: "love_strong" },
              { text: "✨ لدي مشاعر ولكن ليست قوية", callback_data: "love_moderate" }
            ],
            [
              { text: "🤔 غير متأكد", callback_data: "love_unsure" },
              { text: "🌸 ليس الآن", callback_data: "love_no" }
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
          `🌷 *السؤال ${session.step}/6*\n\n` +
          `⏳ *هل مررت بتجربة حب سابقة؟*\n\n` +
          `كل تجربة تعلمنا شيئاً جديداً:`,
          token,
          [
            [
              { text: "💔 نعم، وكانت عميقة", callback_data: "past_deep" },
              { text: "🌟 نعم، ولكنها انتهت", callback_data: "past_ended" }
            ],
            [
              { text: "🕊️ ليس بعد", callback_data: "past_none" },
              { text: "🔐 أفضّل الخصوصية", callback_data: "past_secret" }
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
          `🌈 *كيف تصف مستوى سعادتك الحالي؟*\n\n` +
          `السعادة هي بداية كل شيء جميل:`,
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
        userSessions.set(chatId, session);

        await sendMessage(chatId,
          `📝 *السؤال ${session.step}/6*\n\n` +
          `🔢 *على مقياس من 0 إلى 100*\n` +
          `ما مدى حبك للشخص السابق؟\n\n` +
          `*أدخل رقماً فقط (0-100):*`,
          token
        );
      }
      else if (data === "restart_test") {
        userSessions.delete(chatId);
        await sendMessage(chatId, "🔄 تم إعادة تعيين اللعبة. أرسل /start للبدء من جديد.", token);
      }

      return res.status(200).end();
    }

    // ===== التعامل مع الإدخال النصي للعبة =====
    if (update.message?.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text.trim();
      const session = userSessions.get(chatId);

      if (!session) {
        await sendMessage(chatId, "💔 الجلسة انتهت. أرسل /start للبدء من جديد.", token);
        return res.status(200).end();
      }

      if (session.state === "q4") {
        const oldLove = parseInt(text);
        if (isNaN(oldLove) || oldLove < 0 || oldLove > 100) {
          await sendMessage(chatId,
            "⚠️ *يرجى إدخال رقم بين 0 و 100 فقط*\n\n" +
            "مثال: 75, 50, 30, 0\n" +
            "إذا لم يكن لديك تجربة سابقة، اكتب 0",
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
          `🔢 *على مقياس من 0 إلى 100*\n` +
          `ما مدى حبك للشخص الحالي؟\n\n` +
          `*أدخل رقماً فقط (0-100):*`,
          token
        );
      }
      else if (session.state === "q5") {
        const newLove = parseInt(text);
        if (isNaN(newLove) || newLove < 0 || newLove > 100) {
          await sendMessage(chatId,
            "⚠️ *يرجى إدخال رقم بين 0 و 100 فقط*\n\n" +
            "مثال: 80, 65, 90, 0\n" +
            "إذا لم يكن لديك شخص حالياً، اكتب 0",
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
          `💭 *صف حياتك العاطفية بكلماتك...*\n\n` +
          `شاركنا بمشاعرك الحقيقية:\n` +
          `(اكتب ما تشعر به بحرية)`,
          token
        );
      }
      else if (session.state === "q6") {
        session.answers.lifeDescription = text;
        session.state = "calculating";
        session.answers.duration = Date.now() - new Date(session.answers.startTime).getTime();
        userSessions.set(chatId, session);

        // رسالة تحميل جميلة
        await sendMessage(chatId,
          `⚡ *جاري تحليل إجاباتك...*\n\n` +
          `✨ نقرأ مشاعرك بعناية\n` +
          `🌷 نحلل كل كلمة بحب\n` +
          `💝 نجهز النتائج الخاصة بك\n\n` +
          `_انتظر قليلاً فهذا يستحق..._`,
          token
        );

        await new Promise(resolve => setTimeout(resolve, 3000));

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
          console.log('🔄 محاولة حفظ بيانات المستخدم:', session.answers.userInfo.firstName);
          const savedData = saveData(dataToSave);
          console.log('✅ تم حفظ البيانات بنجاح:', savedData.sessionId);
          
          // ===== إرسال النتائج الكاملة للإدمن فقط =====
          if (ADMIN_IDS.length > 0) {
            console.log('📤 إرسال النتائج للإدمن...');
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

        // رسالة نهائية جميلة للمستخدم
        await sendMessage(chatId,
          `🎉 *تم إكمال اللعبة بنجاح!*\n\n` +
          `🌸 *معلومات رحلتك:*\n` +
          `✨ الاسم: ${session.answers.userInfo.firstName}\n` +
          `🌷 عدد الأسئلة: 6/6\n` +
          `⏰ الوقت المستغرق: ${Math.round(session.answers.duration / 1000)} ثانية\n\n` +
          `💌 *النتائج:*\n` +
          `تم تحليل مشاعرك وإرسالها للإدمن\n` +
          `كل كلمة كتبتها لها معنى خاص 💖\n\n` +
          `📝 *رسالة خاصة لك:*\n` +
          `"مشاعرك جميلة وتستحق أن تُسمع"\n` +
          `شكراً لمشاركتنا جانباً من قلبك 🌸\n\n` +
          `✨ *تذكير:*\n` +
          `هذه لعبة للتسلية والتعبير عن المشاعر\n` +
          `استمتع بكل لحظة في رحلة حياتك 💝`,
          token
        );

        // زر إعادة اللعبة
        await sendMessage(chatId,
          "🔄 هل تريد تجربة اللعبة مرة أخرى؟",
          token,
          [[{ text: "🌸 لعبة جديدة", callback_data: "restart_test" }]]
        );

        // تنظيف الجلسة بعد 10 دقائق
        setTimeout(() => {
          if (userSessions.has(chatId)) {
            userSessions.delete(chatId);
            console.log('🧹 تم تنظيف جلسة المستخدم:', chatId);
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
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
      const errorText = await response.text();
      console.error('❌ فشل في إرسال الرسالة:', response.status, errorText);
    } else {
      console.log('✅ تم إرسال الرسالة بنجاح إلى:', chatId);
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

function getLoveMessage(score) {
  if (score >= 85) return "💖 *رسالة:* لديك قلب يحب بعمق، هذا جميل!";
  if (score >= 70) return "✨ *رسالة:* مشاعرك صادقة وواضحة، استمر!";
  if (score >= 50) return "🌷 *رسالة:* كل رحلة تبدأ بخطوة، وأنت على الطريق الصحيح";
  if (score >= 30) return "🌱 *رسالة:* الحب يحتاج وقتاً، لا تستعجل";
  return "🌸 *رسالة:* استمتع برحلة البحث عن الحب";
}

function getRandomHeartMessage() {
  const messages = [
    "💖 كل قلب له قصته الخاصة",
    "✨ المشاعر الجميلة تستحق أن تُحفظ",
    "🌷 شكراً لأنك تجعل هذه اللعبة جميلة",
    "🌸 كل مشاركة تضيف جمالاً لهذا المكان",
    "💝 الحب لغة الجميع"
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

// ===== تحقق من البيانات عند البدء =====
console.log('🚀 بدء تشغيل لعبة التوافق العاطفي...');
console.log('📍 مسار البيانات:', dataPath);
console.log('👑 الإدمن:', ADMIN_IDS);

// التحقق من الملف
if (fs.existsSync(dataPath)) {
  try {
    const fileContent = fs.readFileSync(dataPath, "utf8");
    const data = fileContent ? JSON.parse(fileContent) : [];
    console.log(`📊 تم تحميل ${data.length} سجلات من قاعدة البيانات`);
  } catch (error) {
    console.error('❌ خطأ في قراءة الملف:', error.message);
  }
} else {
  console.log('📭 لا يوجد ملف بيانات بعد');
}
