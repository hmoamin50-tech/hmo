export default async function handler(req, res) {
    const token = process.env.BOT_TOKEN;

    // التأكد أن الطلب قادم من تليجرام (POST)
    if (req.method === "POST") {
        const update = req.body;

        if (update.message) {
            const chatId = update.message.chat.id;
            const text = update.message.text;

            // إرسال رد بنفس النص
            const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
            
            await fetch(telegramUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: `وصلت رسالتك: ${text}`
                })
            });
        }
        return res.status(200).send("ok");
    }

    // إذا فتحت الرابط في المتصفح يظهر هذا النص
    res.status(200).send("البوت يعمل وينتظر رسائل تليجرام...");
}
