<?php

function getUserDataByToken($sessionToken, $conn) {

    $stmt = $conn->prepare("SELECT * FROM users WHERE sessionToken = ? LIMIT 1");
    $stmt->bind_param("s", $sessionToken);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        return $row;
    } else {
        // User does not exist, create a new user
        return createUserIfNotExists($sessionToken, $conn);
    }
}

function createUserIfNotExists($sessionToken, $conn) {

    // Set default values for the new user
    $type = '';
    // $banned = false;

    // Insert a new user with the provided session token
    $stmt = $conn->prepare("INSERT INTO users (type, sessionToken) VALUES (?, ?)");
    $stmt->bind_param("sss", $type, $sessionToken);
    $stmt->execute();

    // Retrieve the newly created user's data
    return getUserDataByToken($sessionToken);
}






?>