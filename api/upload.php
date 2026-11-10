<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$isHttps = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
session_name('erandio_turismo_session');
session_set_cookie_params([
    'httponly' => true,
    'secure' => $isHttps,
    'samesite' => 'Strict',
    'path' => '/',
]);
session_start();

function uploadResponse(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    uploadResponse(405, ['ok' => false, 'error' => 'method_not_allowed']);
}
if (($_SESSION['turismo_admin'] ?? false) !== true) {
    uploadResponse(401, ['ok' => false, 'error' => 'authentication_required']);
}
session_write_close();

$file = $_FILES['file'] ?? null;
if (!$file || !is_int($file['error'] ?? null)) {
    uploadResponse(400, ['ok' => false, 'error' => 'missing_file_or_server_limit']);
}
if ($file['error'] !== UPLOAD_ERR_OK) {
    uploadResponse(400, ['ok' => false, 'error' => 'upload_error_' . $file['error']]);
}

$kind = $_POST['kind'] ?? '';
$limit = $kind === 'gpx' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
if ($file['size'] <= 0 || $file['size'] > $limit) {
    uploadResponse(400, ['ok' => false, 'error' => 'file_too_large_or_empty']);
}

if ($kind === 'image') {
    $info = @getimagesize($file['tmp_name']);
    $types = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!$info || !isset($types[$info['mime']])) {
        uploadResponse(400, ['ok' => false, 'error' => 'invalid_image']);
    }
    $extension = $types[$info['mime']];
    $relativeDirectory = 'img/uploads/';
} elseif ($kind === 'gpx') {
    if (strtolower(pathinfo((string) $file['name'], PATHINFO_EXTENSION)) !== 'gpx') {
        uploadResponse(400, ['ok' => false, 'error' => 'invalid_gpx']);
    }
    $sample = file_get_contents($file['tmp_name'], false, null, 0, 4096);
    if ($sample === false || !preg_match('/<gpx\b/i', $sample)) {
        uploadResponse(400, ['ok' => false, 'error' => 'invalid_gpx']);
    }
    $extension = 'gpx';
    $relativeDirectory = 'uploads/gpx/';
} else {
    uploadResponse(400, ['ok' => false, 'error' => 'invalid_kind']);
}

$directory = dirname(__DIR__) . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relativeDirectory);
if ((!is_dir($directory) && !mkdir($directory, 0755, true)) || !is_writable($directory)) {
    uploadResponse(500, ['ok' => false, 'error' => 'upload_directory_not_writable']);
}

$relativePath = $relativeDirectory . bin2hex(random_bytes(16)) . '.' . $extension;
$absolutePath = dirname(__DIR__) . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relativePath);
if (!move_uploaded_file($file['tmp_name'], $absolutePath)) {
    uploadResponse(500, ['ok' => false, 'error' => 'upload_failed']);
}

uploadResponse(201, ['ok' => true, 'path' => $relativePath]);
