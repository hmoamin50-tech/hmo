import TelegramBot from "node-telegram-bot-api";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// تأكد من إضافة خيار { polling: false } لأننا نستخدم Webhook
const bot = new TelegramBot(process.env.BOT_TOKEN, { 
  polling: false,
  webHook: {
    // سيتم تعيين هذا في setWebhook
    host: process.env.VERCEL_URL || 'localhost',
    port: process.env.PORT || 3000
  }
});

// أمر البداية
bot.onText(/\/start/, (msg) => {
  const user = msg.from;
  bot.sendMessage(
    msg.chat.id,
    `🚀 *أهلاً ${user.first_name}! 👋*\n\n` +
    `البوت شغال على *Vercel* بنجاح!\n\n` +
    `📋 *الأوامر المتاحة:*\n` +
    `✅ /start - بدء البوت\n` +
    `✅ /help - المساعدة\n` +
    `✅ /echo [نص] - إعادة النص\n` +
    `✅ /info - معلومات عن البوت\n` +
    `✅ /time - الوقت الحالي\n` +
    `✅ /calc [عملية] - آلة حاسبة\n` +
    `✅ /webhook - حالة Webhook\n\n` +
    `✍️ يمكنك إرسال أي نص وسأرد عليك!`,
    { parse_mode: 'Markdown' }
  );
});

// أمر المساعدة
bot.onText(/\/help/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `🆘 *كيف يمكنني مساعدتك؟*\n\n` +
    `📝 *قائمة الأوامر:*\n` +
    `└── /start - بدء البوت\n` +
    `└── /help - عرض هذه الرسالة\n` +
    `└── /echo [نص] - إعادة النص\n` +
    `└── /info - معلومات عن البوت\n` +
    `└── /time - الوقت الحالي\n` +
    `└── /calc [عملية] - آلة حاسبة\n` +
    `└── /webhook - حالة Webhook\n\n` +
    `💡 *مثال للآلة الحاسبة:*\n` +
    `\`/calc 5+3\` أو \`/calc 10/2\`\n\n` +
    `💡 *مثال للإعادة:*\n` +
    `\`/echo مرحباً بالجميع\``,
    { parse_mode: 'Markdown' }
  );
});

// أمر إعادة النص
bot.onText(/\/echo (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  
  if (text) {
    bot.sendMessage(
      chatId,
      `📝 *النص الذي كتبته:*\n\`\`\`\n${text}\n\`\`\``,
      { parse_mode: 'Markdown' }
    );
  } else {
    bot.sendMessage(
      chatId,
      '⚠️ *الرجاء إدخال نص بعد الأمر:*\n`/echo نصك هنا`',
      { parse_mode: 'Markdown' }
    );
  }
});

// أمر المعلومات
bot.onText(/\/info/, async (msg) => {
  const chatId = msg.chat.id;
  const user = msg.from;
  
  try {
    const botInfo = await bot.getMe();
    
    bot.sendMessage(
      chatId,
      `🤖 *معلومات البوت:*\n\n` +
      `🆔 *ID البوت:* \`${botInfo.id}\`\n` +
      `👤 *اسم المستخدم:* @${botInfo.username}\n` +
      `🏷️ *الاسم:* ${botInfo.first_name}\n` +
      `🌐 *النظام:* Vercel Serverless\n\n` +
      `👤 *معلوماتك:*\n` +
      `🆔 *ID:* \`${user.id}\`\n` +
      `👤 *الاسم:* ${user.first_name} ${user.last_name || ''}\n` +
      `${user.username ? `@${user.username}` : 'بدون معرف'}`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Error getting bot info:', error);
    bot.sendMessage(chatId, '❌ حدث خطأ أثناء جلب المعلومات');
  }
});

// أمر الوقت
bot.onText(/\/time/, (msg) => {
  const chatId = msg.chat.id;
  const now = new Date();
  
  const timeString = now.toLocaleString('ar-SA', {
    timeZone: 'Asia/Riyadh',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true
  });
  
  bot.sendMessage(
    chatId,
    `🕒 *الوقت الحالي:*\n${timeString}`,
    { parse_mode: 'Markdown' }
  );
});

// أمر الآلة الحاسبة
bot.onText(/\/calc (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const expression = match[1];
  
  if (!expression) {
    return bot.sendMessage(
      chatId,
      '⚠️ *الرجاء إدخال عملية حسابية:*\n`/calc 5+3` أو `/calc 10/2`',
      { parse_mode: 'Markdown' }
    );
  }
  
  try {
    // إزالة الأحرف غير المرغوب بها لأسباب أمنية
    const cleanExpression = expression.replace(/[^0-9+\-*/().\s]/g, '');
    
    // استخدام Function بدلاً من eval المباشر
    const calculate = new Function(`return ${cleanExpression}`);
    const result = calculate();
    
    if (isNaN(result) || !isFinite(result)) {
      throw new Error('نتيجة غير صالحة');
    }
    
    bot.sendMessage(
      chatId,
      `🧮 *نتيجة العملية:*\n\`\`\`\n${expression} = ${result}\n\`\`\``,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    bot.sendMessage(
      chatId,
      `❌ *خطأ في العملية الحسابية:*\n\`${expression}\`\n\n📌 *تأكد من صحة العملية*`,
      { parse_mode: 'Markdown' }
    );
  }
});

// أمر حالة Webhook
bot.onText(/\/webhook/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    const webhookInfo = await bot.getWebHookInfo();
    
    let status = '❌ غير مفعل';
    if (webhookInfo.url) {
      status = `✅ مفعل\n📌 الرابط: ${webhookInfo.url}`;
    }
    
    bot.sendMessage(
      chatId,
      `🔗 *حالة Webhook:*\n\n` +
      `${status}\n\n` +
      `📊 *المعلومات:*\n` +
      `- لديه شهادة SSL: ${webhookInfo.has_custom_certificate ? '✅' : '❌'}\n` +
      `- عدد التحديثات المعلقة: ${webhookInfo.pending_update_count}\n` +
      `- حدث آخر خطأ: ${webhookInfo.last_error_date ? 'نعم' : 'لا'}\n` +
      `- آخر وقت تلقينا فيه: ${webhookInfo.last_synchronization_error_date ? 'نعم' : 'لا'}`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Error getting webhook info:', error);
    bot.sendMessage(chatId, '❌ حدث خطأ أثناء جلب معلومات Webhook');
  }
});

// ردود ذكية على الرسائل النصية
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  
  // تجاهل الأوامر (تم معالجتها بالأوامر أعلاه)
  if (text && text.startsWith('/')) {
    return;
  }
  
  // إذا كان هناك نص
  if (text) {
    const message = text.toLowerCase();
    const user = msg.from.first_name;
    
    // ردود ذكية
    if (message.includes('مرحبا') || message.includes('السلام عليكم') || message.includes('اهلا')) {
      return bot.sendMessage(chatId, `وعليكم السلام ${user}! 😊 كيف يمكنني مساعدتك؟`);
    }
    
    if (message.includes('شكرا') || message.includes('مشكور') || message.includes('thanks')) {
      return bot.sendMessage(chatId, `العفو ${user}! 🤗 دائماً في خدمتك.`);
    }
    
    if (message.includes('كيف حالك') || message.includes('كيفك')) {
      return bot.sendMessage(chatId, `بخير والحمد لله ${user}! 😄 كيف حالك أنت؟`);
    }
    
    if (message.includes('اسمك') || message.includes('شسمك')) {
      return bot.sendMessage(chatId, `اسمي بوت! 🤖 طورني صديقك للعمل على Vercel.`);
    }
    
    // رد عام
    bot.sendMessage(
      chatId,
      `👋 *مرحباً ${user}!*\n\n` +
      `📨 *لقد استقبلت رسالتك:*\n\`\`\`\n${text}\n\`\`\`\n\n` +
      `💡 *اكتب* /help *لرؤية جميع الأوامر المتاحة*`,
      { parse_mode: 'Markdown' }
    );
  }
  
  // معالجة الملصقات
  if (msg.sticker) {
    bot.sendMessage(chatId, '😊 ملصق حلو! شكراً للمشاركة!');
  }
  
  // معالجة الصور
  if (msg.photo) {
    bot.sendMessage(chatId, '📸 صورة جميلة! شكراً للمشاركة.');
  }
  
  // معالجة الملفات
  if (msg.document) {
    bot.sendMessage(chatId, '📄 تم استلام الملف بنجاح! شكراً لك.');
  }
});

