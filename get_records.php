<?php
header('Content-Type: application/json; charset=utf-8');

$conn = new mysqli("localhost", "root", "", "gtracker");
if ($conn->connect_error) {
  echo json_encode([]);
  exit;
}

$sql = "SELECT id, image_path, latitude, longitude, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at FROM garbage_records ORDER BY created_at DESC";
$res = $conn->query($sql);

$out = [];
if ($res) while ($row = $res->fetch_assoc()) $out[] = $row;

echo json_encode($out);
$conn->close();
?>
