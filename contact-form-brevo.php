<?php
// Contact Form Handler for Locksmith Staten Island NY
// Uses Brevo SMTP directly with PHPMailer-like functionality

header('Content-Type: application/json');

// Only process POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// Sanitize input function
function sanitize_input($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    return $data;
}

// Collect form data
$first_name = isset($_POST['first-name']) ? sanitize_input($_POST['first-name']) : '';
$last_name = isset($_POST['last-name']) ? sanitize_input($_POST['last-name']) : '';
$email = isset($_POST['email']) ? sanitize_input($_POST['email']) : '';
$phone = isset($_POST['phone']) ? sanitize_input($_POST['phone']) : '';
$service_type = isset($_POST['service-type']) ? sanitize_input($_POST['service-type']) : '';
$message = isset($_POST['message']) ? sanitize_input($_POST['message']) : '';

// Basic validation
$errors = [];
if (empty($first_name)) $errors[] = 'First name is required';
if (empty($last_name)) $errors[] = 'Last name is required';
if (empty($email)) $errors[] = 'Email is required';
if (empty($phone)) $errors[] = 'Phone is required';
if (empty($message)) $errors[] = 'Message is required';

// Email validation
if (!empty($email) && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'Please enter a valid email address';
}

// If validation fails, return JSON error
if (!empty($errors)) {
    echo json_encode([
        'success' => false,
        'message' => 'Please correct the following errors:',
        'errors' => $errors
    ]);
    exit;
}

// Prepare email content
$email_body = "New contact form submission from Locksmith Staten Island NY website:\n\n";
$email_body .= "Name: " . $first_name . " " . $last_name . "\n";
$email_body .= "Email: " . $email . "\n";
$email_body .= "Phone: " . $phone . "\n";

if (!empty($service_type)) {
    $email_body .= "Service Type: " . ucfirst(str_replace('-', ' ', $service_type)) . "\n";
}

$email_body .= "\nMessage:\n" . $message . "\n\n";
$email_body .= "Submitted on: " . date('Y-m-d H:i:s') . "\n";

// Brevo SMTP Configuration
$smtp_host = 'smtp-relay.brevo.com';
$smtp_port = 587;
$smtp_username = '999639001@smtp-brevo.com';
$smtp_password = 'xsmtpsib-673a482cc706f63e4e74222eeeb53420d2d9c4dcaa6b1368a7fdcdde62bd1397-SICwrNtoO8I5XFb1';

$from_email = 'noreply@locksmithstatenisland.nyc';
$from_name = 'Locksmith Staten Island Contact Form';
$to_email = 'info@locksmithstatenisland.nyc';
$to_name = 'Locksmith Staten Island NY';
$subject = 'New Contact Form Submission - Locksmith Staten Island NY';

// Create email headers
$headers = "From: $from_name <$from_email>\r\n";
$headers .= "Reply-To: $email\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

// Try to send using SMTP
$smtp_sent = false;

// Connect to SMTP server
$smtp = @fsockopen($smtp_host, $smtp_port, $errno, $errstr, 30);

if ($smtp) {
    // Read initial server response
    $response = fgets($smtp, 515);
    
    // Send EHLO
    fputs($smtp, "EHLO " . $_SERVER['SERVER_NAME'] . "\r\n");
    $response = fgets($smtp, 515);
    
    // Start TLS
    fputs($smtp, "STARTTLS\r\n");
    $response = fgets($smtp, 515);
    
    // Enable crypto
    stream_socket_enable_crypto($smtp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
    
    // Send EHLO again after STARTTLS
    fputs($smtp, "EHLO " . $_SERVER['SERVER_NAME'] . "\r\n");
    $response = fgets($smtp, 515);
    
    // Authenticate
    fputs($smtp, "AUTH LOGIN\r\n");
    $response = fgets($smtp, 515);
    
    fputs($smtp, base64_encode($smtp_username) . "\r\n");
    $response = fgets($smtp, 515);
    
    fputs($smtp, base64_encode($smtp_password) . "\r\n");
    $response = fgets($smtp, 515);
    
    if (substr($response, 0, 3) == '235') {
        // Authentication successful, send email
        fputs($smtp, "MAIL FROM: <$from_email>\r\n");
        $response = fgets($smtp, 515);
        
        fputs($smtp, "RCPT TO: <$to_email>\r\n");
        $response = fgets($smtp, 515);
        
        fputs($smtp, "DATA\r\n");
        $response = fgets($smtp, 515);
        
        $email_data = "From: $from_name <$from_email>\r\n";
        $email_data .= "To: $to_name <$to_email>\r\n";
        $email_data .= "Reply-To: $email\r\n";
        $email_data .= "Subject: $subject\r\n";
        $email_data .= "MIME-Version: 1.0\r\n";
        $email_data .= "Content-Type: text/plain; charset=UTF-8\r\n";
        $email_data .= "\r\n";
        $email_data .= $email_body;
        $email_data .= "\r\n.\r\n";
        
        fputs($smtp, $email_data);
        $response = fgets($smtp, 515);
        
        if (substr($response, 0, 3) == '250') {
            $smtp_sent = true;
        }
        
        fputs($smtp, "QUIT\r\n");
    }
    
    fclose($smtp);
}

if ($smtp_sent) {
    echo json_encode([
        'success' => true,
        'message' => 'Thank you for your message! We\'ll get back to you within 24 hours.'
    ]);
} else {
    // Fallback to PHP mail()
    if (mail($to_email, $subject, $email_body, $headers)) {
        echo json_encode([
            'success' => true,
            'message' => 'Thank you for your message! We\'ll get back to you within 24 hours.'
        ]);
    } else {
        error_log("SMTP and mail() both failed for contact form submission");
        echo json_encode([
            'success' => false,
            'message' => 'Sorry, there was an error sending your message. Please try again or call us directly at (718) 831-6269.',
            'debug' => 'SMTP connection failed and mail() fallback also failed'
        ]);
    }
}
?>