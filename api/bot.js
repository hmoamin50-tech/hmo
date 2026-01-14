import fs from "fs";
import path from "path";

const dataPath = path.join(process.cwd(), "data/novels.json");
const pdfsPath = path.join(process.cwd(), "pdfs");
const novels = JSON.parse(fs.readFileSync(dataPath, "utf8"));

const API = (token, method) =>
  `https://api.telegram.org/bot${token}/${method}`;

export default async function handler(req, res) {
  const token = process.env.BOT_TOKEN;

  if (req.method !== "POST") {
    return res.status(200).send("📚 Novel Bot Running");
  }

  const update = req.body;

  // ========= START =========
  if (update.message?.text === "/start") {
    await sendCategories(update.message.chat.id, token);
    return res.status(200).end();
  }

  // ========= CALLBACK =========
  if (update.callback_query) {
    const chatId = update.callback_query.message.chat.id;
    const data = update.callback_query.data;

    if (data === "back_categories") {
      await sendCategories(chatId, token);
    }

    if (data.startsWith("cat_")) {
      const category = data.replace("cat_", "");
      await sendNovelsByCategory(chatId, category, token);
    }

    if (data.startsWith("novel_")) {
      const id = parseInt(data.replace("novel_", ""));
      const novel = novels.find(n => n.id === id);
      if (novel) {
        await sendNovelDetails(chatId, novel, token);
      }
    }
  }

  res.status(200).end();
}

// ============ UI FUNCTIONS ============

async function sendCategories(chatId, token) {
  const categories = [...new Set(novels.map(n => n.category))];

  const keyboard = categories.map(cat => [
    { text: cat, callback_data: `cat_${cat}` }
  ]);

  await fetch(API(token, "sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: "📚 اختر نوع الرواية:",
      reply_markup: { inline_keyboard: keyboard }
    })
  });
}

async function sendNovelsByCategory(chatId, category, token) {
  const list = novels
    .filter(n => n.category === category)
    .map(n => [{ text: n.title, callback_data: `novel_${n.id}` }]);

  list.push([{ text: "🔙 رجوع للأنواع", callback_data: "back_categories" }]);

  await fetch(API(token, "sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: `📖 روايات ${category}:`,
      reply_markup: { inline_keyboard: list }
    })
  });
}

async function sendNovelDetails(chatId, novel, token) {
  // إرسال وصف أولاً
  await fetch(API(token, "sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text:
`📘 *${novel.title}*
✍️ ${novel.author}

📝 ${novel.description}`,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 رجوع للأنواع", callback_data: "back_categories" }]
        ]
      }
    })
  });

  // إرسال PDF مباشرة
  const pdfPath = path.join(pdfsPath, novel.file);
  const fileData = fs.readFileSync(pdfPath, { encoding: 'base64' });

  await fetch(API(token, "sendDocument"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      document: `data:application/pdf;base64,${fileData}`,
      caption: `⬇️ ${novel.title}`
    })
  });
        }
