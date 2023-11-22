<?php
/**
 * Returns the list of messages or inserts a new message.
 */
require_once 'connect.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Assuming you'll be sending data in JSON format
    $data = json_decode(file_get_contents("php://input"), true);

    // Validate and sanitize input data (you should customize this based on your requirements)
    $content = mysqli_real_escape_string($con, $data['content']);
    $username = mysqli_real_escape_string($con, $data['username']);

    // You may want to add additional validation and error handling here

    // Insert the new message into the database
    $insertSql = "INSERT INTO messages (content, username, datetime) VALUES ('$content', '$username', NOW())";

    if (mysqli_query($con, $insertSql)) {
        http_response_code(201); // Created
        echo json_encode(['message' => 'Message created successfully']);
    } else {
        http_response_code(500); // Internal Server Error
        echo json_encode(['error' => 'Error creating message']);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Handle the GET request to retrieve messages
    $messages = [];
    $sql = "SELECT id, content, username, datetime FROM messages";

    if ($result = mysqli_query($con, $sql)) {
        $mr = 0;
        while ($row = mysqli_fetch_assoc($result)) {
            $messages[$mr]['id']       = $row['id'];
            $messages[$mr]['content']  = $row['content'];
            $messages[$mr]['username'] = $row['username'];
            $messages[$mr]['datetime'] = $row['datetime'];
            $mr++;
        }

        echo json_encode(['data' => $messages]);
    } else {
        http_response_code(404);
    }
} else {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['error' => 'Method Not Allowed']);
}
?>