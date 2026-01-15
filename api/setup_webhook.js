// setup-webhook.js
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const VERCEL_URL = process.env.VERCEL_URL || "https://hmo-beige.vercel.app";

async function setupWebhook() {
  if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN غير موجود في .env');
    process.exit(1);
  }
  
  console.log('🔧 إعداد Webhook...');
  console.log(`🌐 VERCEL_URL: ${VERCEL_URL}`);
  
  try {
    // 1. حذف Webhook القديم
    console.log('🗑️ حذف Webhook القديم...');
    const deleteResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`);
    const deleteResult = await deleteResponse.json();
    
    if (deleteResult.ok) {
      console.log('✅ تم حذف Webhook القديم');
    } else {
      console.log('ℹ️ لا يوجد Webhook قديم');
    }
    
    // 2. إعداد Webhook جديد
    console.log('🔄 إعداد Webhook جديد...');
    const webhookUrl = `${VERCEL_URL}/api/bot`;
    
    const setResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        max_connections: 40,
        allowed_updates: ["message", "callback_query", "chat_member"]
      })
    });
    
    const setResult = await setResponse.json();
    
    if (setResult.ok) {
      console.log('🎉 تم إعداد Webhook بنجاح!');
      console.log(`🔗 الرابط: ${webhookUrl}`);
      console.log(`📊 التفاصيل: ${setResult.description}`);
    } else {
      console.error('❌ فشل إعداد Webhook:', setResult);
    }
    
    // 3. التحقق من Webhook
    console.log('🔍 التحقق من حالة Webhook...');
    const infoResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    const infoResult = await infoResponse.json();
    
    if (infoResult.ok) {
      console.log('📊 معلومات Webhook:');
      console.log(`• النشط: ${infoResult.result.url ? '✅' : '❌'}`);
      console.log(`• الرابط: ${infoResult.result.url || 'لا يوجد'}`);
      console.log(`• الأخطاء: ${infoResult.result.last_error_message || 'لا توجد أخطاء'}`);
      console.log(`• آخر تحديث: ${infoResult.result.last_synchronization_error_date || 'غير معروف'}`);
    }
    
  } catch (error) {
    console.error('🔥 خطأ في إعداد Webhook:', error);
  }
}

setupWebhook();
