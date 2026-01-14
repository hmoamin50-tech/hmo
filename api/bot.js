export default async function handler(req, res) {
  const TOKEN = process.env.BOT_TOKEN;
  const API = `https://api.telegram.org/bot${TOKEN}/sendMessage`;

  if (req.method !== "POST") {
    return res.status(200).send("Bot is running 🤖");
  }

  const body = req.body;
  const chatId = body.message?.chat?.id;
  const text = body.message?.text;

  if (!chatId) return res.status(200).end();

  let reply = "👋 مرحباً بك";

  if (text === "/start") {
    reply = "🔥 أهلاً بك في بوت HMO (Node.js)";
  } else {
    reply = `✉️ رسالتك: ${text}`;
  }

  await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: reply
    })
  });

  res.status(200).end();
    }
