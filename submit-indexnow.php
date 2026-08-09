<?php
/**
 * Submit URLs to IndexNow
 * Run from server: php submit-indexnow.php
 */
$key = '7f93034c76ad4ceb50831d9713679470';
$host = 'www.locksmithstatenisland.nyc';

$urls = [
    'https://www.locksmithstatenisland.nyc/',
    'https://www.locksmithstatenisland.nyc/blog',
    'https://www.locksmithstatenisland.nyc/blog/category/emergency-services',
    'https://www.locksmithstatenisland.nyc/blog/category/automotive',
    'https://www.locksmithstatenisland.nyc/blog/category/maintenance',
    'https://www.locksmithstatenisland.nyc/blog/category/security-tips',
    'https://www.locksmithstatenisland.nyc/services/emergency-locksmith',
    'https://www.locksmithstatenisland.nyc/services/automotive-locksmith',
    'https://www.locksmithstatenisland.nyc/blog/emergency-lockout-prevention-tips',
    'https://www.locksmithstatenisland.nyc/blog/car-theft-prevention-staten-island',
];

$payload = json_encode([
    'host' => $host,
    'key' => $key,
    'keyLocation' => "https://{$host}/{$key}.txt",
    'urlList' => $urls,
]);

$ch = curl_init('https://api.indexnow.org/indexnow');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json; charset=utf-8'],
    CURLOPT_TIMEOUT => 30,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Status: {$httpCode}\n";
echo "Response: " . ($response ?: '(empty - success is OK for IndexNow)') . "\n";

if ($httpCode === 200) {
    echo "✅ URLs successfully submitted to IndexNow!\n";
} else {
    echo "⚠️ Check the response. Status 200 = success, 202 = accepted, 400/403/422 = error.\n";
}