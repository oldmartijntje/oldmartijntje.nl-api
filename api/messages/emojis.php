<?php

include_once '../global.php';
require_once '../connect.php';

header('Content-Type: application/json');

$userdataBySessionToken = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Assuming you'll be sending data in JSON format
    $data = $_POST ?: json_decode(file_get_contents("php://input"), true);

    // Check if the required fields 'id' and 'sessionToken' are set
    if ($data && isset($data['sessionToken'])) {
        $sessionToken = mysqli_real_escape_string($con, $data['sessionToken']);

        // Validate sessionToken (assuming a UUID format)
        if (!preg_match('/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/', $sessionToken)) {
            http_response_code(400); // Bad Request
            echo json_encode(['error' => 'Invalid sessionToken format']);
        } else {

            echo json_encode(['data' => $commands]);
        }
    } else {
        // Handle the case where 'id' or 'sessionToken' is not set
        http_response_code(400); // Bad Request
        echo json_encode(['error' => 'Missing required field: id or sessionToken']);
    }
} else {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['error' => 'Method Not Allowed']);
}

?>
