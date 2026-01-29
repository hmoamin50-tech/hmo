export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("OK");
  }

  const BOT_TOKEN = process.env.BOT_TOKEN;
  const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

  const update = req.body;

  // لو ما فيه رسالة
  if (!update.message) {
    return res.status(200).send("No message");
  }

  const chatId = update.message.chat.id;
  const text = update.message.text;

  let reply = "👋 أهلًا! اكتب أي شيء.";

  if (text === "/start") {
    reply = "✅ البوت شغّال!\nاكتب أي رسالة.";
  } else if (text.toLowerCase() === "hi") {
    reply = "😄 هلا والله!";
  } else if (text === "هلا") {
    reply = "👋 أهلين وسهلين";
  }

  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: reply,
    }),
  });

  return res.status(200).send("OK");
}
