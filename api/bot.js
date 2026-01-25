// api/webhook.js
module.exports = async (req, res) => {
  // 1. التحقق من الـ Webhook (GET Request)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // ضع كلمة سر خاصة بك هنا (Verify Token)
    const MY_VERIFY_TOKEN = '6edeee6dea04939dfe8b272ba309372a'; 

    if (mode && token === MY_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    } else {
      return res.status(403).send('Forbidden');
    }
  }

  // 2. استقبال البيانات (POST Request)
  if (req.method === 'POST') {
    const body = req.body;

    if (body.object === 'page' || body.object === 'instagram') {
      console.log('Received Webhook:', JSON.stringify(body, null, 2));
      
      // هنا يمكنك استخدام الـ Access Token الخاص بك للرد على الرسائل
      // مثال: sendAction(body.entry[0].messaging[0].sender.id, "Hello!");

      return res.status(200).send('EVENT_RECEIVED');
    } else {
      return res.status(404).end();
    }
  }
};
