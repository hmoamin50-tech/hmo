export default async function handler(req, res) {
    // عملية التحقق (Verification) - تطلبها Meta عند الحفظ لأول مرة
    if (req.method === 'GET') {
        const verify_token = '6edeee6dea04939dfe8b272ba309372a'; // يجب أن تطابق ما ستكتبه في خانة "تحقق من الرمز"
        
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode && token) {
            if (mode === 'subscribe' && token === verify_token) {
                return res.status(200).send(challenge);
            } else {
                return res.status(403).end();
            }
        }
    }

    // استقبال الرسائل (POST)
    if (req.method === 'POST') {
        const body = req.body;

        if (body.object === 'whatsapp_business_account') {
            // هنا تصلك بيانات الرسائل، يمكنك استخدام الـ Access Token لإرسال رد
            console.log("رسالة جديدة واصلة:", JSON.stringify(body, null, 2));
            return res.status(200).send('EVENT_RECEIVED');
        } else {
            return res.status(404).end();
        }
    }
}
