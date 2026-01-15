// api/bot.js - بوت الدفعات المعنوية حسب الاسم
import fetch from 'node-fetch';

console.log('🚀 بدء تشغيل بوت الدفعات المعنوية...');

// إعدادات البيئة
const BOT_TOKEN = process.env.BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyC6J7E8sx2RfXZLc_ybffvFp7FP2htfP-M";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// قاعدة بيانات الاسماء والصفات (يمكن استبدالها بقاعدة بيانات حقيقية)
const NAME_MOTIVATIONS = {
    "محمد": "أنت مبارك الاسم والصفات، اسمك يعني كثير المحامد والصفات الحسنة 🌟",
    "أحمد": "اسمك يعني كثير الحمد، فكن دائماً محمود الصفات 🌺",
    "علي": "أنت العالي الشأن، اسمك يدل على الرفعة والعلو 🦅",
    "فاطمة": "يا فاطمة، أنت المفضلة عند الله، اسمك يعني الفطام عن كل سوء 🌷",
    "خالد": "يا خالد، اسمك يعني البقاء والدوام، فكن خالد الذكر 🏆",
    "نور": "أنت نور الحياة، تنيرين الدرب لكل من حولك ✨",
    "سارة": "يا سارة، اسمك يعني البهجة والسرور، فأني سرور لمن حولك 😊",
    "يوسف": "يا يوسف، أنت جميل كالنبي يوسف، جمالك ليس في المظهر فقط بل في القلب أيضًا 💖",
    "مريم": "يا مريم، اسمك يعني العبادة والطاعة، فأني طاهرة القلب والنفس 🙏",
    "عمر": "يا عمر، اسمك يعني العمر المديد والعطاء المستمر 🌱"
};

// أسماء مستعارة وألقاب
const NICKNAME_MOTIVATIONS = {
    "الأسد": "🦁 أنت قوي كالأسد، شجاع ولا تستسلم",
    "الصقر": "🦅 نظرتك ثاقبة كالصقر، طموحك عالٍ",
    "النمر": "🐯 أنت سريع البديهة وحاد الذكاء",
    "الطائر": "🐦 روحك حرة كالطير، طموحك لا يعرف الحدود",
    "الشمس": "☀️ تنيرين حياة من حولك كالشمس",
    "القمر": "🌙 جمالك يشرق في الظلام كالقمر",
    "النجمة": "⭐ تألقي في السماء، فأنت فريدة ومتميزة",
    "الزهرة": "🌺 رائحتك عبقة ووجودك يبهج النفوس",
    "البحر": "🌊 أنت واسع الصدر وعميق كالبحر",
    "الجبل": "⛰️ ثابت لا تتزعزع، صبور وقوي"
};

// توليد دفعة معنوية حسب الاسم
function generateNameMotivation(name, gender = 'male') {
    const lowerName = name.toLowerCase();
    
    // التحقق من وجود الاسم في القاموس
    for (const [key, value] of Object.entries(NAME_MOTIVATIONS)) {
        if (lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)) {
            return value;
        }
    }
    
    // التحقق من الألقاب
    for (const [nickname, motivation] of Object.entries(NICKNAME_MOTIVATIONS)) {
        if (lowerName.includes(nickname.toLowerCase())) {
            return motivation;
        }
    }
    
    // استخدام Gemini للاسماء الجديدة
    return getCustomNameMotivation(name, gender);
}

// الحصول على دفعة معنوية مخصصة من Gemini
async function getCustomNameMotivation(name, gender) {
    try {
        const genderText = gender === 'female' ? 'أنثى' : 'ذكر';
        const prompt = `اكتب دفعة معنوية إيجابية قصيرة باللغة العربية لشخص اسمه "${name}" وهو ${genderText}. 
        يجب أن تكون الرسالة:
        1. إيجابية ومحفزة
        2. مرتبطة بالاسم ومعناه
        3. لا تتجاوز 3 سطور
        4. تحتوي على إيموجي مناسب
        5. تكون شخصية ومباشرة
        
        مثال: "يا ${name}، اسمك يعني القوة والعطاء، فكن دائماً مصدر إلهام لمن حولك 🌟"`;
        
        const payload = {
            contents: [{
                parts: [{ text: prompt }]
            }]
        };
        
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error('فشل في الاتصال بـ Gemini');
        }
        
        const data = await response.json();
        const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        return aiResponse || generateDefaultMotivation(name, gender);
        
    } catch (error) {
        console.error('خطأ في Gemini:', error);
        return generateDefaultMotivation(name, gender);
    }
}

// دفعة افتراضية إذا فشل Gemini
function generateDefaultMotivation(name, gender) {
    const greetings = gender === 'female' 
        ? ["يا جميلة", "يا روحي", "يا حبيبتي", "يا قمر"]
        : ["يا غالي", "يا حبيبي", "يا بطل", "يا أسد"];
    
    const traits = [
        "أنت شخص مميز وفريد 🌟",
        "لديك طاقة إيجابية رائعة ✨",
        "تبث الأمل في كل من حولك 💖",
        "وجودك يضيف بهجة للحياة 😊",
        "أنت مصدر إلهام للجميع 🦋"
    ];
    
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    const trait = traits[Math.floor(Math.random() * traits.length)];
    
    return `${greeting} ${name}، ${trait}`;
}

