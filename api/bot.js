const { Telegraf } = require('telegraf');

// إنشاء البوت
const bot = new Telegraf(process.env.BOT_TOKEN);

// أمر البداية
bot.start((ctx) => {
  ctx.reply('🚀 *مرحباً! أنا بوت يعمل على Vercel!*\n\n' +
    '📋 *الأوامر المتاحة:*\n' +
    '✅ /start - بدء البوت\n' +
    '✅ /help - المساعدة\n' +
    '✅ /echo [نص] - إعادة النص\n' +
    '✅ /info - معلومات عن البوت\n' +
    '✅ /time - الوقت الحالي\n' +
    '✅ /calc [عملية] - آلة حاسبة\n\n' +
    '✍️ يمكنك أيضاً إرسال أي نص وسأرد عليك!', {
    parse_mode: 'Markdown'
  });
});

// أمر المساعدة
bot.help((ctx) => {
  ctx.reply('🆘 *كيف يمكنني مساعدتك؟*\n\n' +
    '📝 *قائمة الأوامر:*\n' +
    '└── /start - بدء البوت\n' +
    '└── /help - عرض هذه الرسالة\n' +
    '└── /echo [نص] - إعادة النص الذي تكتبه\n' +
    '└── /info - معلومات عن البوت\n' +
    '└── /time - عرض الوقت الحالي\n' +
    '└── /calc [عملية] - آلة حاسبة\n\n' +
    '💡 *مثال للآلة الحاسبة:*\n' +
    '`/calc 5+3` أو `/calc 10/2`', {
    parse_mode: 'Markdown'
  });
});

// أمر إعادة النص
bot.command('echo', (ctx) => {
  const text = ctx.message.text.split(' ').slice(1).join(' ');
  if (text) {
    ctx.reply(`📝 *النص الذي كتبته:*\n\`\`\`\n${text}\n\`\`\``, {
      parse_mode: 'Markdown'
    });
  } else {
    ctx.reply('⚠️ *الرجاء إدخال نص بعد الأمر:*\n`/echo نصك هنا`', {
      parse_mode: 'Markdown'
    });
  }
});

// أمر المعلومات
bot.command('info', (ctx) => {
  const user = ctx.from;
  ctx.reply(
    `🤖 *معلومات البوت:*\n\n` +
    `🆔 *ID البوت:* \`${ctx.botInfo.id}\`\n` +
    `👤 *اسم المستخدم:* @${ctx.botInfo.username}\n` +
    `🏷️ *الاسم:* ${ctx.botInfo.first_name}\n` +
    `🌐 *النظام:* Vercel Serverless\n\n` +
    `👤 *معلوماتك:*\n` +
    `🆔 *ID:* \`${user.id}\`\n` +
    `👤 *الاسم:* ${user.first_name} ${user.last_name || ''}\n` +
    `@${user.username || 'بدون معرف'}`, {
    parse_mode: 'Markdown'
  });
});

// أمر الوقت
bot.command('time', (ctx) => {
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
  
  ctx.reply(`🕒 *الوقت الحالي:*\n${timeString}`, {
    parse_mode: 'Markdown'
  });
});

// أمر الآلة الحاسبة
bot.command('calc', (ctx) => {
  const expression = ctx.message.text.split(' ').slice(1).join(' ');
  
  if (!expression) {
    return ctx.reply('⚠️ *الرجاء إدخال عملية حسابية:*\n`/calc 5+3` أو `/calc 10/2`', {
      parse_mode: 'Markdown'
    });
  }
  
  try {
    // إزالة الأحرف غير المرغوب بها لأسباب أمنية
    const cleanExpression = expression.replace(/[^0-9+\-*/().\s]/g, '');
    
    // استخدام Function لأسباب أمنية بدلاً من eval المباشر
    const calculate = new Function(`return ${cleanExpression}`);
    const result = calculate();
    
    if (isNaN(result)) {
      throw new Error('نتيجة غير رقمية');
    }
    
    ctx.reply(`🧮 *نتيجة العملية:*\n\`\`\`\n${expression} = ${result}\n\`\`\``, {
      parse_mode: 'Markdown'
    });
  } catch (error) {
    ctx.reply(`❌ *خطأ في العملية الحسابية:*\n\`${expression}\`\n\n📌 *تأكد من صحة العملية*`, {
      parse_mode: 'Markdown'
    });
  }
});

