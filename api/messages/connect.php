<?php

// db credentials
require_once '../../environment.php';

// Connect with the database.
function connect($db_data)
{
  $connect = mysqli_connect($db_data['DB_HOST'], $db_data['DB_USER'], $db_data['DB_PASS'], $db_data['DB_NAME']);

  if (mysqli_connect_errno($connect)) {
    die("Failed to connect:" . mysqli_connect_error());
  }

  mysqli_set_charset($connect, "utf8");

  return $connect;
}

$con = connect($db_data);