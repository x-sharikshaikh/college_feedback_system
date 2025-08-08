# Runs Prisma migrate and seed for the backend
param(
  [string]$DatabaseUrl = "postgresql://feedback:feedback@localhost:5432/feedback?schema=public"
)

$ErrorActionPreference = 'Stop'

Push-Location "c:\Users\mahir\college_feedback_system\backend"
try {
  $env:DATABASE_URL = $DatabaseUrl
  npx prisma generate
  npx prisma migrate dev --name init
  npm run prisma:seed
} finally {
  Pop-Location
}
