const API = (token, method) =>
  `https://api.telegram.org/bot${token}/${method}`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("Running");

  const token = process.env.BOT_TOKEN;
  const update = req.body;

  // ========== START ==========
  if (update.message?.text === "/start") {
    const chatId = update.message.chat.id;

    await sendMessage(chatId,
      "🧩 مرحبًا بك في تحدي الغموض!\nهل أنت مغرم بأحدهم؟",
      token,
      [["نعم", "لا"]]
    );

    return res.status(200).end();
  }

  // ========== CALLBACK QUERY ==========
  if (update.callback_query) {
    const chatId = update.callback_query.message.chat.id;
    const data = update.callback_query.data;

    // رسالة تأكيد الاختيار
    await sendMessage(chatId,
      `لقد اخترت: ${data}\nتابع الإجابة على باقي الأسئلة لاحقًا 😉`,
      token
    );

    return res.status(200).end();
  }

  res.status(200).end();
}

// ========== دالة إرسال الرسائل ==========
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
