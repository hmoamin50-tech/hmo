export default async function handler(req, res) {
    const token = process.env.BOT_TOKEN;

    if (req.method === "POST") {
        const update = req.body;

        // إذا كانت هناك رسالة نصية
        if (update.message?.text) {
            const chatId = update.message.chat.id;
            const userText = update.message.text;

            let replyText = "هلا"; // الرد الافتراضي

            // إرسال الرد باستخدام fetch المدمج في Node.js
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: replyText
                })
            });
        }
        return res.status(200).send("ok");
    }

    // رسالة التأكد عند فتح الرابط في المتصفح
    res.status(200).send("البوت جاهز للاستخدام...");
}
