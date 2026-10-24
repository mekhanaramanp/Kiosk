<?php
// connect.php — KIOSK Saintgits Campus Food — PHP DB Connection

define('DB_HOST',     'localhost');
define('DB_PORT',     3306);
define('DB_USER',     'root');
define('DB_PASSWORD', 'your_password_here');
define('DB_NAME',     'kiosk_db');

$conn = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT);

if ($conn->connect_error) {
    http_response_code(500);
    die(json_encode([
        'success' => false,
        'error'   => 'MySQL connection failed: ' . $conn->connect_error
    ]));
}

$conn->set_charset('utf8mb4');

// Optional test — uncomment to verify:
// header('Content-Type: application/json');
// echo json_encode(['success' => true, 'message' => 'MySQL connected — kiosk_db ready']);
?>
