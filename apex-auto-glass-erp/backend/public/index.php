<?php

require_once __DIR__ . '/../vendor/autoload.php';

use App\Router;
use App\Controllers\InventoryController;
use App\Controllers\NfeController;
use Dotenv\Dotenv;

// CORS Headers
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Load Environment Variables
$dotenv = Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->safeLoad();

// Router Setup
$router = new Router();

// Inventory Routes
$router->get('/api/inventory/report', [InventoryController::class, 'getReport']);

// NF-e Routes
$router->get('/api/nfe/status', [NfeController::class, 'consultarStatus']);
$router->post('/api/nfe/gerar', [NfeController::class, 'gerarEAutorizar']);
$router->get('/api/nfe/consultar', [NfeController::class, 'consultarPorChave']);
$router->get('/api/nfe/buscar', [NfeController::class, 'buscar']);
$router->post('/api/nfe/cancelar', [NfeController::class, 'cancelar']);
$router->post('/api/nfe/cce', [NfeController::class, 'emitirCCe']);
$router->post('/api/nfe/inutilizar', [NfeController::class, 'inutilizar']);

// Dispatch
$router->dispatch();
