<?php
// api/attractions.php
// RESTful Attraction Handler for XAMPP

require_once __DIR__ . '/db.php';
header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGet($pdo);
        break;
    case 'POST':
        handlePost($pdo);
        break;
    case 'PUT':
        handlePut($pdo);
        break;
    case 'DELETE':
        handleDelete($pdo);
        break;
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        break;
}

function handleGet($pdo) {
    $category = $_GET['category'] ?? null;
    $maxDistance = $_GET['maxDistance'] ?? null;
    $search = $_GET['search'] ?? null;
    $sort = $_GET['sort'] ?? 'nearest';

    $sql = "SELECT * FROM attractions WHERE is_active = 1";
    $params = [];

    if (!empty($category) && $category !== 'all') {
        $sql .= " AND category = ?";
        $params[] = $category;
    }

    if (!empty($maxDistance)) {
        $sql .= " AND distance_km <= ?";
        $params[] = floatval($maxDistance);
    }

    if (!empty($search)) {
        $sql .= " AND (name LIKE ? OR description LIKE ?)";
        $params[] = "%$search%";
        $params[] = "%$search%";
    }

    if ($sort === 'rating') {
        $sql .= " ORDER BY rating DESC";
    } elseif ($sort === 'alpha') {
        $sql .= " ORDER BY name ASC";
    } else {
        $sql .= " ORDER BY distance_km ASC";
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $attractions = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'count' => count($attractions),
        'data' => $attractions
    ]);
}

function handlePost($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
        return;
    }

    $name = trim($data['name'] ?? '');
    $category = $data['category'] ?? 'Religious';
    $distance = floatval($data['distance_km'] ?? 0);
    $desc = trim($data['description'] ?? '');

    if (empty($name) || empty($desc)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Name and description are required']);
        return;
    }

    if ($distance <= 0 || $distance > 25.0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Distance must be between 0.1 and 25.0 km of Haloluwa']);
        return;
    }

    $sql = "INSERT INTO attractions (
        name, category, description, historical_context, latitude, longitude,
        distance_km, opening_time, price_local, price_foreign, price_display,
        estimated_duration_min, rating, image_url, accessibility_wheelchair,
        accessibility_parking, accessibility_restrooms, walking_difficulty,
        elderly_friendly, dress_code, photography_rules, cultural_tips, emergency_contact
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $name, $category, $desc, $data['historical_context'] ?? null,
        floatval($data['latitude'] ?? 7.2936), floatval($data['longitude'] ?? 80.6413),
        $distance, $data['opening_time'] ?? '08:00 AM - 05:00 PM',
        floatval($data['price_local'] ?? 0), floatval($data['price_foreign'] ?? 0),
        $data['price_display'] ?? 'Free', intval($data['estimated_duration_min'] ?? 60),
        floatval($data['rating'] ?? 4.5), $data['image_url'] ?? null,
        !empty($data['accessibility_wheelchair']) ? 1 : 0,
        !empty($data['accessibility_parking']) ? 1 : 0,
        !empty($data['accessibility_restrooms']) ? 1 : 0,
        $data['walking_difficulty'] ?? 'Easy',
        !empty($data['elderly_friendly']) ? 1 : 0,
        $data['dress_code'] ?? null, $data['photography_rules'] ?? null,
        $data['cultural_tips'] ?? null, $data['emergency_contact'] ?? null
    ]);

    http_response_code(201);
    echo json_encode(['success' => true, 'message' => 'Attraction created successfully', 'id' => $pdo->lastInsertId()]);
}

function handlePut($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = intval($_GET['id'] ?? 0);

    if ($id <= 0 || !$data) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID and data required']);
        return;
    }

    $distance = floatval($data['distance_km'] ?? 0);
    if ($distance <= 0 || $distance > 25.0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Distance must be within 25.0 km of Haloluwa']);
        return;
    }

    $sql = "UPDATE attractions SET
        name = ?, category = ?, description = ?, historical_context = ?,
        latitude = ?, longitude = ?, distance_km = ?, opening_time = ?,
        price_local = ?, price_foreign = ?, price_display = ?, estimated_duration_min = ?,
        rating = ?, image_url = ?, accessibility_wheelchair = ?, accessibility_parking = ?,
        accessibility_restrooms = ?, walking_difficulty = ?, elderly_friendly = ?,
        dress_code = ?, photography_rules = ?, cultural_tips = ?, emergency_contact = ?
        WHERE id = ?";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $data['name'], $data['category'], $data['description'], $data['historical_context'] ?? null,
        floatval($data['latitude'] ?? 7.2936), floatval($data['longitude'] ?? 80.6413),
        $distance, $data['opening_time'] ?? '08:00 AM - 05:00 PM',
        floatval($data['price_local'] ?? 0), floatval($data['price_foreign'] ?? 0),
        $data['price_display'] ?? 'Free', intval($data['estimated_duration_min'] ?? 60),
        floatval($data['rating'] ?? 4.5), $data['image_url'] ?? null,
        !empty($data['accessibility_wheelchair']) ? 1 : 0,
        !empty($data['accessibility_parking']) ? 1 : 0,
        !empty($data['accessibility_restrooms']) ? 1 : 0,
        $data['walking_difficulty'] ?? 'Easy',
        !empty($data['elderly_friendly']) ? 1 : 0,
        $data['dress_code'] ?? null, $data['photography_rules'] ?? null,
        $data['cultural_tips'] ?? null, $data['emergency_contact'] ?? null,
        $id
    ]);

    echo json_encode(['success' => true, 'message' => 'Attraction updated successfully']);
}

function handleDelete($pdo) {
    $id = intval($_GET['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Valid ID required']);
        return;
    }

    $stmt = $pdo->prepare("DELETE FROM attractions WHERE id = ?");
    $stmt->execute([$id]);

    echo json_encode(['success' => true, 'message' => 'Attraction deleted successfully']);
}
