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
        answers: { 
          userInfo: update.message.from, 
          startTime: Date.now(),
          chatId: chatId
        } 
      });
      await sendMessage(chatId, 
        `🌸 *مرحباً بك في لعبة المشاعر الجميلة!*\n\n` +
        `✨ *كيف تعمل اللعبة:*\n` +
        `• ستجيب على 6 أسئلة بسيطة\n` +
        `• نحلل إجاباتك بعناية\n` +
        `• نرسل النتائج للإدمن\n\n` +
        `💝 *ملاحظة:*\n` +
        `هذه لعبة للتعبير عن المشاعر فقط\n` +
        `كل إجابة تعبر عن مشاعرك الحقيقية`,
        token, [
        [{ text: "🚀 ابدأ الرحلة", callback_data: "start_test" }]
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
          session.answers.currentLove = data; 
          session.state = "q2";
          await askQuestion2(chatId, token);
        } else if (data.startsWith("past_") && session.state === "q2") {
          session.answers.pastExperience = data; 
          session.state = "q3";
          await askQuestion3(chatId, token);
        } else if (data.startsWith("happy_") && session.state === "q3") {
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
      }
      await answerCallback(update.callback_query.id, "✅ تم استلام إجابتك", token);
    }

    // 3. التعامل مع النصوص
    else if (update.message?.text) {
      const text = update.message.text.trim();
      const session = userSessions.get(chatId);

      if (session) {
        if (session.state === "q4") {
          const num = parseInt(text);
          if (num >= 0 && num <= 100) {
            session.answers.oldLoveScore = num; 
            session.state = "q5";
            await sendMessage(chatId, 
              `💫 *السؤال 5/6*\n\n` +
              `🔢 *على مقياس من 0 إلى 100*\n` +
              `ما مدى حبك للشخص الحالي؟\n\n` +
              `*أدخل رقماً فقط:*`,
              token
            );
          } else {
            await sendMessage(chatId, "⚠️ الرقم يجب أن يكون بين 0 و 100", token);
          }
        } 
        else if (session.state === "q5") {
          const num = parseInt(text);
          if (num >= 0 && num <= 100) {
            session.answers.newLoveScore = num; 
            session.state = "q6";
            await sendMessage(chatId, 
              `📖 *السؤال الأخير 6/6*\n\n` +
              `💭 *صف حياتك العاطفية بكلماتك...*\n\n` +
              `اكتب ما يجول في خاطرك:\n` +
              `(شاركنا مشاعرك بحرية)`,
              token
            );
          } else {
            await sendMessage(chatId, "⚠️ الرقم يجب أن يكون بين 0 و 100", token);
          }
        } 
        else if (session.state === "q6") {
          session.answers.lifeDescription = text;
          await finalizeAndSend(chatId, session, token);
        }
      }
    }

  } catch (e) { 
    console.error("❌ خطأ في المعالجة:", e); 
  } finally {
    processingUsers.delete
