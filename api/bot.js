import fs from "fs";
import path from "path";

const novelsPath = path.join(process.cwd(), "data/novels.json");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("📚 Novel Bot is running");
  }

  const message = req.body.message;
  if (!message) return res.status(200).end();

  const chatId = message.chat.id;
  const text = message.text?.trim();

  if (!text) return res.status(200).end();

  if (text === "/start") {
    await sendMessage(chatId,
`📚 أهلاً بك في بوت تحميل الروايات
✍️ اكتب اسم الرواية فقط
مثال: أرض زيكولا`);
    return res.status(200).end();
  }

  const novels = JSON.parse(fs.readFileSync(novelsPath, "utf8"));

  const results = novels.filter(n =>
    n.title.includes(text)
  );

  if (results.length === 0) {
    await sendMessage(chatId, "❌ لم يتم العثور على الرواية");
    return res.status(200).end();
  }

  for (const novel of results) {
    await sendDocument(chatId, novel.pdf, `${novel.title} - ${novel.author}`);
  }

  res.status(200).end();
}

// 🔹 إرسال رسالة
async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text })
  });
}

// 🔹 إرسال PDF
async function sendDocument(chatId, fileUrl, caption) {
  await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendDocument`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      document: fileUrl,
      caption
    })
  });
}
