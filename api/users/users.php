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
    // Use NOW() to update the lastAccessed column
    $stmt = $conn->prepare("SELECT *, NOW() as lastAccessed FROM users WHERE sessionToken = ? LIMIT 1");
    $stmt->bind_param("s", $sessionToken);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();

        // If you want to update the lastAccessed column in the database as well, you can do it here
        updateLastAccessed($sessionToken, $conn);

        return $row;
    } else {
        // User does not exist, create a new user
        createUserIfNotExists($sessionToken, $conn);
        return getFromDatabase($sessionToken, $conn);
    }
}

// Example function to update lastAccessed in the database
function updateLastAccessed($sessionToken, $conn) {
    $updateStmt = $conn->prepare("UPDATE users SET lastAccessed = NOW() WHERE sessionToken = ?");
    $updateStmt->bind_param("s", $sessionToken);
    $updateStmt->execute();
}

function createUserIfNotExists($sessionToken, $conn) {

    // Set default values for the new user
    $type = '';
    $banned = 0;
    $ipAdress = '';
    $calls = 0;
    $neverExpire = 0;

    // Insert a new user with the provided session token
    $stmt = $conn->prepare("INSERT INTO users (type, sessionToken, banned, neverExpire, lastAccessed, ipAdress, calls) VALUES (?, ?, ?, ?, NOW(), ?, ?)");
    $stmt->bind_param("ssssss", $type, $sessionToken, $banned, $neverExpire, $ipAdress, $calls);
    $stmt->execute();
}

function banUser($con, $userId, $status) {
    $sql = "UPDATE users SET banned = ? WHERE id = ?";
    $stmt = mysqli_prepare($con, $sql);

    if ($stmt) {
        mysqli_stmt_bind_param($stmt, "ii", $status, $userId);
        $result = mysqli_stmt_execute($stmt);
        mysqli_stmt_close($stmt);

        return $result;
    } else {
        return false;
    }
}

function isAdmin($data, $con, $userdataBySessionToken) {
    $userData = getUserDataByToken($data, $con, $userdataBySessionToken);
    
    return $userData["type"] === "admin";
}






?>