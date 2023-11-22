<?php
/**
 * Returns the list of messages.
 */
require_once 'connect.php';

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
?>
