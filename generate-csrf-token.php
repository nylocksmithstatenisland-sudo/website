<?php
// CSRF Token Generator for Contact Form
// This script generates and returns a CSRF token for form protection

// Check if PHP is available, if not, return a fallback token
if (!function_exists('session_start')) {
    // Fallback for servers without PHP
    header('Content-Type: application/json');
    echo json_encode([
        'csrf_token' => 'fallback_' . time() . '_' . rand(1000, 9999)
    ]);
    exit;
}

session_start();

// Regenerate session ID to prevent session fixation
if (!isset($_SESSION['csrf_token'])) {
    session_regenerate_id(true);
}

// Generate a new CSRF token if one doesn't exist or is expired
if (!isset($_SESSION['csrf_token']) || !isset($_SESSION['csrf_token_time']) ||
    (time() - $_SESSION['csrf_token_time']) > 3600) { // Token expires after 1 hour

    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    $_SESSION['csrf_token_time'] = time();
}

// Return the token as JSON for AJAX requests
header('Content-Type: application/json');
echo json_encode([
    'csrf_token' => $_SESSION['csrf_token']
]);
?>
