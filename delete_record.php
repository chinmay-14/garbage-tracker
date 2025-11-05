<?php
header('Content-Type: application/json; charset=utf-8');

$conn = new mysqli("localhost", "root", "", "gtracker");
if ($conn->connect_error) {
  echo json_encode(['status'=>'error']);
  exit;
}

$id = isset($_POST['id']) ? intval($_POST['id']) : 0;
if ($id <= 0) {
  echo json_encode(['status'=>'error','message'=>'Invalid id']);
  exit;
}

// Find image path and delete the file
$stmt = $conn->prepare("SELECT image_path FROM garbage_records WHERE id = ?");
$stmt->bind_param('i', $id);
$stmt->execute();
$stmt->bind_result($image_path);
$stmt->fetch();
$stmt->close();

if ($image_path) {
  $full = __DIR__ . '/' . $image_path;
  if (is_file($full)) @unlink($full);
}

$stmt = $conn->prepare("DELETE FROM garbage_records WHERE id = ?");
$stmt->bind_param('i', $id);
$ok = $stmt->execute();

if ($ok) echo json_encode(['status'=>'success']);
else echo json_encode(['status'=>'error','message'=>'Failed to delete']);

$stmt->close();
$conn->close();
?>