// رد على رسائل Sticker
bot.on('sticker', (ctx) => {
  ctx.reply('😊 شكراً للملصق! إرسال رائع!');
});

// رد على صور
bot.on('photo', (ctx) => {
  ctx.reply('📸 صورة جميلة! شكراً للمشاركة.');
});

// رد على المستندات
bot.on('document', (ctx) => {
  ctx.reply('📄 تم استلام الملف بنجاح!');
});

// رد عام على الرسائل النصية
bot.on('text', (ctx) => {
  const message = ctx.message.text.toLowerCase();
  const user = ctx.from.first_name;
  
  // ردود ذكية
  if (message.includes('مرحبا') || message.includes('السلام عليكم')) {
    return ctx.reply(`وعليكم السلام ${user}! كيف يمكنني مساعدتك؟`);
  }
  
  if (message.includes('شكرا') || message.includes('مشكور')) {
    return ctx.reply(`العفو ${user}! 😊 دائماً في خدمتك.`);
  }
  
  if (message.includes('كيف حالك')) {
    return ctx.reply(`بخير والحمد لله ${user}! كيف حالك أنت؟`);
  }
  
  // رد عام
  ctx.reply(`👋 *مرحباً ${user}!*\n\n📨 لقد استقبلت رسالتك:\n\`\`\`\n${ctx.message.text}\n\`\`\`\n\n💡 *اكتب* /help *لرؤية جميع الأوامر المتاحة*`, {
    parse_mode: 'Markdown'
  });
});

// معالجة الأخطاء
bot.catch((err, ctx) => {
  console.error(`❌ خطأ في التحديث ${ctx.update.update_id}:`, err);
  
  try {
    ctx.reply('⚠️ *عذراً، حدث خطأ ما!*\n\n🔧 تم إعلام المطور بالمشكلة.', {
      parse_mode: 'Markdown'
    });
  } catch (e) {
    console.error('❌ فشل في إرسال رسالة الخطأ:', e);
  }
});

// معالج الطلبات لـ Vercel
module.exports = async (req, res) => {
  // إرجاع رسالة ترحيبية لطلبات GET
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'online',
      service: 'Telegram Bot',
      platform: 'Vercel Serverless',
      timestamp: new Date().toISOString(),
      endpoints: {
        webhook: '/api/bot (POST)',
        health: '/api/bot (GET)'
      },
      commands: ['/start', '/help', '/echo', '/info', '/time', '/calc']
    });
  }
  
  // معالجة طلبات POST من Telegram
  if (req.method === 'POST') {
    try {
      // التحقق من أن الطلب يأتي من Telegram (بسيط)
      if (!req.body || !req.body.update_id) {
        return res.status(400).json({ error: 'Invalid Telegram update' });
      }
      
      console.log('📥 Received update:', req.body.update_id);
      
      // معالجة التحديث
      await bot.handleUpdate(req.body);
      
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('❌ Error handling update:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        details: error.message 
      });
    }
  }
  
  // رفض طرق HTTP الأخرى
  return res.status(405).json({ error: 'Method not allowed' });
};

// وظيفة مساعدة لاختبار البوت محلياً
if (process.env.NODE_ENV === 'development') {
  console.log('🚀 Starting bot in development mode...');
  
  bot.launch()
    .then(() => {
      console.log('✅ Bot is running locally!');
      console.log('🤖 Bot info:', bot.botInfo);
    })
    .catch((err) => {
      console.error('❌ Failed to start bot:', err);
    });
  
  // إيقاف البوت بشكل أنيق
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
