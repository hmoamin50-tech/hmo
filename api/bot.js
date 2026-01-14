import fs from "fs";
import path from "path";

const API = (token, method) =>
  `https://api.telegram.org/bot${token}/${method}`;

const dataPath = path.join(process.cwd(), "data/users.json");
const questionsPath = path.join(process.cwd(), "data/questions.json");

// قراءة الأسئلة
function getQuestions() {
  return JSON.parse(fs.readFileSync(questionsPath, "utf8"));
}

// دوال حفظ واسترجاع المستخدمين
function readData() {
  if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, "[]");
  return JSON.parse(fs.readFileSync(dataPath, "utf8"));
}

function writeData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

function getUser(chatId) {
  const data = readData();
  let user = data.find(u => u.chatId === chatId);
  if (!user) {
    user = { chatId, state: "q1", answers: {} };
    data.push(user);
    writeData(data);
  }
  return user;
}

function updateUser(chatId, newData) {
  const data = readData();
  const index = data.findIndex(u => u.chatId === chatId);
  if (index !== -1) {
    data[index] = { ...data[index], ...newData };
  } else {
    data.push({ chatId, ...newData });
  }
  writeData(data);
}

// حساب نسبة الانجذاب
function calcAttraction(oldLove, newLove, happy) {
  let base = (newLove * 0.7 + oldLove * 0.3);
  if (happy === "نعم") base += 10;
  return Math.min(100, Math.round(base));
}

// دالة للانتقال للسؤال التالي
function nextQuestion(user) {
  const questions = getQuestions();
  const idx = questions.findIndex(q => q.id === user.state);
  if (idx === -1 || idx === questions.length - 1) return null;
  return questions[idx + 1];
}

// ===== البوت الرئيسي =====
export default async function handler(req, res) {
  const token = process.env.BOT_TOKEN;
  if (req.method !== "POST") return res.status(200).send("Running");

  const update = req.body;
  let chatId = null;
  let user = null;
  const questions = getQuestions();

  // ===== /start =====
  if (update.message?.text === "/start") {
    chatId = update.message.chat.id;
    user = getUser(chatId);
    user.state = questions[0].id;
    updateUser(chatId, user);

    await sendQuestion(chatId, questions[0], token);
    return res.status(200).end();
  }

  // ===== CALLBACK QUERY =====
  if (update.callback_query) {
    chatId = update.callback_query.message.chat.id;
    const data = update.callback_query.data;
    user = getUser(chatId);

    // حفظ الإجابة
    user.answers[user.state] = data;

    // الانتقال للسؤال التالي
    const nextQ = nextQuestion(user);
    if (nextQ) {
      user.state = nextQ.id;
      updateUser(chatId, user);
      await sendQuestion(chatId, nextQ, token);
    } else {
      // نهاية التحدي
      const attraction = calcAttraction(
        Number(user.answers.q3),
        Number(user.answers.q4),
        user.answers.q5
      );
      user.answers.attraction = attraction;
      user.state = "done";
      updateUser(chatId, user);

      await sendMessage(chatId,
`🔮 *النتيجة النهائية*
نسبة انجذابك: *${attraction}%*

🤫 البوت يعرف أكثر مما تتوقع…
براءة… أنا أحبك جدًا جدًا 🤣🖤`, token);
    }
    return res.status(200).end();
  }

  // ===== الرسائل النصية =====
  if (update.message?.text) {
    chatId = update.message.chat.id;
    const text = update.message.text;
    user = getUser(chatId);

    const q = questions.find(q => q.id === user.state && q.type === "text");
    if (q) {
      user.answers[user.state] = text;

      const nextQ = nextQuestion(user);
      if (nextQ) {
        user.state = nextQ.id;
        updateUser(chatId, user);
        await sendQuestion(chatId, nextQ, token);
      } else {
        const attraction = calcAttraction(
          Number(user.answers.q3),
          Number(user.answers.q4),
          user.answers.q5
        );
        user.answers.attraction = attraction;
        user.state = "done";
        updateUser(chatId, user);

        await sendMessage(chatId,
`🔮 *النتيجة النهائية*
نسبة انجذابك: *${attraction}%*

🤫 البوت يعرف أكثر مما تتوقع…
براءة… أنا أحبك جدًا جدًا 🤣🖤`, token);
      }
    }

    return res.status(200).end();
  }

  res.status(200).end();
}

// ===== دوال إرسال الرسائل =====
async function sendQuestion(chatId, q, token) {
  if (q.type === "button") {
    await sendMessage(chatId, q.text, token, [q.options]);
  } else {
    await sendMessage(chatId, q.text, token);
  }
}

async function sendMessage(chatId, text, token, buttons = null) {
  const body = { chat_id: chatId, text, parse_mode: "Markdown" };
  if (buttons) {
    body.reply_markup = {
      inline_keyboard: buttons.map(row => row.map(b => ({ text: b, callback_data: b })))
    };
  }

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}
