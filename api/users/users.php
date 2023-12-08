<?php

function getUserDataByToken($sessionToken, $conn, $dict) {
   if (isset($dict[$sessionToken])) {
       return $dict[$sessionToken];
   } else {
       $userData = getFromDatabase($sessionToken, $conn);
       $dict[$sessionToken] = $userData;
       return $userData;
   }
}

function getFromDatabase($sessionToken, $conn) {
    $stmt = $conn->prepare("SELECT * FROM users WHERE sessionToken = ? LIMIT 1");
    $stmt->bind_param("s", $sessionToken);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        return $row;
    } else {
        // User does not exist, create a new user
        createUserIfNotExists($sessionToken, $conn);
        return getFromDatabase($sessionToken, $conn);
    }
}

function createUserIfNotExists($sessionToken, $conn) {

    // Set default values for the new user
    $type = '';
    $banned = 0;

    // Insert a new user with the provided session token
    $stmt = $conn->prepare("INSERT INTO users (type, sessionToken, banned) VALUES (?, ?, ?)");
    $stmt->bind_param("sss", $type, $sessionToken, $banned);
    $stmt->execute();
}






?>