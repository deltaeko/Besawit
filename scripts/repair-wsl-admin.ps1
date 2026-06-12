$ErrorActionPreference = "Stop"

$backupDir = Join-Path $env:USERPROFILE "Desktop\wsl-docker-backup"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$logFile = Join-Path $backupDir "repair-wsl-admin.log"

function Write-Log {
  param([string]$Message)

  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  "$timestamp $Message" | Tee-Object -FilePath $logFile -Append
}

Write-Log "Starting WSL recovery."

Get-Process -Name "Docker Desktop", "com.docker.backend" -ErrorAction SilentlyContinue |
  Stop-Process -Force -ErrorAction SilentlyContinue
Write-Log "Docker Desktop processes stopped if they were running."

if (Get-Service -Name "com.docker.service" -ErrorAction SilentlyContinue) {
  Stop-Service -Name "com.docker.service" -Force -ErrorAction SilentlyContinue
  Write-Log "Docker Desktop service stopped."
}

Stop-Service -Name "wslservice" -Force
Write-Log "WSL service stopped."

Start-Service -Name "wslservice"
Write-Log "WSL service started."

try {
  wsl.exe --shutdown
  Write-Log "wsl --shutdown completed."
} catch {
  Write-Log "wsl --shutdown failed: $($_.Exception.Message)"
}

$listSucceeded = $false

try {
  $listOutput = wsl.exe -l -v --all 2>&1
  $listSucceeded = $true
  Write-Log "wsl -l -v --all succeeded."
  $listOutput | Out-File -FilePath $logFile -Append
} catch {
  Write-Log "wsl -l -v --all failed: $($_.Exception.Message)"
}

if (-not $listSucceeded) {
  $msiPath = "C:\Users\devis posit\AppData\Local\Temp\wsl.2.6.3.0.x64.msi"
  if (Test-Path $msiPath) {
    Write-Log "Attempting WSL repair from $msiPath"
    $repair = Start-Process msiexec.exe -ArgumentList @("/i", "`"$msiPath`"", "/qn", "/norestart") -Wait -PassThru
    Write-Log "WSL repair exit code: $($repair.ExitCode)"
  } else {
    Write-Log "WSL MSI not found at expected path."
  }

  Start-Sleep -Seconds 5

  try {
    $statusOutput = wsl.exe --status 2>&1
    Write-Log "wsl --status completed after repair."
    $statusOutput | Out-File -FilePath $logFile -Append
  } catch {
    Write-Log "wsl --status failed after repair: $($_.Exception.Message)"
  }

  try {
    $listOutput = wsl.exe -l -v --all 2>&1
    Write-Log "wsl -l -v --all completed after repair."
    $listOutput | Out-File -FilePath $logFile -Append
  } catch {
    Write-Log "wsl -l -v --all still failed after repair: $($_.Exception.Message)"
  }
}

Write-Log "WSL recovery script finished."
