<?php

require_once '../connect.php';
include_once '../global.php';

header('Content-Type: application/json');

$userdataBySessionToken = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Assuming you'll be sending data in JSON format
    $data = $_POST ?: json_decode(file_get_contents("php://input"), true);

    // Check if the required fields 'id' and 'sessionToken' are set
    if ($data && isset($data['id'], $data['sessionToken'])) {
        $id = mysqli_real_escape_string($con, $data['id']);
        $sessionToken = mysqli_real_escape_string($con, $data['sessionToken']);

        // Validate sessionToken (assuming a UUID format)
        if (!preg_match('/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/', $sessionToken)) {
            http_response_code(400); // Bad Request
            echo json_encode(['error' => 'Invalid sessionToken format']);
        } else {
            $sessionToken = isset($data['sessionToken']) ? trim(mysqli_real_escape_string($con, $data['sessionToken'])) : null;
            if (empty($sessionToken)) {
                http_response_code(400); // Bad Request
                echo json_encode(['error' => 'sessionToken cannot be empty or null']);
            } else {
                // Retrieve messages newer than the given ID for the specific sessionToken
                $sql = "SELECT id, content, username, (datetime + INTERVAL $hour_diff HOUR) AS datetime_in_ist, sessionToken FROM messages WHERE id > $id";
    
                $messages = [];
                if ($result = mysqli_query($con, $sql)) {
                    while ($row = mysqli_fetch_assoc($result)) {
                        $message = [
                            'id' => $row['id'],
                            'content' => $row['content'],
                            'username' => $row['username'],
                            'datetime' => $row['datetime_in_ist']
                        ];
                        
                        include_once '../users/users.php';
                        // Check if user data is already retrieved for this sessionToken
                        if (!isset($userList[$row['sessionToken']])) {
                            // Retrieve user data for the sessionToken
                            $userData = getUserDataByToken($row['sessionToken'], $con, $userdataBySessionToken);
                            $message["uid"] = $userData["id"];
                            $message["type"] = applyMask($userData["type"]);
                        }
                        $message['content'] = checkForCommands($message['content']);
                        if ($row['sessionToken'] === $sessionToken) {
                            $message['yours'] = true;
                        } else {
                            $message['yours'] = false;
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
                    http_response_code(500); // Internal Server Error
                    echo json_encode(['error' => 'Error retrieving messages']);
                }
            }
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