// معالجة الأخطاء
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

bot.on('webhook_error', (error) => {
  console.error('Webhook error:', error);
});

bot.on('error', (error) => {
  console.error('General error:', error);
});

// دالة لتعيين Webhook
async function setWebhook() {
  if (!process.env.BOT_TOKEN || !process.env.VERCEL_URL) {
    console.log('⚠️  يرجى تعيين BOT_TOKEN و VERCEL_URL في متغيرات البيئة');
    return;
  }
  
  const webhookUrl = `${process.env.VERCEL_URL}/api/bot`;
  
  try {
    const result = await bot.setWebHook(webhookUrl);
    console.log('✅ Webhook set successfully:', result);
    console.log('📌 Webhook URL:', webhookUrl);
    
    // الحصول على معلومات Webhook للتحقق
    const webhookInfo = await bot.getWebHookInfo();
    console.log('📊 Webhook info:', JSON.stringify(webhookInfo, null, 2));
  } catch (error) {
    console.error('❌ Failed to set webhook:', error);
  }
}

// تصدير الدالة الرئيسية لـ Vercel
export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      // معالجة البيانات القادمة من تيليجرام
      await bot.processUpdate(req.body);
      return res.status(200).json({ ok: true });
    }
    
    // GET request - عرض معلومات البوت
    if (req.method === "GET") {
      const botInfo = await bot.getMe().catch(() => null);
      
      return res.status(200).json({
        status: "online",
        service: "Telegram Bot",
        platform: "Vercel Serverless",
        bot: botInfo ? {
          id: botInfo.id,
          username: botInfo.username,
          name: botInfo.first_name
        } : "Not available",
        timestamp: new Date().toISOString(),
        endpoints: {
          webhook: "/api/bot (POST)",
          info: "/api/bot (GET)"
        },
        commands: ["/start", "/help", "/echo", "/info", "/time", "/calc", "/webhook"],
        note: "This bot is running on Vercel using node-telegram-bot-api"
      });
    }
    
    // طرق أخرى غير مسموحة
    return res.status(405).json({ error: "Method not allowed" });
    
  } catch (error) {
    console.error("Handler error:", error);
    return res.status(500).json({ 
      error: "Internal Server Error",
      message: error.message 
    });
  }
}

// إذا كان التشغيل مباشراً (ليس في Vercel)، قم بتعيين Webhook
if (process.env.NODE_ENV === 'development' || process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('🚀 Starting in development mode...');
  
  // تعيين Webhook عند التشغيل المحلي (إذا كان لدينا التوكن والرابط)
  if (process.env.BOT_TOKEN && process.env.VERCEL_URL) {
    setWebhook();
  } else {
    console.log('ℹ️  Set BOT_TOKEN and VERCEL_URL in .env file to enable webhook');
  }
}
