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
    if ($data && isset($data['content'], $data['username'], $data['sessionToken'])) {
        if (isCommand($data['content'])) {
            include_once '../users/users.php';
            $userData = getUserDataByToken($data['sessionToken'], $con, $userdataBySessionToken);
        
            if (isAdmin($data['sessionToken'], $con, $userdataBySessionToken)) {
                $command = splitCommand($data['content']);
        
                if ($command[0] == "/ban" && is_numeric($command[1])) {
                    $userId = $command[1];
                    $result = banUser($con, $userId, 1);
        
                    if ($result) {
                        // Log the ban message
                        logMessage($con, "User with ID $userId has been banned", "SYSTEM", $data['sessionToken']);
        
                        http_response_code(200); // OK
                        echo json_encode(['message' => 'User banned successfully']);
                    } else {
                        http_response_code(500); // Internal Server Error
                        echo json_encode(['error' => 'Error banning user']);
                    }
                } elseif ($command[0] == "/unban" && is_numeric($command[1])) {
                    $userId = $command[1];
                    $result = banUser($con, $userId, 0);
        
                    if ($result) {
                        // Log the unban message
                        logMessage($con, "User with ID $userId has been unbanned", "SYSTEM", $data['sessionToken']);
        
                        http_response_code(200); // OK
                        echo json_encode(['message' => 'User unbanned successfully']);
                    } else {
                        http_response_code(500); // Internal Server Error
                        echo json_encode(['error' => 'Error unbanning user']);
                    }
                } elseif ($command[0] == "/ipban" && is_numeric($command[1])) {
                    $userId = $command[1];
                    banIp($con, $userId);
    
                    http_response_code(200); // OK
                    echo json_encode(['message' => 'User banned successfully', 'data' => $command[1], 'command'=> $command[0]]);
                    
                } elseif ($command[0] == "/ipunban" && is_numeric($command[1])) {
                    $userId = $command[1];
                    unbanIp($con, $userId);
        
                    http_response_code(200); // OK
                    echo json_encode(['message' => 'User unbanned successfully', 'data' => $command[1], 'command'=> $command[0]]);

                } elseif ($command[0] == "/getipbans") {
                    $bans = getBannedIpIds($con);
                    http_response_code(200); // OK
                    echo json_encode(['data' => $bans, 'command'=> $command[0], 'message' => 'Bans retrieved successfully']);
                } elseif ($command[0] == "/getidbybans" && is_numeric($command[1])) {
                    $bans = getUserIdsByIp($con, getIpByBanId($con, $command[1]));
                    http_response_code(200); // OK
                    echo json_encode(['data' => $bans, 'command'=> $command[0], 'message' => 'Bans retrieved successfully']);
                } elseif ($command[0] == "/checkuser" && is_numeric($command[1])) {
                    $bans = getUsersWithSameIp($con, $command[1]);
                    $isBanned = checkUserIpBanStatus($con, $command[1]);
                    http_response_code(200); // OK
                    echo json_encode(['data' => [
                        'sameIp' => $bans,
                        'isBanned' => $isBanned, 
                        'userId' => $command[1]
                    ], 'command'=> $command[0], 'message' => 'User checked successfully']);
                } else {
                    http_response_code(400); // Bad Request
                    echo json_encode(['error' => 'Invalid command']);
                }
            } else {
                http_response_code(403); // Forbidden
                echo json_encode(['error' => 'You are not allowed to use this command']);
            }
        } else {
            $usernameLength = mb_strlen(sanitizeInput($data['username'], true));
            $contentLength = mb_strlen(sanitizeInput($data['content'], false));
            $contentLengthWithEmoji = mb_strlen(checkForCommands(sanitizeInput($data['content'], false)));
            $sessionToken = $data['sessionToken'];

            if ($contentLength > $maxMessageLength) {
                http_response_code(400); // Bad Request
                echo json_encode(['error' => 'Content length exceeds the allowed limit: ' . $maxMessageLength . ' characters']);
            } elseif ($usernameLength > $maxNicknameLength) {
                http_response_code(400); // Bad Request
                echo json_encode(['error' => 'Username length exceeds the allowed limit: ' . $maxNicknameLength . ' characters']);
            } elseif ($usernameLength < $minNicknameLength) {
                http_response_code(400); // Bad Request
                echo json_encode(['error' => 'Username length is too short, Minimum length: '. $minNicknameLength .' characters. Watch out for characters that are not allowed, The only characters allowed are letters, numbers, semicolons, and underscores. (a-z, A-Z, 0-9, :, ;, _)']);
            } elseif ($contentLength < $minMessageLength) {
                http_response_code(400); // Bad Request
                echo json_encode(['error' => 'Content length is too short, watch out for characters that are not allowed. Minimum length: ' . $minMessageLength . ' characters']);
            } elseif ($contentLengthWithEmoji > $maxMessageLength) {
                http_response_code(400); // Bad Request
                echo json_encode(['error' => 'Content length (when applying emoji\'s) exceeds the allowed limit: ' . $maxMessageLength . ' characters']);
            } elseif ($contentLengthWithEmoji < $minMessageLength) {
                http_response_code(400); // Bad Request
                echo json_encode(['error' => 'Content length (when applying emoji\'s) is too short, watch out for characters that are not allowed. Minimum length: ' . $minMessageLength . ' characters']);
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
                    include_once '../users/users.php';
                    $userData = getUserDataByToken($sessionToken, $con, $userdataBySessionToken, $ipAddress);
                    if ($userData == null) {
                        http_response_code(403); // Forbidden
                        echo json_encode(['error' => 'You are banned from sending messages', "ip" => $ipAddress]);
                    } elseif ($userData["banned"] == 1) {
                        http_response_code(403); // Forbidden
                        echo json_encode(['error' => 'You are banned from sending messages', "ip" => $ipAddress]);
                    } else {
                        // Insert the new message into the database
                        $insertSql = "INSERT INTO messages (content, username, datetime, sessionToken) VALUES ('$content', '$username', NOW(), '$sessionToken')";
            
                        $result = mysqli_query($con, $insertSql);
                        if ($result) {
                            deleteInactiveUsers($con);
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