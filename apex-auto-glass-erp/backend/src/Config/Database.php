<?php

namespace App\Config;

use PDO;
use PDOException;
use App\Config\Logger;

class Database
{
    private static $instance = null;
    private $conn;

    private function __construct()
    {
        $host = $_ENV['DB_HOST'] ?? getenv('DB_HOST') ?? 'localhost';
        $port = $_ENV['DB_PORT'] ?? getenv('DB_PORT') ?? '5432';
        $db_name = $_ENV['DB_NAME'] ?? getenv('DB_NAME') ?? 'postgres';
        $username = $_ENV['DB_USER'] ?? getenv('DB_USER') ?? 'postgres';
        $password = $_ENV['DB_PASS'] ?? getenv('DB_PASS') ?? '';

        try {
            $dsn = "pgsql:host={$host};port={$port};dbname={$db_name}";
            $this->conn = new PDO($dsn, $username, $password);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            Logger::error("Database Connection Error: " . $e->getMessage());
            echo "Connection Error: " . $e->getMessage();
            exit;
        }
    }

    public static function getInstance()
    {
        if (self::$instance == null) {
            self::$instance = new Database();
        }

        return self::$instance;
    }

    public function getConnection()
    {
        return $this->conn;
    }
}