// دالة إرسال رسالة تيليجرام
async function sendTelegramMessage(chatId, text, options = {}) {
    try {
        const payload = {
            chat_id: chatId,
            text: text,
            parse_mode: "Markdown",
            disable_web_page_preview: true,
            ...options
        };
        
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        return await response.json();
    } catch (error) {
        console.error('خطأ في إرسال الرسالة:', error);
        throw error;
    }
}

// دالة إرسال حالة الكتابة
async function sendTypingAction(chatId) {
    try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendChatAction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                action: "typing"
            })
        });
    } catch (error) {
        console.error('خطأ في حالة الكتابة:', error);
    }
}

// Main Handler
export default async function handler(req, res) {
    console.log('\n=== 📥 طلب جديد ===');
    
    // الرد على GET للتحقق
    if (req.method === 'GET') {
        return res.status(200).json({
            status: "✅ نشط",
            name: "بوت الدفعات المعنوية حسب الاسم",
            description: "يرسل دفعات معنوية مخصصة حسب اسم المستخدم",
            commands: [
                "/start - بدء البوت",
                "/motivate [الاسم] - دفعة معنوية حسب الاسم",
                "/nickname [اللقب] - دفعة حسب اللقب",
                "/list - عرض الأسماء المدعومة",
                "/help - المساعدة"
            ]
        });
    }
    
    // معالجة POST من تيليجرام
    if (req.method === 'POST') {
        if (!BOT_TOKEN) {
            return res.status(500).json({ error: "BOT_TOKEN مطلوب" });
        }
        
        const update = req.body;
        
        if (!update.message) {
            return res.status(200).json({ ok: true });
        }
        
        const chatId = update.message.chat.id;
        const userId = update.message.from.id;
        const firstName = update.message.from.first_name || "صديقي";
        const lastName = update.message.from.last_name || "";
        const fullName = `${firstName} ${lastName}`.trim();
        const username = update.message.from.username;
        const text = update.message.text || "";
        
        // أمر /start
        if (text === '/start') {
            const welcomeMessage = `🎉 *مرحباً ${firstName}!* 🌟\n\n` +
                `*أنا بوت الدفعات المعنوية حسب الاسم* 💖\n\n` +
                `✨ *ماذا أفعل؟* ✨\n` +
                `أرسل لك دفعات معنوية إيجابية مخصصة حسب اسمك أو لقبك! 🎯\n\n` +
                `*الأوامر المتاحة:*\n` +
                `/start - بدء البوت\n` +
                `/motivate [الاسم] - دفعة معنوية حسب الاسم\n` +
                `/motivate - دفعة معنوية باسمك\n` +
                `/nickname [اللقب] - دفعة حسب اللقب\n` +
                `/list - عرض الأسماء المدعومة\n` +
                `/help - المساعدة\n\n` +
                `*جرب الآن:*\n` +
                `اكتب /motivate للحصول على دفعة معنوية باسمك ✨`;
            
            await sendTelegramMessage(chatId, welcomeMessage);
            return res.status(200).json({ ok: true });
        }
        
        // أمر /help
        if (text === '/help') {
            const helpMessage = `🆘 *مساعدة - بوت الدفعات المعنوية* 🆘\n\n` +
                `*كيفية الاستخدام:*\n` +
                `1. اكتب /motivate للحصول على دفعة معنوية باسمك\n` +
                `2. اكتب /motivate [اسم آخر] لدفعة معنوية لشخص آخر\n` +
                `3. اكتب /nickname [اللقب] لدفعة حسب اللقب\n` +
                `4. استخدم /list لرؤية الأسماء المدعومة\n\n` +
                `*أمثلة:*\n` +
                `/motivate محمد\n` +
                `/nickname الأسد\n` +
                `/motivate فاطمة\n\n` +
                `🌸 *تذكر:* الدفعات المعنوية تزيد من طاقتك الإيجابية!`;
            
            await sendTelegramMessage(chatId, helpMessage);
            return res.status(200).json({ ok: true });
        }
        
        // أمر /list
        if (text === '/list') {
            const namesList = Object.keys(NAME_MOTIVATIONS).join(', ');
            const nicknamesList = Object.keys(NICKNAME_MOTIVATIONS).join(', ');
            
            const listMessage = `📋 *الأسماء المدعومة:*\n\n` +
                `*الأسماء الشخصية:*\n${namesList}\n\n` +
                `*الألقاب:*\n${nicknamesList}\n\n` +
                `✨ *يمكنك تجربة أي اسم آخر وسأحاول إنشاء دفعة خاصة به!*`;
            
            await sendTelegramMessage(chatId, listMessage);
            return res.status(200).json({ ok: true });
        }
        
        // أمر /motivate بدون اسم
        if (text === '/motivate') {
            await sendTypingAction(chatId);
            
            // استخدام اسم المستخدم من تيليجرام
            const motivation = await generateNameMotivation(firstName);
            
            const message = `💫 *دفعة معنوية لـ ${firstName}* 💫\n\n` +
                `${motivation}\n\n` +
                `✨ *تذكر دائماً:*\n` +
                `أنت شخص مميز وفريد من نوعه!\n` +
                `لديك طاقات كامنة تنتظر الاكتشاف!`;
            
            await sendTelegramMessage(chatId, message);
            return res.status(200).json({ ok: true });
        }
        
        // أمر /motivate مع اسم
        if (text.startsWith('/motivate ')) {
            const name = text.replace('/motivate ', '').trim();
            
            if (!name) {
                await sendTelegramMessage(chatId, "⚠️ *الرجاء كتابة اسم بعد الأمر*\nمثال: `/motivate محمد`");
                return res.status(200).json({ ok: true });
            }
            
            await sendTypingAction(chatId);
            
            // تحديد الجنس إذا كان الاسم أنثوي
            const femaleNames = ["فاطمة", "مريم", "سارة", "نور", "عائشة", "خديجة", "زينب", "هناء", "رحمة", "لينا"];
            const gender = femaleNames.includes(name) ? 'female' : 'male';
            
            const motivation = await generateNameMotivation(name, gender);
            
            const message = `💫 *دفعة معنوية لـ ${name}* 💫\n\n` +
                `${motivation}\n\n` +
                `🌺 *رسالة خاصة:*\n` +
                `اسمك جميل كما أنت، احمله بفخر!`;
            
            await sendTelegramMessage(chatId, message);
            return res.status(200).json({ ok: true });
        }
        
        // أمر /nickname
        if (text.startsWith('/nickname ')) {
            const nickname = text.replace('/nickname ', '').trim();
            
            if (!nickname) {
                await sendTelegramMessage(chatId, "⚠️ *الرجاء كتابة لقب بعد الأمر*\nمثال: `/nickname الأسد`");
                return res.status(200).json({ ok: true });
            }
            
            // البحث عن اللقب
            let motivation = NICKNAME_MOTIVATIONS[nickname];
            
            if (!motivation) {
                // محاولة البحث الجزئي
                for (const [key, value] of Object.entries(NICKNAME_MOTIVATIONS)) {
                    if (nickname.toLowerCase().includes(key.toLowerCase()) || 
                        key.toLowerCase().includes(nickname.toLowerCase())) {
                        motivation = value;
                        break;
                    }
                }
            }
            
            if (!motivation) {
                // إنشاء دفعة جديدة للقب
                motivation = `أنت ${nickname}، شخصية قوية وفريدة ✨\nلديك ما يميزك عن الآخرين 🌟`;
            }
            
            const message = `🦁 *دفعة معنوية للقب: ${nickname}* 🦁\n\n` +
                `${motivation}\n\n` +
                `🔥 *تذكر:*\n` +
                `اللقب يعكس جزءاً من شخصيتك المميزة!`;
            
            await sendTelegramMessage(chatId, message);
            return res.status(200).json({ ok: true });
        }
        
        // الرد على الرسائل العادية
        if (text && !text.startsWith('/')) {
            // إذا كان المستخدم يكتب اسم فقط
            if (text.split(' ').length === 1 && text.length < 20) {
                const possibleName = text.trim();
                const nameRegex = /^[\u0600-\u06FF\s]+$/; // للاسماء العربية
                
                if (nameRegex.test(possibleName)) {
                    await sendTypingAction(chatId);
                    
                    const motivation = await generateNameMotivation(possibleName);
                    
                    const reply = `💖 *يا ${possibleName}* 💖\n\n` +
                        `${motivation}\n\n` +
                        `✨ *نصيحة اليوم:*\n` +
                        `حافظ على اسمك طاهراً كما ولدت!`;
                    
                    await sendTelegramMessage(chatId, reply);
                    return res.status(200).json({ ok: true });
                }
            }
            
            // رد عادي
            const defaultReply = `🌟 *مرحباً ${firstName}!* 🌟\n\n` +
                `يمكنني إعطاؤك دفعة معنوية رائعة! ✨\n\n` +
                `*جرب أحد هذه الأوامر:*\n` +
                `/motivate - للحصول على دفعة معنوية باسمك\n` +
                `/motivate [اسم] - دفعة لشخص آخر\n` +
                `/nickname [لقب] - دفعة حسب اللقب\n` +
                `/list - لرؤية الأسماء المدعومة\n\n` +
                `💬 *اكتب اسمك فقط وسأرد بدفعة معنوية لك!*`;
            
            await sendTelegramMessage(chatId, defaultReply);
            return res.status(200).json({ ok: true });
        }
    }
    
    return res.status(200).json({ ok: true });
}

console.log('\n=== ✅ بوت الدفعات المعنوية جاهز ===');
console.log('✨ المميزات:');
console.log('- دفعات معنوية حسب الاسم');
console.log('- دعم الألقاب والكنى');
console.log('- تكامل مع Gemini AI');
console.log('- قاعدة بيانات أسماء مدمجة');
console.log('====================================');
