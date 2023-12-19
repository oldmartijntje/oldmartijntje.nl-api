<?php

function getUserDataByToken($sessionToken, $conn, $dict, $ipAddress = null) {
   if (isset($dict[$sessionToken])) {
       return $dict[$sessionToken];
   } else {
       $userData = getFromDatabase($sessionToken, $conn, $ipAddress);
       if ($userData == null) {
           return null;
       }
       $dict[$sessionToken] = $userData;
       return $userData;
   }
}

function getFromDatabase($sessionToken, $conn, $ipAddress = null) {
    // Use NOW() to update the lastAccessed column
    $stmt = $conn->prepare("SELECT *, NOW() as lastAccessed FROM users WHERE sessionToken = ? LIMIT 1");
    $stmt->bind_param("s", $sessionToken);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();

        // If you want to update the lastAccessed column in the database as well, you can do it here
        updateLastAccessed($sessionToken, $conn, $ipAddress);

        return $row;
    } else {
        // User does not exist, create a new user
        $returnValue = createUserIfNotExists($sessionToken, $conn, $ipAddress);
        if ($returnValue == false) {
            return null;
        }
        return getFromDatabase($sessionToken, $conn, $ipAddress);
    }
}

// Example function to update lastAccessed in the database
function updateLastAccessed($sessionToken, $conn, $ipAddress = null) {
    // Update lastAccessed
    $updateStmt = $conn->prepare("UPDATE users SET lastAccessed = NOW() WHERE sessionToken = ?");
    $updateStmt->bind_param("s", $sessionToken);
    $updateStmt->execute();

    // Check if ipAddress is provided and update it
    if ($ipAddress !== null) {
        $updateCreationIp = false;

        // Check if creationIp is 0
        $checkCreationIpStmt = $conn->prepare("SELECT creationIp FROM users WHERE sessionToken = ?");
        $checkCreationIpStmt->bind_param("s", $sessionToken);
        $checkCreationIpStmt->execute();
        $checkCreationIpStmt->bind_result($creationIp);
        $checkCreationIpStmt->fetch();
        $checkCreationIpStmt->close();

        if ($creationIp == 0) {
            $updateCreationIp = true;
        }

        // Update ipAddress
        $updateStmt = $conn->prepare("UPDATE users SET ipAddress = ? WHERE sessionToken = ?");
        $updateStmt->bind_param("ss", $ipAddress, $sessionToken);
        $updateStmt->execute();

        // Update creationIp if needed
        if ($updateCreationIp) {
            $updateCreationIpStmt = $conn->prepare("UPDATE users SET creationIp = ? WHERE sessionToken = ?");
            $updateCreationIpStmt->bind_param("ss", $ipAddress, $sessionToken);
            $updateCreationIpStmt->execute();
        }
    }
}

function createUserIfNotExists($sessionToken, $conn, $ipAddress = null) {
    if ($ipAddress === null) {
        $ipAddress = "";
    }

    // Check if the current IP is banned
    if (isIpBanned($conn, $ipAddress)) {
        // Handle the case where the IP is banned, for example, throw an exception or log an error
        return false;
    }

    // Set default values for the new user
    $type = '';
    $banned = 0;
    $neverExpire = 0;

    // Insert a new user with the provided session token
    $stmt = $conn->prepare("INSERT INTO users (type, sessionToken, banned, neverExpire, lastAccessed, ipAddress, creationIp) VALUES (?, ?, ?, ?, NOW(), ?, ?)");
    $stmt->bind_param("ssssss", $type, $sessionToken, $banned, $neverExpire, $ipAddress, $ipAddress);
    $stmt->execute();
    return true;
}

function isIpBanned($conn, $ipAddress) {
    $stmt = $conn->prepare("SELECT COUNT(*) FROM ipBan WHERE ipAddress = ?");
    $stmt->bind_param("s", $ipAddress);
    $stmt->execute();
    $stmt->bind_result($count);
    $stmt->fetch();
    $stmt->close();

    return $count > 0;
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
    if ($userData == null) {
        return false;
    }
    
    return $userData["type"] === "admin";
}

function deleteInactiveUsers($conn) {
    // Calculate the date one week ago and one month ago
    $oneWeekAgo = date('Y-m-d H:i:s', strtotime('-1 week'));
    $oneMonthAgo = date('Y-m-d H:i:s', strtotime('-1 month'));

    // Delete users based on the specified conditions
    $stmt = $conn->prepare("DELETE FROM users WHERE 
                           (lastAccessed < ? AND type = '' AND neverExpire = 0) OR 
                           (lastAccessed < ? AND type != '' AND neverExpire = 0)");

    $stmt->bind_param("ss", $oneWeekAgo, $oneMonthAgo);
    $stmt->execute();
    
    // Check if any rows were affected
    $rowsAffected = $stmt->affected_rows;

    return $rowsAffected;
}

function getUserIdsByIp($conn, $ip) {
    $stmt = $conn->prepare("SELECT id FROM users WHERE ipAddress = ? OR creationIp = ?");
    $stmt->bind_param("ss", $ip, $ip);
    $stmt->execute();
    $result = $stmt->get_result();

    $userIds = [];
    while ($row = $result->fetch_assoc()) {
        $userIds[] = $row['id'];
    }

    return $userIds;
}

function getBannedIpIds($conn) {
    $stmt = $conn->prepare("SELECT id FROM ipBan");
    $stmt->execute();
    $result = $stmt->get_result();

    $bannedIpIds = [];
    while ($row = $result->fetch_assoc()) {
        $bannedIpIds[] = $row['id'];
    }

    return $bannedIpIds;
}

function getIpByBanId($conn, $banId) {
    $stmt = $conn->prepare("SELECT ipAddress FROM ipBan WHERE id = ?");
    $stmt->bind_param("i", $banId);
    $stmt->execute();
    $stmt->bind_result($ipAddress);
    $stmt->fetch();
    $stmt->close();

    return $ipAddress;
}

function getUsersWithSameIp($conn, $userId) {
    $stmt = $conn->prepare("SELECT id, ipAddress, creationIp FROM users WHERE id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $stmt->bind_result($id, $ipAddress, $creationIp);
    $stmt->fetch();
    $stmt->close();

    if ($id === null) {
        // User not found
        return [];
    }

    // Search for other users with the same ipAddress or creationIp
    $stmt = $conn->prepare("SELECT id FROM users WHERE (ipAddress = ? OR creationIp = ?) AND id != ?");
    $stmt->bind_param("ssi", $ipAddress, $creationIp, $userId);
    $stmt->execute();
    $result = $stmt->get_result();

    $matchingUserIds = [];
    while ($row = $result->fetch_assoc()) {
        $matchingUserIds[] = $row['id'];
    }

    return $matchingUserIds;
}


?>