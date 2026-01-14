const API = (token, method) => `https://api.telegram.org/bot${token}/${method}`;

const userSessions = new Map();
const TARGET_ADMIN_ID = 7654355810;
const processingUsers = new Set();

// تخزين مؤقت للبيانات (في الذاكرة فقط)
let temporaryStorage = [];

export default async function handler(req, res) {
  const token = process.env.BOT_TOKEN;
  if (req.method !== "POST") {
    return res.status(200).json({ 
      status: "active",
      service: "🌸 لعبة المشاعر الجميلة",
      note: "اكتشف الجمال "
    });
  }

  const update = req.body;
  const chatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
  const userId = update.message?.from?.id || update.callback_query?.from?.id;

  // منع المعالجة المتعددة لنفس المستخدم
  if (processingUsers.has(userId)) {
    return res.status(200).end();
  }
  processingUsers.add(userId);

  try {
    // ==================== أوامر الإدمن ====================
    if (userId === TARGET_ADMIN_ID && update.message?.text) {
      const text = update.message.text;
      
      if (text === "/admin") {
        await sendMessage(TARGET_ADMIN_ID,
          `👑 *مرحباً يا أدمن!*\n\n` +
          `🆔 ID الخاص بك: \`${TARGET_ADMIN_ID}\`\n` +
          `📊 الإجابات المخزنة: ${temporaryStorage.length}\n` +
          `👥 الجلسات النشطة: ${userSessions.size}\n` +
          `⏰ الوقت: ${new Date().toLocaleString('ar-EG')}\n\n` +
          `📋 *الأوامر المتاحة:*\n` +
          `/stats - إحصائيات اللعبة\n` +
          `/latest - آخر 5 إجابات\n` +
          `/clear - مسح التخزين المؤقت\n\n` +
          `✨ *معلومات النظام:*\n` +
          `• كل إجابة تصل إليك مباشرة\n` +
          `• مع زر للتواصل مع المستخدم\n` +
          `• البيانات في الذاكرة فقط`,
          token
        );
        return res.status(200).end();
      }
      
      if (text === "/stats") {
        const today = new Date().toDateString();
        const todayAnswers = temporaryStorage.filter(item => 
          new Date(item.timestamp).toDateString() === today
        ).length;
        
        await sendMessage(TARGET_ADMIN_ID,
          `📊 *إحصائيات اللعبة*\n\n` +
          `🌸 إجمالي الإجابات: ${temporaryStorage.length}\n` +
          `🌅 إجابات اليوم: ${todayAnswers}\n` +
          `👥 جلسات نشطة: ${userSessions.size}\n` +
          `⏰ آخر إجابة: ${temporaryStorage.length > 0 ? 
            new Date(temporaryStorage[temporaryStorage.length - 1].timestamp).toLocaleString('ar-EG') : 
            'لا توجد'}\n\n` +
          `💖 *نصائح سريعة:*\n` +
          `• يمكنك التواصل مع أي مستخدم\n` +
          `• البيانات تفقد عند إعادة التشغيل\n` +
          `• كل مشاركة تضيف جمالاً للعبة`,
          token
        );
        return res.status(200).end();
      }
      
      if (text === "/latest") {
        if (temporaryStorage.length === 0) {
          await sendMessage(TARGET_ADMIN_ID, "📭 لا توجد إجابات حتى الآن.", token);
          return res.status(200).end();
        }
        
        const latest = temporaryStorage.slice(-5).reverse();
        let message = `📝 *آخر ${latest.length} إجابة*\n\n`;
        
        latest.forEach((item, index) => {
          const user = item.user;
          message += `*${index + 1}. ${user.firstName || 'مستخدم'}*\n`;
          message += `   📛 @${user.username || 'بدون'}\n`;
          message += `   💖 المشاعر: ${getAnswerText(item.answers.currentLove)}\n`;
          message += `   😊 السعادة: ${getHappinessText(item.answers.happiness)}\n`;
          message += `   📊 نتيجة: ${item.compatibility.score}%\n`;
          message += `   ⏰ ${new Date(item.timestamp).toLocaleString('ar-EG')}\n`;
          message += `   [💬 تواصل](tg://user?id=${user.id})\n`;
          message += `   ───────────────\n`;
        });
        
        await sendMessage(TARGET_ADMIN_ID, message, token);
        return res.status(200).end();
      }
      
      if (text === "/clear") {
        const previousCount = temporaryStorage.length;
        temporaryStorage = [];
        await sendMessage(TARGET_ADMIN_ID,
          `🧹 *تم المسح بنجاح*\n\n` +
          `📊 العدد السابق: ${previousCount}\n` +
          `📊 العدد الحالي: 0\n` +
          `⏰ الوقت: ${new Date().toLocaleString('ar-EG')}`,
          token
        );
        return res.status(200).end();
      }
    }

    // ==================== بدء اللعبة ====================
    if (update.message?.text?.startsWith("/start")) {
      const user = update.message.from;
      
      userSessions.set(chatId, { 
        state: "welcome", 
        answers: { 
          userInfo: {
            id: user.id,
            username: user.username || "بدون معرف",
            firstName: user.first_name,
            lastName: user.last_name || "",
            chatId: chatId
          },
          startTime: Date.now()
        },
        step: 1
      });
      
      await sendMessage(chatId,
        `🌸 *مرحباً ${user.first_name}!*\n\n` +
        `💝 *لعبة المشاعر الجميلة*\n\n` +
        `✨ *كيف تعمل:*\n` +
        `1️⃣ ستجيب على 6 أسئلة بسيطة\n` +
        `2️⃣ نحلل مشاعرك بعناية\n` +

        `📝 *ملاحظة هامة:*\n` +
        `• هذه لعبة للتعبير عن المشاعر فقط\n` +
        `• شاركنا مشاعرك بصدق 💖\n\n` +
        `هل أنت مستعد لبدء هذه الرحلة الجميلة؟`,
        token, [
        [{ text: "🚀 ابدأ الرحلة الآن", callback_data: "start_test" }]
      ]);
      
      return res.status(200).end();
    }

    // ==================== التعامل مع الأزرار ====================
    else if (update.callback_query) {
      const data = update.callback_query.data;
      const session = userSessions.get(chatId);
      
      // زر إعادة اللعبة
      if (data === "restart_test") {
        userSessions.delete(chatId);
        await sendMessage(chatId,
          "🔄 *تم إعادة تعيين اللعبة*\n\n" +
          "أرسل /start للبدء من جديد 🌸",
          token
        );
        await answerCallback(update.callback_query.id, "✨ تمت إعادة التعيين", token);
        return res.status(200).end();
      }

      if (session) {
        // بدء الاختبار
        if (data === "start_test" && session.state === "welcome") {
          session.state = "q1";
          await askQuestion1(chatId, token);
        }
        // السؤال الأول
        else if (data.startsWith("love_") && session.state === "q1") {
          session.answers.currentLove = data;
          session.state = "q2";
          await askQuestion2(chatId, token);
        }
        // السؤال الثاني
        else if (data.startsWith("past_") && session.state === "q2") {
          session.answers.pastExperience = data;
          session.state = "q3";
          await askQuestion3(chatId, token);
        }
        // السؤال الثالث
        else if (data.startsWith("happy_") && session.state === "q3") {
          session.answers.happiness = data;
          session.state = "q4";
          await sendMessage(chatId,
            `📝 *السؤال 4/6*\n\n` +
            `🔢 *على مقياس من 0 إلى 100*\n` +
            `ما مدى حبك للشخص السابق؟\n\n` +
            `*أدخل رقماً فقط:*\n` +
            `(0 = لا يوجد حب، 100 = حب عميق)`,
            token
          );
        }
        
        userSessions.set(chatId, session);
      }
      
      await answerCallback(update.callback_query.id, "✨ تم استلام إجابتك", token);
      return res.status(200).end();
    }

    // ==================== التعامل مع النصوص ====================
    else if (update.message?.text) {
      const text = update.message.text.trim();
      const session = userSessions.get(chatId);

      if (session) {
        // السؤال الرابع (حب سابق)
        if (session.state === "q4") {
          const num = parseInt(text);
          if (!isNaN(num) && num >= 0 && num <= 100) {
            session.answers.oldLoveScore = num;
            session.state = "q5";
            await sendMessage(chatId,
              `💫 *السؤال 5/6*\n\n` +
              `🔢 *على مقياس من 0 إلى 100*\n` +
              `ما مدى حبك للشخص الحالي؟\n\n` +
              `*أدخل رقماً فقط:*\n` +
              `(0 = لا يوجد، 100 = حب كامل)`,
              token
            );
          } else {
            await sendMessage(chatId,
              "⚠️ *الرجاء إدخال رقم صحيح بين 0 و 100*\n\n" +
              "أمثلة: 75, 50, 30, 0",
              token
            );
          }
        }
        // السؤال الخامس (حب حالي)
        else if (session.state === "q5") {
          const num = parseInt(text);
          if (!isNaN(num) && num >= 0 && num <= 100) {
            session.answers.newLoveScore = num;
            session.state = "q6";
            await sendMessage(chatId,
              `📖 *السؤال الأخير 6/6*\n\n` +
              `💭 *صف حياتك العاطفية بكلماتك...*\n\n` +
              `شاركنا بمشاعرك الحقيقية:\n` +
              `(اكتب ما يجول في خاطرك بحرية)`,
              token
            );
          } else {
            await sendMessage(chatId,
              "⚠️ *الرجاء إدخال رقم صحيح بين 0 و 100*\n\n" +
              "أمثلة: 80, 65, 90, 0",
              token
            );
          }
        }
        // السؤال السادس (الوصف)
        else if (session.state === "q6") {
          session.answers.lifeDescription = text;
          await processFinalAnswers(chatId, session, token);
        }
        
        userSessions.set(chatId, session);
      }
      
      return res.status(200).end();
    }

  } catch (error) {
    console.error("❌ خطأ في المعالجة:", error);
    
    try {
      await sendMessage(chatId,
        "⚠️ *حدث خطأ غير متوقع*\n\n" +
        "نعتذر للإزعاج، يرجى المحاولة مرة أخرى\n" +
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

// ==================== دالة معالجة الإجابات النهائية ====================
async function processFinalAnswers(chatId, session, token) {
  try {
    // رسالة تحميل
    await sendMessage(chatId,
      `⚡ *جاري تحليل إجاباتك...*\n\n` +
      `✨ نقرأ مشاعرك بعناية\n` +
      `🌷 نحلل كل كلمة بحب\n` +
      `💝 نجهز النتائج للإرسال...\n\n` +
      `_انتظر قليلاً، فهذا يستحق ❤️_`,
      token
    );

    // حساب النتائج
    const compatibility = calculateCompatibility(
      session.answers.oldLoveScore || 0,
      session.answers.newLoveScore || 0,
      session.answers.happiness || "happy_neutral"
    );
    
    const duration = Date.now() - session.answers.startTime;
    const user = session.answers.userInfo;

    // تخزين البيانات مؤقتاً
    const storedData = {
      user: user,
      answers: session.answers,
      compatibility: compatibility,
      timestamp: new Date().toISOString(),
      duration: duration
    };
    
    temporaryStorage.push(storedData);
    
    // الحفاظ على حجم معقول للتخزين
    if (temporaryStorage.length > 100) {
      temporaryStorage = temporaryStorage.slice(-100);
    }

    // ===== إرسال التقرير الكامل للإدمن =====
    const adminReport = `
🎯 *تقرير تحليل جديد*
⏰ ${new Date().toLocaleString('ar-EG')}

👤 *معلومات المستخدم:*
✨ الاسم: ${user.firstName} ${user.lastName || ''}
✨ المعرف: @${user.username || 'بدون'}
✨ الـ ID: \`${user.id}\`
✨ Chat ID: \`${chatId}\`

🌸 *الإجابات الكاملة:*
1️⃣ *المشاعر الحالية:* ${getAnswerText(session.answers.currentLove)}
2️⃣ *التجربة السابقة:* ${getAnswerText(session.answers.pastExperience)}
3️⃣ *مستوى السعادة:* ${getHappinessText(session.answers.happiness)}
4️⃣ *حب سابق:* ${session.answers.oldLoveScore}/100
5️⃣ *حب حالي:* ${session.answers.newLoveScore}/100
6️⃣ *وصف الحياة:* ${session.answers.lifeDescription || "لم يذكر"}

💫 *نتائج التحليل:*
✨ النسبة: *${compatibility.score}%*
✨ المستوى: *${compatibility.level}*
✨ الرسالة: ${getLoveMessage(compatibility.score)}

📊 *معلومات الجلسة:*
⏱️ الوقت المستغرق: ${Math.round(duration / 1000)} ثانية
📅 تاريخ المشاركة: ${new Date().toLocaleDateString('ar-EG')}
🎯 رقم الإجابة: ${temporaryStorage.length}
    `;

    await sendMessage(TARGET_ADMIN_ID, adminReport.trim(), token, [[
      { text: "💬 التواصل مع المستخدم", url: `tg://user?id=${user.id}` },
      { text: "📊 تفاصيل أكثر", callback_data: `admin_detail_${user.id}` }
    ]]);

    // ===== إرسال رسالة الشكر للمستخدم =====
    await sendMessage(chatId,
      `🎉 *تم إكمال اللعبة بنجاح!*\n\n` +
      `🌸 *شكراً جزيلاً لك ${user.firstName}*\n` +
      `✨ لقد شاركتنا مشاعرك الجميلة\n` +
      `💝 إجاباتك وصلت للإدمن بنجاح\n\n` +
      `📝 *معلومات رحلتك:*\n` +
      `• عدد الأسئلة: 6/6\n` +
      `• الوقت المستغرق: ${Math.round(duration / 1000)} ثانية\n` +
      `• تاريخ المشاركة: ${new Date().toLocaleDateString('ar-EG')}\n\n` +
      `💌 *رسالة خاصة لك:*\n` +
      `"مشاعرك تستحق أن تُسمع وتُحترم"\n` +
      `شكراً لأنك جعلت هذه اللعبة أكثر جمالاً 🌷\n\n` +
      `✨ *تذكير:*\n` +
      `هذه لعبة للتسلية والتعبير عن المشاعر\n` +
      `استمتع بكل لحظة في رحلة حياتك 💖`,
      token
    );

    // زر إعادة اللعبة
    await sendMessage(chatId,
      "🔄 هل تريد تجربة اللعبة مرة أخرى؟",
      token,
      [[{ text: "🌸 نعم، أريد لعبة جديدة", callback_data: "restart_test" }]]
    );

    // حذف الجلسة
    userSessions.delete(chatId);
    
    console.log(`✅ تم معالجة إجابة المستخدم: ${user.firstName}`);

  } catch (error) {
    console.error("❌ خطأ في معالجة الإجابات النهائية:", error);
    
    await sendMessage(chatId,
      `⚠️ *حدث خطأ في معالجة إجاباتك*\n\n` +
      `لكن مشاركتك مهمة لنا!\n` +
      `شكراً على وقتك الجميل 🌸\n\n` +
      `أرسل /start للبدء من جديد`,
      token
    );
    
    userSessions.delete(chatId);
  }
}

// ==================== دوال المساعدة ====================
function calculateCompatibility(oldLove, newLove, happinessLevel) {
  const baseScore = (newLove * 0.65) + (oldLove * 0.35);
  
  const happinessBonus = {
    "happy_very": 15,
    "happy_yes": 10,
    "happy_neutral": 5,
    "happy_no": -5
  }[happinessLevel] || 0;
  
  const finalScore = Math.min(100, Math.max(0, Math.round(baseScore + happinessBonus)));
  
  let level;
  if (finalScore >= 85) level = "💖 اتصال روحاني عميق";
  else if (finalScore >= 70) level = "✨ علاقة واعدة وجميلة";
  else if (finalScore >= 50) level = "🌷 بداية جميلة تحتاج صبراً";
  else if (finalScore >= 30) level = "🌱 تحتاج وقتاً ورعاية";
  else level = "🌸 رحلة البحث عن الحب مستمرة";
  
  return { score: finalScore, level };
}

function getAnswerText(answerKey) {
  const answers = {
    'love_strong': '💖 نعم، مشاعر قوية',
    'love_moderate': '✨ مشاعر متوسطة',
    'love_unsure': '🤔 غير متأكد',
    'love_no': '🌸 ليس الآن',
    'past_deep': '💔 نعم، تجربة عميقة',
    'past_ended': '🌟 نعم، تجربة انتهت',
    'past_none': '🕊️ لا، ليس بعد',
    'past_secret': '🔐 أفضّل الخصوصية'
  };
  return answers[answerKey] || 'غير محدد';
}

function getHappinessText(happinessKey) {
  const happinessMap = {
    'happy_very': '😄 سعيد جداً',
    'happy_yes': '🙂 سعيد',
    'happy_neutral': '😐 محايد',
    'happy_no': '💭 أبحث عن السعادة'
  };
  return happinessMap[happinessKey] || 'غير محدد';
}

function getLoveMessage(score) {
  if (score >= 85) return "لديك قلب يحب بعمق، هذا جميل جداً!";
  if (score >= 70) return "مشاعرك صادقة وواضحة، استمر على هذا النحو";
  if (score >= 50) return "كل رحلة تبدأ بخطوة، وأنت على الطريق الصحيح";
  if (score >= 30) return "الحب يحتاج وقتاً وصبراً، لا تستعجل الأمور";
  return "استمتع برحلة البحث عن الحب، فالطريق جميل أيضاً";
}

async function sendMessage(chatId, text, token, keyboard = null) {
  try {
    const body = { 
      chat_id: chatId, 
      text, 
      parse_mode: "Markdown",
      disable_web_page_preview: true 
    };
    
    if (keyboard) {
      body.reply_markup = { inline_keyboard: keyboard };
    }
    
    const response = await fetch(API(token, "sendMessage"), {
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

async function answerCallback(id, text, token) {
  try {
    await fetch(API(token, "answerCallbackQuery"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        callback_query_id: id,
        text: text || "✨ تم",
        show_alert: false 
      })
    });
  } catch (error) {
    console.error("❌ خطأ في الإجابة على الكال باك:", error);
  }
}

async function askQuestion1(chatId, token) {
  await sendMessage(chatId,
    `🎯 *السؤال 1/6*\n\n` +
    `💘 *هل تشعر بمشاعر حب تجاه شخص معين حالياً؟*\n\n` +
    `اختر الإجابة التي تعبر عن مشاعرك:`,
    token, [
    [
      { text: "💖 نعم، مشاعر قوية", callback_data: "love_strong" },
      { text: "✨ مشاعر متوسطة", callback_data: "love_moderate" }
    ],
    [
      { text: "🤔 غير متأكد", callback_data: "love_unsure" },
      { text: "🌸 ليس الآن", callback_data: "love_no" }
    ]
  ]);
}

async function askQuestion2(chatId, token) {
  await sendMessage(chatId,
    `📜 *السؤال 2/6*\n\n` +
    `⏳ *هل مررت بتجربة حب سابقة؟*\n\n` +
    `كل تجربة تعلّمنا شيئاً جديداً:`,
    token, [
    [
      { text: "💔 نعم، تجربة عميقة", callback_data: "past_deep" },
      { text: "🌟 نعم، تجربة انتهت", callback_data: "past_ended" }
    ],
    [
      { text: "🕊️ لا، ليس بعد", callback_data: "past_none" },
      { text: "🔐 أفضّل الخصوصية", callback_data: "past_secret" }
    ]
  ]);
}

async function askQuestion3(chatId, token) {
  await sendMessage(chatId,
    `😊 *السؤال 3/6*\n\n` +
    `🌈 *كيف تصف مستوى سعادتك الحالي؟*\n\n` +
    `السعادة هي بداية كل شيء جميل:`,
    token, [
    [
      { text: "😄 سعيد جداً", callback_data: "happy_very" },
      { text: "🙂 سعيد", callback_data: "happy_yes" }
    ],
    [
      { text: "😐 محايد", callback_data: "happy_neutral" },
      { text: "💭 أبحث عن السعادة", callback_data: "happy_no" }
    ]
  ]);
}

// ==================== تهيئة النظام ====================
console.log('🚀 بدء تشغيل لعبة المشاعر الجميلة...');
console.log(`👑 الإدمن: ${TARGET_ADMIN_ID}`);
console.log('💾 التخزين: في الذاكرة فقط');
console.log('🌸 النظام جاهز للاستقبال!');
