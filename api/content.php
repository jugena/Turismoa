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

const DEFAULT_PASSWORD_HASH = '85632c32ba0daa09575025e5790da153257bb24cb9e6a50e9c7f3b36a71239ab';
const CONTENT_FILE = 'content.json';
const CATEGORIES = [
    'rutas',
    'patrimonio',
    'donde-comer',
    'donde-dormir',
    'donde-comprar',
    'eventos',
    'fiestas',
];

function respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function readJsonBody(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '' || strlen($raw) > 25 * 1024 * 1024) {
        respond(400, ['ok' => false, 'error' => 'invalid_body']);
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded) || json_last_error() !== JSON_ERROR_NONE) {
        respond(400, ['ok' => false, 'error' => 'invalid_json']);
    }
    return $decoded;
}

function isAuthenticated(): bool
{
    return isset($_SESSION['turismo_admin']) && $_SESSION['turismo_admin'] === true;
}

function isList(array $value): bool
{
    return $value === [] || array_keys($value) === range(0, count($value) - 1);
}

function validateContent(array $data): void
{
    foreach (CATEGORIES as $category) {
        if (!isset($data[$category]) || !is_array($data[$category]) || !isList($data[$category])) {
            respond(400, ['ok' => false, 'error' => 'invalid_category', 'category' => $category]);
        }

        $ids = [];
        foreach ($data[$category] as $item) {
            if (!is_array($item) || !isset($item['id']) || (!is_int($item['id']) && !is_string($item['id']))) {
                respond(400, ['ok' => false, 'error' => 'invalid_item', 'category' => $category]);
            }
            $id = (string) $item['id'];
            if ($id === '' || isset($ids[$id])) {
                respond(400, ['ok' => false, 'error' => 'duplicate_or_empty_id', 'category' => $category]);
            }
            $ids[$id] = true;

            foreach (['title_es', 'title_eu', 'resumen_es', 'resumen_eu', 'content_es', 'content_eu'] as $field) {
                if (isset($item[$field]) && !is_string($item[$field])) {
                    respond(400, ['ok' => false, 'error' => 'invalid_field', 'field' => $field]);
                }
            }
            if (!isset($item['title_es']) || trim((string) $item['title_es']) === '') {
                respond(400, ['ok' => false, 'error' => 'missing_title', 'category' => $category]);
            }
            if (isset($item['visible']) && !is_bool($item['visible'])) {
                respond(400, ['ok' => false, 'error' => 'invalid_visibility', 'category' => $category]);
            }
        }
    }
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

if ($action === 'status' && $method === 'GET') {
    respond(200, ['ok' => true, 'authenticated' => isAuthenticated()]);
}

if ($action === 'login' && $method === 'POST') {
    $body = readJsonBody();
    $password = isset($body['password']) ? (string) $body['password'] : '';
    $configuredHash = getenv('TURISMO_ADMIN_PASSWORD_HASH') ?: DEFAULT_PASSWORD_HASH;

    if (!hash_equals($configuredHash, hash('sha256', $password))) {
        usleep(350000);
        respond(401, ['ok' => false, 'error' => 'invalid_credentials']);
    }

    session_regenerate_id(true);
    $_SESSION['turismo_admin'] = true;
    respond(200, ['ok' => true, 'authenticated' => true]);
}

if ($action === 'logout' && $method === 'POST') {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    session_destroy();
    respond(200, ['ok' => true, 'authenticated' => false]);
}

if (($_GET['collection'] ?? '') !== 'content') {
    respond(404, ['ok' => false, 'error' => 'unknown_collection']);
}

$dataDirectory = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'data';
$filePath = $dataDirectory . DIRECTORY_SEPARATOR . CONTENT_FILE;

if ($method === 'GET') {
    if (!is_file($filePath)) {
        respond(500, ['ok' => false, 'error' => 'content_file_missing']);
    }

    $contents = file_get_contents($filePath);
    $data = $contents === false ? null : json_decode($contents, true);
    if (!is_array($data) || json_last_error() !== JSON_ERROR_NONE) {
        respond(500, ['ok' => false, 'error' => 'invalid_data_file']);
    }
    validateContent($data);
    respond(200, ['ok' => true, 'data' => $data, 'revision' => hash('sha256', (string) $contents)]);
}

if ($method !== 'PUT') {
    respond(405, ['ok' => false, 'error' => 'method_not_allowed']);
}

if (!isAuthenticated()) {
    respond(401, ['ok' => false, 'error' => 'authentication_required']);
}

$body = readJsonBody();
if (!isset($body['data']) || !is_array($body['data']) || !isset($body['revision']) || !is_string($body['revision'])) {
    respond(400, ['ok' => false, 'error' => 'invalid_collection_data']);
}

$data = $body['data'];
validateContent($data);
$encoded = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($encoded === false) {
    respond(400, ['ok' => false, 'error' => 'encoding_failed']);
}
if (!is_dir($dataDirectory) || !is_writable($dataDirectory)) {
    respond(500, ['ok' => false, 'error' => 'data_directory_not_writable']);
}

$lock = fopen($filePath . '.lock', 'c');
if (!$lock || !flock($lock, LOCK_EX)) {
    respond(500, ['ok' => false, 'error' => 'lock_failed']);
}

$current = is_file($filePath) ? file_get_contents($filePath) : '';
if (!hash_equals(hash('sha256', (string) $current), $body['revision'])) {
    flock($lock, LOCK_UN);
    fclose($lock);
    respond(409, ['ok' => false, 'error' => 'content_changed_reload']);
}

$temporary = tempnam($dataDirectory, 'content-');
if ($temporary) {
    chmod($temporary, is_file($filePath) ? (fileperms($filePath) & 0777) : 0644);
}
$written = $temporary && file_put_contents($temporary, $encoded . PHP_EOL) !== false;
if (!$written || !rename($temporary, $filePath)) {
    if ($temporary && is_file($temporary)) {
        unlink($temporary);
    }
    flock($lock, LOCK_UN);
    fclose($lock);
    respond(500, ['ok' => false, 'error' => 'write_failed']);
}

flock($lock, LOCK_UN);
fclose($lock);
respond(200, ['ok' => true, 'data' => $data, 'revision' => hash('sha256', $encoded . PHP_EOL)]);
