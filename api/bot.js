import fetch from "node-fetch";

// ملاحظة: States هنا ستضيع بمجرد توقف الخادم في Vercel
let states = {}; 
let answers = {};

export default async function handler(req, res) {
    const token = process.env.BOT_TOKEN;
    if (req.method !== "POST") return res.status(200).send("Running");

    const update = req.body;
    if (!update) return res.end();

    const chatId = update.message?.chat.id || update.callback_query?.message.chat.id;

    try {
        // معالجة أمر البداية
        if (update.message?.text === "/start") {
            states[chatId] = "q1";
            answers[chatId] = {};
            await sendMessage(chatId, "🧩 *تحدي: اعرف مدى تناسقك*\n\nهل أنت مغرم بأحدهم؟", token, [["نعم", "لا"]]);
            return res.status(200).json({ status: "ok" });
        }

        // معالجة الأزرار (Callback Queries)
        if (update.callback_query) {
            const data = update.callback_query.data;
            const currentState = states[chatId];

            if (currentState === "q1") {
                answers[chatId].inLove = data;
                states[chatId] = "q2";
                await sendMessage(chatId, "هل سبق لك أن أحببت شخصًا غيره؟", token, [["نعم", "لا"]]);
            } else if (currentState === "q5") {
                answers[chatId].happy = data;
                states[chatId] = "q6";
                await sendMessage(chatId, "صف حياتك الآن بكلمات صادقة…", token);
            }
            return res.status(200).json({ status: "ok" });
        }

        // معالجة النصوص
        if (update.message?.text) {
            const text = update.message.text;
            const currentState = states[chatId];

            if (currentState === "q3") {
                answers[chatId].oldLove = Number(text);
                states[chatId] = "q4";
                await sendMessage(chatId, "أدخل نسبة حبك للشخص الحالي (0 – 100)", token);
            } else if (currentState === "q4") {
                answers[chatId].newLove = Number(text);
                states[chatId] = "q5";
                await sendMessage(chatId, "هل تشعر بالسعادة الآن؟", token, [["نعم", "لا"]]);
            } else if (currentState === "q6") {
                // حساب النتيجة وعرضها (بدون حفظ في ملف fs)
                const attraction = (answers[chatId].newLove || 0) * 0.7 + (answers[chatId].oldLove || 0) * 0.3;
                await sendMessage(chatId, `🔮 *النتيجة النهائية*\n\nنسبة الانجذاب: *${Math.round(attraction)}%*`, token);
                delete states[chatId]; // إنهاء الجلسة
            }
        }
    } catch (error) {
        console.error("Error:", error);
    }

    res.status(200).send("ok");
}

async function sendMessage(chatId, text, token, buttons = null) {
    const API = `https://api.telegram.org/bot${token}/sendMessage`;
    const body = { chat_id: chatId, text, parse_mode: "Markdown" };
    if (buttons) {
        body.reply_markup = {
            inline_keyboard: buttons.map(r => r.map(b => ({ text: b, callback_data: b })))
        };
    }

    await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
}
