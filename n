<?php
// crypto_price.php

// 1. تحديد واجهة API
$api_url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd";

// 2. إعداد cURL لجلب البيانات
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $api_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); // لإرجاع النتيجة كـ String بدلاً من طباعتها مباشرةً

// 3. تنفيذ الطلب وجلب النتيجة
$response = curl_exec($ch);
curl_close($ch);

// 4. معالجة الرد (JSON)
if ($response === false) {
    echo "❌ فشل الاتصال بواجهة API.\n";
} else {
    $data = json_decode($response, true);

    // التحقق من وجود البيانات
    if (isset($data['bitcoin']['usd'])) {
        $price = number_format($data['bitcoin']['usd']);
        echo "✅ السعر الحالي للبيتكوين (BTC): \$" . $price . "\n";
    } else {
        echo "⚠️ فشل جلب البيانات، ربما API غير متوفرة.\n";
    }
}
?>
