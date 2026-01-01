<?php

$token = "V1zDt7xIANte2TemRNSVu7KQCeZC7EF6TFGUH9HGI85Jg0GqAZB96m2TuY4ZD"; // ← الصق الرمز هنا فقط

$phone_number_id = " +1 555 155 3027";

$to = "249110374757"; // رقمك مع رمز الدولة بدون +

$url = "https://graph.facebook.com/v19.0/$phone_number_id/messages";

$data = [

    "messaging_product" => "whatsapp",

    "to" => $to,

    "type" => "text",

    "text" => [

        "body" => "هذه رسالة تجريبية من موقعي ✅"

    ]

];

$headers = [

    "Authorization: Bearer $token",

    "Content-Type: application/json"

];

$ch = curl_init($url);

curl_setopt($ch, CURLOPT_POST, true);

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

$response = curl_exec($ch);

if ($response === false) {

    echo curl_error($ch);

} else {

    echo $response;

}

curl_close($ch);