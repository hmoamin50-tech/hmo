const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');

const bot = new TelegramBot(process.env.BOT_TOKEN);

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// ذاكرة خفيفة (غير مضمونة لكنها مفيدة)
const conversations = new Map();

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(200).send('🤖 Bot is running');
  }

  const msg = req.body.message;
  if (!msg?.text) return res.status(200).end();

  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text.trim();

  // أوامر
  if (text.startsWith('/')) {
    await handleCommand(chatId, userId, text);
    return res.status(200).end();
  }

  try {
    // 1️⃣ رسالة فورية (إحساس سرعة)
    const thinkingMsg = await bot.sendMessage(
      chatId,
      '✍️ يكتب الآن...\n🤔 يفكر...'
    );

    // 2️⃣ تحضير السياق
    if (!conversations.has(userId)) {
      conversations.set(userId, [
        {
          role: 'user',
          parts: [{ text: 'أنت مساعد ذكي وسريع. أجب بالعربية وباختصار.' }]
        }
      ]);
    }

    const history = conversations.get(userId);
    history.push({ role: 'user', parts: [{ text }] });

    // تقليل السياق = سرعة
    const context = history.slice(-6);

    // 3️⃣ طلب Gemini
    const response = await fetch(
      `${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: context,
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 600
          }
        })
      }
    );

    const data = await response.json();

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'لم أتمكن من توليد رد واضح.';

    // حفظ رد البوت
    history.push({ role: 'model', parts: [{ text: reply }] });

    // تقليم الذاكرة
    if (history.length > 8) {
      conversations.set(userId, [
        history[0],
        ...history.slice(-6)
      ]);
    }

    // 4️⃣ تعديل رسالة "يفكر..." بدل إرسال رسالة جديدة (أسرع)
    await bot.editMessageText(reply, {
      chat_id: chatId,
      message_id: thinkingMsg.message_id
    });

  } catch (err) {
    console.error(err);
    await bot.sendMessage(chatId, '⚠️ حدث خطأ، حاول مرة أخرى.');
  }

  res.status(200).end();
};

// 🎯 الأوامر
async function handleCommand(chatId, userId, command) {
  switch (command) {
    case '/start':
      await bot.sendMessage(
        chatId,
        `🚀 أهلاً بك!\n\nأنا بوت Gemini السريع ⚡\nأكتب… أفكر… ثم أجيب 😉\n\nاكتب سؤالك الآن`
      );
      break;

    case '/help':
      await bot.sendMessage(
        chatId,
        `/start بدء البوت\n/help المساعدة\n/clear مسح الذاكرة\n\n💡 يتم إظهار (يكتب – يفكر) لراحة المستخدم`,
        { parse_mode: 'Markdown' }
      );
      break;

    case '/clear':
      conversations.delete(userId);
      await bot.sendMessage(chatId, '🧹 تم مسح ذاكرة المحادثة.');
      break;

    default:
      await bot.sendMessage(chatId, '❓ أمر غير معروف، جرّب /help');
  }
}
