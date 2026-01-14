import fs from "fs";
import path from "path";

const API = (token, method) =>
  `https://api.telegram.org/bot${token}/${method}`;

const userSessions = new Map();

// ===== إعدادات الإدمن =====
const ADMIN_IDS = [7654355810]; // ID الخاص بك هنا
const ADMIN_CHAT_ID = 7654355810; // يمكن أن يكون نفس الـ ID

// ===== مسار البيانات =====
const dataPath = path.join(process.cwd(), "data/responses.json");

// ===== إنشاء مجلد data إذا لم يكن موجوداً =====
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// ===== دالة محسنة لحفظ البيانات =====
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
      await new Promise(resolve => setTimeout(resolve, 300)); // تأخير خفيف
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

💭 *ملاحظة:* ${generateInsights(compatibility.score, answers)}
    `;
    
    await sendToAdmin(token, formattedMessage.trim(), {
      inlineKeyboard: [[
        { text: "💬 التواصل مع المستخدم", url: `tg://user?id=${userData.id}` },
        { text: "📊 إحصائيات", callback_data: "admin_stats" }
      ]]
    });
    
    console.log('✅ تم إرسال النتائج الكاملة للإدمن');
    
  } catch (error) {
    console.error('❌ خطأ في إرسال النتائج للإدمن:', error);
  }
}

