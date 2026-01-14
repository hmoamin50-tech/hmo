import fs from "fs";
import path from "path";

const API = (token, method) =>
  `https://api.telegram.org/bot${token}/${method}`;

const dataPath = path.join(process.cwd(), "data/users.json");

// دوال مساعدة
function readData() {
  if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, "[]");
  return JSON.parse(fs.readFileSync(dataPath, "utf8"));
}

function writeData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

// دالة للحصول على حالة المستخدم
function getUser(chatId) {
  const data = readData();
  let user = data.find(u => u.chatId === chatId);
  if (!user) {
    user = { chatId, state: "start", answers: {} };
    data.push(user);
    writeData(data);
  }
  return user;
}

// دالة تحديث المستخدم
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

// دالة لحساب نسبة الانجذاب
function calcAttraction(oldLove, newLove, happy) {
  let base = (newLove * 0.7 + oldLove * 0.3);
  if (happy === "نعم") base += 10;
  return Math.min(100, Math.round(base));
}

export default async function handler(req, res) {
  const token = process.env.BOT_TOKEN;
  if (req.method !== "POST") return res.status(200).send("Running");

  const update = req.body;
  let chatId = null;
  let user = null;

  // =================== START ===================
  if (update.message?.text === "/start") {
    chatId = update.message.chat.id;
    user = getUser(chatId);
    user.state = "q1";
    updateUser(chatId, user);

    await sendMessage(chatId,
      "🧩 *تحدي: اعرف مدى تناسقك*\n\nاختر بوابتك الغامضة:",
      token,
      [["🌑 الظلام", "🌟 النور", "🌪️ العاصفة"]]
    );
    return res.status(200).end();
  }

  // =================== CALLBACK QUERY ===================
  if (update.callback_query) {
    chatId = update.callback_query.message.chat.id;
    const data = update.callback_query.data;
    user = getUser(chatId);

    switch (user.state) {

      case "q1":
        user.answers.portal = data;
        user.state = "q2";
        updateUser(chatId, user);
        await sendMessage(chatId,
          `لقد اخترت: ${data}\nاختر حاسة لاستكشاف الأسرار:`,
          token,
          [["👁️ البصر", "👂 السمع", "✋ اللمس"]]
        );
        break;

      case "q2":
        user.answers.sense = data;
        user.state = "q3";
        updateUser(chatId, user);
        await sendMessage(chatId,
          `أصوات غامضة تقترب… اختر رسالة القدر:`,
          token,
          [["🔮 المستقبل", "💀 الماضي", "🔥 الآن"]]
        );
        break;

      case "q3":
        user.answers.fate = data;
        user.state = "q4";
        updateUser(chatId, user);
        await sendMessage(chatId,
          "هل أنت مغرم بأحدهم؟",
          token,
          [["نعم", "لا"]]
        );
        break;

      case "q4":
        user.answers.inLove = data;
        user.state = "q5";
        updateUser(chatId, user);
        await sendMessage(chatId,
          "هل سبق لك أن أحببت شخصًا آخر غيره؟",
          token,
          [["نعم", "لا"]]
        );
        break;

      case "q5":
        user.answers.lovedBefore = data;
        user.state = "q6";
        updateUser(chatId, user);
        await sendMessage(chatId,
          "أدخل نسبة حبك للشخص القديم (0 – 100)",
          token
        );
        break;
    }

    return res.status(200).end();
  }

  // =================== TEXT MESSAGES ===================
  if (update.message?.text) {
    chatId = update.message.chat.id;
    const text = update.message.text;
    user = getUser(chatId);

    switch (user.state) {

      case "q6":
        user.answers.oldLove = Number(text);
        user.state = "q7";
        updateUser(chatId, user);
        await sendMessage(chatId, "أدخل نسبة حبك للشخص الحالي (0 – 100)", token);
        break;

      case "q7":
        user.answers.newLove = Number(text);
        user.state = "q8";
        updateUser(chatId, user);
        await sendMessage(chatId, "هل تشعر بالسعادة الآن؟", token, [["نعم", "لا"]]);
        break;

      case "q8":
        user.answers.happy = text;
        user.state = "q9";
        updateUser(chatId, user);
        await sendMessage(chatId, "صف حياتك الآن بكلمات صادقة…", token);
        break;

      case "q9":
        user.answers.lifeDesc = text;
        const attraction = calcAttraction(
          user.answers.oldLove,
          user.answers.newLove,
          user.answers.happy
        );
        user.answers.attraction = attraction;
        user.state = "done";
        updateUser(chatId, user);

        await sendMessage(chatId,
`🔮 *النتيجة النهائية*
نسبة انجذابك: *${attraction}%*

🤫 البوت يعرف أكثر مما تتوقع…
براءة… أنا أحبك جدًا جدًا 🤣🖤`,
          token
        );
        break;
    }
  }

  res.status(200).end();
}

// =================== دالة إرسال الرسائل ===================
async function sendMessage(chatId, text, token, buttons = null) {
  const body = {
    chat_id: chatId,
    text,
    parse_mode: "Markdown"
  };

  if (buttons) {
    body.reply_markup = {
      inline_keyboard: buttons.map(row =>
        row.map(b => ({ text: b, callback_data: b }))
      )
    };
  }

  await fetch(API(token, "sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
      }
