<?php
header('Content-Type: application/json; charset=utf-8');

$host = "localhost";
$user = "root";
$pass = "";
$dbname = "gtracker";

$conn = new mysqli($host, $user, $pass, $dbname);
if ($conn->connect_error) {
  echo json_encode(['status'=>'error','message'=>'DB connection failed']);
  exit;
}

if (!isset($_FILES['image']) || !isset($_POST['latitude']) || !isset($_POST['longitude'])) {
  echo json_encode(['status'=>'error','message'=>'Missing parameters']);
  exit;
}

$latitude = floatval($_POST['latitude']);
$longitude = floatval($_POST['longitude']);

$uploadDir = __DIR__ . '/uploads/';
if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

$filename = time() . '_' . basename($_FILES['image']['name']);
$targetPath = $uploadDir . $filename;
$relativePath = 'uploads/' . $filename;

if (!move_uploaded_file($_FILES['image']['tmp_name'], $targetPath)) {
  echo json_encode(['status'=>'error','message'=>'Failed to move uploaded file']);
  exit;
}

$stmt = $conn->prepare("INSERT INTO garbage_records (image_path, latitude, longitude) VALUES (?, ?, ?)");
$stmt->bind_param('sdd', $relativePath, $latitude, $longitude);
$ok = $stmt->execute();

if ($ok) echo json_encode(['status'=>'success','message'=>'Record saved']);
else echo json_encode(['status'=>'error','message'=>'DB insert failed']);

$stmt->close();
$conn->close();
?>
