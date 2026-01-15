import fs from "fs";
import path from "path";

const API = (token, method) =>
  `https://api.telegram.org/bot${token}/${method}`;

const states = {};
const answers = {};

const dataPath = path.join(process.cwd(), "data/responses.json");

// ===== دالة لحفظ البيانات =====
function saveData(entry) {
  let data = [];
  if (fs.existsSync(dataPath)) {
    data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  }
  data.push(entry);
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

// ===== دالة حساب نسبة الانجذاب =====
function calcAttraction(oldLove, newLove, happy) {
  let base = newLove * 0.7 + oldLove * 0.3;
  if (happy === "نعم") base += 10;
  return Math.min(100, Math.round(base));
}

// ===== البوت الرئيسي =====
export default async function handler(req, res) {
  const token = process.env.BOT_TOKEN;
  if (req.method !== "POST") return res.status(200).send("Running");

  const update = req.body;

  // ===== بدء التحدي عند /start =====
  if (update.message?.text === "/start") {
    const chatId = update.message.chat.id;
    states[chatId] = "q1";
    answers[chatId] = { user: update.message.from };

    await sendMessage(chatId,
      "🧩 *تحدي: اعرف مدى تناسقك*\n\nهل أنت مغرم بأحدهم؟",
      token,
      [["نعم", "لا"]]
    );
    return res.status(200).end();
  }

  // ===== التعامل مع أزرار المستخدم =====
  if (update.callback_query) {
    const chatId = update.callback_query.message.chat.id;
    const data = update.callback_query.data;

    switch (states[chatId]) {

      case "q1":
        answers[chatId].inLove = data;
        states[chatId] = "q2";
        await sendMessage(chatId,
          "هل سبق لك وأن أحببت شخصًا غيره؟",
          token,
          [["نعم", "لا"]]
        );
        break;

      case "q2":
        answers[chatId].lovedBefore = data;
        states[chatId] = "q3";
        await sendMessage(chatId,
          "أدخل *نسبة حبك للشخص القديم* (0 – 100)",
          token
        );
        break;

      case "q5": // ✅ هنا السؤال عن السعادة
        answers[chatId].happy = data;
        states[chatId] = "q6";
        await sendMessage(chatId,
          "صف حياتك الآن بكلمات صادقة…",
          token
        );
        break;
    }

    return res.status(200).end();
  }

  // ===== التعامل مع نصوص / أرقام =====
  if (update.message?.text) {
    const chatId = update.message.chat.id;
    const text = update.message.text;

    switch (states[chatId]) {

      case "q3":
        const oldLove = Number(text);
        if (isNaN(oldLove) || oldLove < 0 || oldLove > 100) {
          await sendMessage(chatId, "⚠️ أدخل رقمًا بين 0 و 100");
          return res.status(200).end();
        }
        answers[chatId].oldLove = oldLove;
        states[chatId] = "q4";
        await sendMessage(chatId,
          "أدخل *نسبة حبك للشخص الحالي* (0 – 100)",
          token
        );
        break;

      case "q4":
        const newLove = Number(text);
        if (isNaN(newLove) || newLove < 0 || newLove > 100) {
          await sendMessage(chatId, "⚠️ أدخل رقمًا بين 0 و 100");
          return res.status(200).end();
        }
        answers[chatId].newLove = newLove;
        states[chatId] = "q5";
        await sendMessage(chatId,
          "هل تشعر بالسعادة الآن؟",
          token,
          [["نعم", "لا"]]
        );
        break;

      case "q6":
        answers[chatId].lifeDesc = text;
        states[chatId] = "done";

        // حساب النسبة
        const attraction = calcAttraction(
          answers[chatId].oldLove,
          answers[chatId].newLove,
          answers[chatId].happy
        );

        // حفظ البيانات كاملة
        saveData({
          date: new Date().toISOString(),
          chatId,
          ...answers[chatId],
          attraction
        });

        // إرسال النتيجة النهائية
        await sendMessage(chatId,
`🔮 *النتيجة النهائية*
نسبة انجذابك: *${attraction}%*

🤫 البوت يعرف أكثر مما تتوقع…
براءة… أنا أحبك جدًا جدًا 🤣🖤`,
          token
        );
        break;
    }

    return res.status(200).end();
  }

  res.status(200).end();
}

// ===== دالة إرسال الرسائل =====
async function sendMessage(chatId, text, token, buttons = null) {
  const body = { chat_id: chatId, text, parse_mode: "Markdown" };

  if (buttons) {
    body.reply_markup = {
      inline_keyboard: buttons.map(row => row.map(b => ({ text: b, callback_data: b })))
    };
  }

  await fetch(`${API(token, "sendMessage")}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}
