<?php

require_once __DIR__ . '/../vendor/autoload.php';

use App\Router;
use App\Controllers\InventoryController;
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

// Dispatch
$router->dispatch();
