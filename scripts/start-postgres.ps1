param(
  [string]$Name = "cfs-postgres",
  [string]$Password = "feedback",
  [string]$User = "feedback",
  [string]$Db = "feedback",
  [int]$Port = 5432
)

# Requires Docker Desktop running
$existing = docker ps -a --filter "name=$Name" --format "{{.Names}}:{{.Status}}"
if (-not $?) { Write-Error "Docker not running. Please start Docker Desktop."; exit 1 }

if ($existing) {
  if ($existing -match "Up") {
    Write-Output "Postgres container '$Name' already running."
  } else {
    Write-Output "Starting existing Postgres container '$Name'..."
    docker start $Name | Out-Null
  }
} else {
  Write-Output "Creating and starting Postgres container '$Name'..."
  docker run -d --name $Name -e POSTGRES_PASSWORD=$Password -e POSTGRES_USER=$User -e POSTGRES_DB=$Db -p $Port:5432 postgres:16 | Out-Null
}

Write-Output "Postgres ready on localhost:$Port"
