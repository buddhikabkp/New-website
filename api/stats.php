<?php
// api/stats.php
// Returns summary counts matching Screenshot 4 cards

require_once __DIR__ . '/db.php';
header('Content-Type: application/json; charset=utf-8');

try {
    $stmt = $pdo->query("
        SELECT 
            COUNT(*) AS total,
            SUM(category = 'Nature') AS nature,
            SUM(category = 'Heritage') AS heritage,
            SUM(price_local = 0 OR price_display LIKE '%Free%') AS free
        FROM attractions
        WHERE is_active = 1
    ");
    $stats = $stmt->fetch();

    echo json_encode([
        'success' => true,
        'stats' => [
            'total' => intval($stats['total'] ?? 0),
            'nature' => intval($stats['nature'] ?? 0),
            'heritage' => intval($stats['heritage'] ?? 0),
            'free' => intval($stats['free'] ?? 0)
        ]
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
