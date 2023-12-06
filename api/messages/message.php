<?php

require_once '../connect.php';
require_once '../../environment.php';

header('Content-Type: application/json');

$maximumMessages = 25;
$blacklistedNames = ["SYSTEM"];

function sanitizeInput($input, $stricter) {
    
    if ($stricter) {
        $input = trim($input, "'\"`");
    } else {
        $input = str_replace(['"', "'", '`'], ['&quot;', '&apos;', '&grave;'], $input);
    }
    // Remove emojis
    $input = preg_replace('/[\x{1F600}-\x{1F64F}]/u', '', $input);

    // Trim all special characters except numbers and underscores if $stricter is true
    if ($stricter) {
       $input = preg_replace('/[^\p{L}\p{N}_:;]/u', '', $input);
    } else {
        // Keep specific characters and remove others not suitable for SQL
        $input = preg_replace('/[^\p{L}\p{N}_#\$\%\^\&\(\)\{\}\[\]!@:;"".,<>? ]/u', '', $input);
    }

    // Check if the resulting string is empty and return "Illegal_Chars" if it is
    //if (empty($input)) {
    //    return "Illegal_Characters";
    //}
    
    return $input;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Assuming you'll be sending data in JSON format
    $data = $_POST ?: json_decode(file_get_contents("php://input"), true);


    // Check if the required fields are set
    if ($data && isset($data['content'], $data['username'], $data['sessionToken'])) {
        $usernameLength = mb_strlen($data['username']);
        $contentLength = mb_strlen($data['content']);
        $sessionToken = $data['sessionToken'];

        if ($usernameLength > 16 || $contentLength > 256) {
            http_response_code(400); // Bad Request
            echo json_encode(['error' => 'Username or content length exceeds the allowed limit']);
        } elseif ($usernameLength < 4 || $contentLength < 2) {
            http_response_code(400); // Bad Request
            echo json_encode(['error' => 'Username or content length is too short']);
        } elseif (in_array(trim($data['username']), $blacklistedNames)) {
            http_response_code(400); // Bad Request
            echo json_encode(['error' => 'Username \''. trim($data['username']) .'\' is blacklisted']);
        } elseif (!preg_match('/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/', $sessionToken)) {
            http_response_code(400); // Bad Request
            echo json_encode(['error' => 'Invalid sessionToken format']);
        } else {
            // Validate and sanitize input data (you should customize this based on your requirements)
            $content = isset($data['content']) ? mysqli_real_escape_string($con, sanitizeInput($data['content'], false)) : null;
            $username = isset($data['username']) ? trim(mysqli_real_escape_string($con, sanitizeInput($data['username'], true))) : null;
            $sessionToken = isset($data['sessionToken']) ? trim(mysqli_real_escape_string($con, $data['sessionToken'])) : null;
            

            // You may want to add additional validation and error handling here
            if (empty($content) || empty($username)) {
                http_response_code(422); // Unprocessable Content
                echo json_encode(['error' => 'Content and/or username only consisted of illegal characters.',
                                    'payload' => ['content' => $content, 'username' => $username]]);
            } else {
                // Insert the new message into the database
                $insertSql = "INSERT INTO messages (content, username, datetime, sessionToken) VALUES ('$content', '$username', NOW(), '$sessionToken')";
    
                if (mysqli_query($con, $insertSql)) {
                    // Check if the number of items in the database is more than limit
                    $countSql = "SELECT COUNT(*) as count FROM messages";
                    $result = mysqli_query($con, $countSql);
                    $row = mysqli_fetch_assoc($result);
                    $messageCount = $row['count'];
    
                    while ($messageCount > $maximumMessages) {
                        // If more than the maximum, delete the oldest message
                        $deleteSql = "DELETE FROM messages ORDER BY datetime ASC LIMIT 1";
                        mysqli_query($con, $deleteSql);
    
                        // Update the message count
                        $result = mysqli_query($con, $countSql);
                        $row = mysqli_fetch_assoc($result);
                        $messageCount = $row['count'];
                    }
    
                    http_response_code(201); // Created
                    echo json_encode(['message' => 'Message created successfully']);
                } else {
                    http_response_code(500); // Internal Server Error
                    echo json_encode(['error' => 'Error creating message']);
                }
            }   
        }
    } else {
        // Handle the case where required fields are not set
        http_response_code(400); // Bad Request
        echo json_encode(['error' => 'Missing required fields', 'fields' => $data]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Handle the GET request to retrieve messages
    $messages = [];
    $sessionToken = isset($_GET['sessionToken']) ? trim(mysqli_real_escape_string($con, $_GET['sessionToken'])) : null;
    $adminToken = "your_admin_token_here"; // Replace with your actual admin token

    if ($sessionToken && preg_match('/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/', $sessionToken)) {
        $sql = "SELECT id, content, username, datetime, sessionToken FROM messages";
        $result = mysqli_query($con, $sql);

        if ($result) {
            while ($row = mysqli_fetch_assoc($result)) {
                $message = [
                    'id' => $row['id'],
                    'content' => $row['content'],
                    'username' => $row['username'],
                    'datetime' => $row['datetime'],
                ];

                // Check if the message's sessionToken matches the provided sessionToken
                if ($row['sessionToken'] === $sessionToken) {
                    $message['type'] = 'yours';
                } if ($row['sessionToken'] === $db_data['AdminToken']) {
                    $message['type'] = 'oldmartijntje';
                }
                
                if (!isset($message['type'])) {
                    $message['type'] = '';
                }

                $messages[] = $message;
            }

            // Strip sessionToken before sending the response
            $strippedMessages = array_map(function ($message) {
                unset($message['sessionToken']);
                return $message;
            }, $messages);

            echo json_encode(['data' => $strippedMessages]);
        } else {
            http_response_code(404);
        }
    } else {
        http_response_code(400); // Bad Request
        echo json_encode(['error' => 'Invalid or missing sessionToken']);
    }
} else {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['error' => 'Method Not Allowed']);
}

?>