async function sendNewTestNotification(token, userData, chatId) {
  try {
    const notification = `
🟢 *بدأ اختبار جديد*

👤 ${userData.first_name} ${userData.last_name || ''}
📛 @${userData.username || 'بدون معرف'}
🆔 \`${userData.id}\`
💬 Chat ID: \`${chatId}\`

⏰ ${new Date().toLocaleString('ar-EG')}
    `;
    
    await sendToAdmin(token, notification.trim());
    
  } catch (error) {
    console.error('❌ خطأ في إرسال إشعار البدء:', error);
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
      version: "3.0.0",
      admin: ADMIN_IDS.includes(7654355810),
      yourId: 7654355810
    });
  }

  try {
    const update = req.body;

    // ===== الأمر لمعرفة الـ ID =====
    if (update.message?.text === "/myid") {
      const chatId = update.message.chat.id;
      const user = update.message.from;
      
      await sendMessage(chatId,
        `🆔 *معلومات حسابك*\n\n` +
        `• ID الخاص بك: \`${user.id}\`\n` +
        `• الاسم: ${user.first_name} ${user.last_name || ''}\n` +
        `• المعرف: @${user.username || 'غير متوفر'}\n` +
        `• Chat ID: \`${chatId}\`\n\n` +
        `📌 *ملاحظة:*\n` +
        `إذا كنت الإدمن (ID: 7654355810)، يمكنك استخدام:\n` +
        `/admin - لوحة التحكم\n` +
        `/stats - الإحصائيات\n` +
        `/users - عرض المستخدمين\n` +
        `/latest - آخر الإجابات`,
        token
      );
      
      return res.status(200).end();
    }

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
          `/search [اسم] - البحث عن مستخدم\n` +
          `/export - تصدير البيانات\n` +
          `/broadcast [رسالة] - بث رسالة\n\n` +
          `⚙️ *الإعدادات:*\n` +
          `التنبيهات: ✅ مفعلة\n` +
          `عدد الإدمن: ${ADMIN_IDS.length}`,
          token,
          [
            [
              { text: "📊 الإحصائيات", callback_data: "admin_stats" },
              { text: "👥 المستخدمون", callback_data: "admin_users" }
            ],
            [
              { text: "📝 آخر الإجابات", callback_data: "admin_latest" },
              { text: "📨 تصدير", callback_data: "admin_export" }
            ]
          ]
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
        
        // تحليل مستوى السعادة
        const happinessStats = { happy_very: 0, happy_yes: 0, happy_neutral: 0, happy_no: 0 };
        data.forEach(item => {
          const happiness = item.answers?.happiness;
          if (happiness && happinessStats[happiness] !== undefined) {
            happinessStats[happiness]++;
          }
        });
        
        await sendMessage(chatId,
          `📊 *إحصائيات البوت*\n\n` +
          `📈 إجمالي الإجابات: ${total}\n` +
          `📅 إجابات اليوم: ${todayCount}\n` +
          `📊 متوسط النسبة: ${avgScore}%\n` +
          `👥 المستخدمون النشطون: ${userSessions.size}\n\n` +
          `😊 *مستويات السعادة:*\n` +
          `😄 سعيد جداً: ${happinessStats.happy_very}\n` +
          `🙂 سعيد: ${happinessStats.happy_yes}\n` +
          `😐 محايد: ${happinessStats.happy_neutral}\n` +
          `😔 غير سعيد: ${happinessStats.happy_no}\n\n` +
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
          if (index < 15) { // عرض أول 15 مستخدم فقط
            message += `*${index + 1}. ${user.firstName || 'مستخدم'}*\n`;
            message += `   🆔: \`${user.id}\`\n`;
            message += `   📛: @${user.username || 'بدون'}\n`;
            message += `   🧪 عدد الاختبارات: ${user.testCount}\n`;
            message += `   📊 متوسط النسبة: ${Math.round(user.avgScore)}%\n`;
            message += `   🕒 آخر اختبار: ${new Date(user.lastTest).toLocaleString('ar-EG')}\n`;
            message += `   ───────────────\n`;
          }
        });
        
        if (usersArray.length > 15) {
          message += `\n*و ${usersArray.length - 15} مستخدمين آخرين...*`;
        }
        
        await sendMessage(chatId, message, token);
        return res.status(200).end();
      }
      
      // عرض آخر الإجابات
      if (text === "/latest" || text.startsWith("/latest ")) {
        let data = [];
        if (fs.existsSync(dataPath)) {
          const fileContent = fs.readFileSync(dataPath, "utf8");
          data = fileContent ? JSON.parse(fileContent) : [];
        }
        
        const limit = text.includes(" ") ? parseInt(text.split(" ")[1]) || 10 : 10;
        const latestData = data.slice(-limit).reverse();
        
        if (latestData.length === 0) {
          await sendMessage(chatId, "📭 لا توجد إجابات حتى الآن.", token);
          return res.status(200).end();
        }
        
        await sendMessage(chatId,
          `📝 *آخر ${latestData.length} إجابة*\n\n` +
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
          
          await sendMessage(chatId, message, token, [[
            { text: "💬 التواصل", url: `tg://user?id=${user?.id}` },
            { text: "📊 تفاصيل", callback_data: `detail_${item.sessionId}` }
          ]]);
          
          await new Promise(resolve => setTimeout(resolve, 500)); // تأخير بين الرسائل
        }
        
        return res.status(200).end();
      }
      
      // البحث عن مستخدم
      if (text.startsWith("/search ")) {
        const searchTerm = text.replace("/search ", "").trim().toLowerCase();
        if (!searchTerm) {
          await sendMessage(chatId, "⚠️ يرجى كتابة مصطلح البحث.\nمثال: `/search محمد`", token);
          return res.status(200).end();
        }
        
        let data = [];
        if (fs.existsSync(dataPath)) {
          const fileContent = fs.readFileSync(dataPath, "utf8");
          data = fileContent ? JSON.parse(fileContent) : [];
        }
        
        const results = data.filter(item => {
          const user = item.userInfo;
          return (
            (user?.firstName && user.firstName.toLowerCase().includes(searchTerm)) ||
            (user?.lastName && user.lastName.toLowerCase().includes(searchTerm)) ||
            (user?.username && user.username.toLowerCase().includes(searchTerm)) ||
            (item.answers?.lifeDescription && item.answers.lifeDescription.toLowerCase().includes(searchTerm))
          );
        });
        
        if (results.length === 0) {
          await sendMessage(chatId, `🔍 لم يتم العثور على نتائج لـ "${searchTerm}"`, token);
          return res.status(200).end();
        }
        
        await sendMessage(chatId,
          `🔍 *نتائج البحث عن "${searchTerm}"*\n\n` +
          `📊 العدد: ${results.length} نتيجة\n\n` +
          `*أحدث 3 نتائج:*`,
          token
        );
        
        const latestResults = results.slice(-3).reverse();
        for (const item of latestResults) {
          const user = item.userInfo;
          await sendMessage(chatId,
            `👤 ${user?.firstName || 'مستخدم'}\n` +
            `📛 @${user?.username || 'بدون'}\n` +
            `📅 ${new Date(item.timestamp).toLocaleString('ar-EG')}\n` +
            `💖 ${item.compatibility?.score || 0}%\n` +
            `📝 ${item.answers?.lifeDescription?.substring(0, 60) || '...'}`,
            token,
            [[
              { text: "📋 عرض كامل", callback_data: `full_${item.sessionId}` },
              { text: "💬 تواصل", url: `tg://user?id=${user?.id}` }
            ]]
          );
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        return res.status(200).end();
      }
      
      // بث رسالة للمستخدمين
      if (text.startsWith("/broadcast ")) {
        const broadcastMessage = text.replace("/broadcast ", "").trim();
        if (!broadcastMessage) {
          await sendMessage(chatId, "⚠️ يرجى كتابة الرسالة.\nمثال: `/broadcast مرحباً بكم!`", token);
          return res.status(200).end();
        }
        
        let data = [];
        if (fs.existsSync(dataPath)) {
          const fileContent = fs.readFileSync(dataPath, "utf8");
          data = fileContent ? JSON.parse(fileContent) : [];
        }
        
        // تجميع المستخدمين الفريدين
        const uniqueUsers = new Map();
        data.forEach(item => {
          if (item.userInfo && item.chatId) {
            uniqueUsers.set(item.userInfo.id, {
              chatId: item.chatId,
              userInfo: item.userInfo
            });
          }
        });
        
        const usersArray = Array.from(uniqueUsers.values());
        
        await sendMessage(chatId,
          `📨 *إعداد البث*\n\n` +
          `👥 عدد المستهدفين: ${usersArray.length}\n` +
          `📝 الرسالة: ${broadcastMessage.substring(0, 50)}...\n\n` +
          `⚠️ *تحذير:* سيتم إرسال الرسالة لجميع المستخدمين.`,
          token,
          [[
            { text: "✅ تأكيد البث", callback_data: `confirm_broadcast_${encodeURIComponent(broadcastMessage)}` },
            { text: "❌ إلغاء", callback_data: "cancel_broadcast" }
          ]]
        );
        
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

      // إرسال إشعار للإدمن ببدء اختبار جديد
      if (ADMIN_IDS.length > 0) {
        await sendNewTestNotification(token, user, chatId);
      }

      await sendMessage(chatId,
        `🌟 *مرحباً ${user.first_name}* 🌟\n\n` +
        `🔮 *مختبر التوافق العاطفي*\n\n` +
        `هل أنت مستعد لبدء الرحلة؟`,
        token,
        [[{ text: "🚀 ابدأ الاختبار", callback_data: "start_test" }]]
      );
      return res.status(200).end();
    }

    // ===== التعامل مع أزرار الاختيار =====
    if (update.callback_query) {
      const chatId = update.callback_query.message.chat.id;
      const data = update.callback_query.data;
      const userId = update.callback_query.from.id;
      const session = userSessions.get(chatId);

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

      // معالجة أزرار الإدمن
      if (data.startsWith("admin_") && ADMIN_IDS.includes(userId)) {
        if (data === "admin_stats") {
          // ... كود الإحصائيات ...
        }
        else if (data === "admin_users") {
          // ... كود عرض المستخدمين ...
        }
        else if (data.startsWith("confirm_broadcast_")) {
          const message = decodeURIComponent(data.replace("confirm_broadcast_", ""));
          // ... كود البث ...
        }
      }

      // معالجة أزرار الاختبار العادية
      if (data === "start_test" && session?.state === "welcome") {
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
      // ... باقي معالجة الأزرار ...

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

      // ... معالجة أسئلة الاختبار ...

      // ===== عند نهاية الاختبار =====
      if (session.state === "q6") {
        session.answers.lifeDescription = text;
        session.state = "calculating";
        session.answers.duration = Date.now() - new Date(session.answers.startTime).getTime();
        userSessions.set(chatId, session);

        await sendMessage(chatId,
          `⚡ *جاري تحليل إجاباتك...*\n\n` +
          `✨ نقوم بحساب التوافق العاطفي\n` +
          `📊 نجمع البيانات العاطفية\n` +
          `🔮 نرسم خريطة المشاعر...`,
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
          
          // ===== إرسال النتائج الكاملة للإدمن =====
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
          await sendMessage(chatId, 
            "⚠️ حدث خطأ في حفظ النتائج، لكن الاختبار مكتمل.", 
            token
          );
        }

        const happinessText = getHappinessText(session.answers.happiness);

        await sendMessage(chatId,
          `🎊 *تم تحليل بياناتك بنجاح!*\n\n` +
          `📈 *نتيجة التوافق العاطفي*\n` +
          `🔢 النسبة: *${compatibility.score}%*\n` +
          `🏆 المستوى: *${compatibility.level}*\n\n` +
          `📊 *تحليل المشاعر*\n` +
          `💫 الحب الحالي: ${session.answers.newLoveScore || 0}/100\n` +
          `🕰️ الحب السابق: ${session.answers.oldLoveScore || 0}/100\n` +
          `😊 مستوى السعادة: ${happinessText}\n\n` +
          `💭 *وصفك:* ${session.answers.lifeDescription || "غير محدد"}\n\n` +
          `✨ شكراً لمشاركتنا مشاعرك الصادقة 💖`,
          token
        );

        await sendMessage(chatId,
          "🔄 هل تريد إجراء اختبار جديد؟",
          token,
          [[{ text: "🔄 اختبار جديد", callback_data: "restart_test" }]]
        );

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

function generateInsights(score, answers) {
  if (score >= 85) return "لديك قلب قادر على الحب العميق وعلاقة صحية";
  if (score >= 70) return "تمتلك مشاعر صادقة وتحتاج بعض الوقت";
  if (score >= 50) return "في مرحلة بناء المشاعر، خذ وقتك";
  if (score >= 30) return "بداية العلاقة تحتاج صبراً وتعلماً";
  return "وقتك للحب لم يحن بعد، ركز على تطوير ذاتك";
}

// ===== إرسال تقرير يومي تلقائي =====
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
    
    if (todayData.length === 0) return;
    
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
${todayData.map((item, i) => 
  `${i + 1}. ${item.userInfo?.firstName || 'مستخدم'} - ${item.compatibility?.score || 0}%`
).join('\n')}

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
