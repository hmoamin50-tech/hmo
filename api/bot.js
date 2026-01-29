import fetch from "node-fetch";
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // 1. استلام بيانات تليجرام (Webhook)
    const { message } = req.body;
    
    // إذا لم تكن هناك رسالة نصية، نتجاهل الطلب
    if (!message || !message.text) {
      return res.status(200).json({ status: "No message text" });
    }

    const userText = message.text;
    const chatId = message.chat.id;

    // 2. التحقق من مفاتيح الربط
    const BOT_TOKEN = process.env.BOT_TOKEN;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!BOT_TOKEN || !GEMINI_API_KEY) {
      return res.status(500).json({ error: "Missing API Keys" });
    }

    // 3. إرسال النص إلى Gemini AI لمعالجته
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(userText);
    const aiResponse = result.response.text();

    // 4. إرسال رد الذكاء الاصطناعي إلى تليجرام
    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: aiResponse,
      }),
    });

    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
