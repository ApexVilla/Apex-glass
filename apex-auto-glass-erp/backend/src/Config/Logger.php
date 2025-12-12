<?php

namespace App\Config;

class Logger
{
    private static $logFile = __DIR__ . '/../../logs/app.log';

    public static function log($message, $level = 'INFO', $context = [])
    {
        $date = date('Y-m-d H:i:s');
        $contextStr = !empty($context) ? ' ' . json_encode($context) : '';
        $formattedMessage = "[$date] [$level] $message$contextStr" . PHP_EOL;

        // Use error_log for serverless environments (Vercel logs capture stderr)
        error_log($formattedMessage);
    }

    public static function error($message, $context = [])
    {
        self::log($message, 'ERROR', $context);
    }

    public static function info($message, $context = [])
    {
        self::log($message, 'INFO', $context);
    }
}
