<?php

require_once '../connect.php';
require_once '../../environment.php';
include_once '../global.php';

header('Content-Type: application/json');

$maximumMessages = 25;
$maxNicknameLength = 16;
$minNicknameLength = 4;
$minMessageLength = 2;
$maxMessageLength = 256;
$blacklistedNames = ["SYSTEM", "SERVER"];

$userdataBySessionToken = [];
$ipAddress = $_SERVER['REMOTE_ADDR'];

function sanitizeInput($input, $stricter) {
    
    if ($stricter) {
        $input = trim($input, "'\"`");
    } else {
       $input = htmlspecialchars($input, ENT_QUOTES | ENT_HTML5, 'UTF-8');
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

function logMessage($con, $content, $username, $sessionToken) {
    $insertSql = "INSERT INTO messages (content, username, datetime, sessionToken) VALUES (?, ?, NOW(), ?)";
    $stmt = mysqli_prepare($con, $insertSql);

    if ($stmt) {
        mysqli_stmt_bind_param($stmt, "sss", $content, $username, $sessionToken);
        $result = mysqli_stmt_execute($stmt);
        mysqli_stmt_close($stmt);

        return $result;
    } else {
        return false;
    }
}


if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Assuming you'll be sending data in JSON format
    $data = $_POST ?: json_decode(file_get_contents("php://input"), true);
    // Check if the required fields are set
    if ($data && isset($data['name'], $data['amount'], $data['sessionToken'])) {
        include_once '../users/users.php';
        $userData = getUserDataByToken($data['sessionToken'], $con, $userdataBySessionToken);
        if (isAdmin($data['sessionToken'], $con, $userdataBySessionToken)) {
            $name = sanitizeInput($data['name'], true);
            $amount = sanitizeInput($data['amount'], true);
            $sessionToken = $data['sessionToken'];
            if (!is_numeric($amount)) {
                http_response_code(400); // Bad Request
                echo json_encode(['error' => 'Amount is not a number']);
                exit();
            }
            $insertSql = "INSERT INTO counters (whenIsItSent, minutes, sessionToken, counterName) VALUES (NOW(), '$amount', '$sessionToken', '$name')";

            $result = mysqli_query($con, $insertSql);
            if ($result) {
                http_response_code(201); // Created
                echo json_encode(['message' => 'Message created successfully']);
            } else {
                http_response_code(500); // Internal Server Error
                echo json_encode(['error' => 'Error creating message']);
            }
        } else {
            http_response_code(403); // Forbidden
            echo json_encode(['error' => 'You are not allowed to use this command']);
        }
    } else {
        // Handle the case where required fields are not set
        http_response_code(400); // Bad Request
        echo json_encode(['error' => 'Missing required fields', 'fields' => $data]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Handle the GET request to retrieve messages
    $messages = [];
    $counter = isset($_GET['counter']) ? trim($_GET['counter']) : null;

    if ($counter) {
        $counter = mysqli_real_escape_string($con, $counter);

        $sql = "SELECT * FROM counters WHERE counterName = ?";
        $stmt = mysqli_prepare($con, $sql);

        if ($stmt) {
            mysqli_stmt_bind_param($stmt, "s", $counter);
            mysqli_stmt_execute($stmt);
            $result = mysqli_stmt_get_result($stmt);

            if ($result) {
                while ($row = mysqli_fetch_assoc($result)) {
                    $message = [
                        'id' => $row['id'],
                        'whenIsItSent' => $row['whenIsItSent'],
                        'minutes' => $row['minutes'],
                        'sessionToken' => $row['sessionToken'],
                        'counterName' => $row['counterName'],
                    ];
                    $messages[] = $message;
                }

                // Strip sessionToken before sending the response
                $amountOfInserts = count($messages);
                $totalMinutes = 0;
                foreach ($messages as $message) {
                    $totalMinutes += $message['minutes'];
                }

                http_response_code(200); // OK
                echo json_encode(['counter' => $counter, 'amountOfInserts' => $amountOfInserts, 'totalMinutes' => $totalMinutes, 'result'=> $result]);
            } else {
                http_response_code(404);
            }
        } else {
            http_response_code(500); // Internal Server Error
            echo json_encode(['error' => 'Error retrieving messages']);
        }
    } else {
        http_response_code(400); // Bad Request
        echo json_encode(['error' => 'Invalid or missing counter Name']);
    }
} else {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['error' => 'Method Not Allowed']);
}

?>