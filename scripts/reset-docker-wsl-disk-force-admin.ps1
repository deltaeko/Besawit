$ErrorActionPreference = "Stop"

$backupDir = Join-Path $env:USERPROFILE "Desktop\wsl-docker-backup"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$logFile = Join-Path $backupDir "reset-docker-wsl-disk-force-admin.log"

function Write-Log {
  param([string]$Message)

  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  "$timestamp $Message" | Tee-Object -FilePath $logFile -Append
}

Write-Log "Starting force reset for Docker WSL disk."

Get-Process -Name "Docker Desktop", "com.docker.backend" -ErrorAction SilentlyContinue |
  Stop-Process -Force -ErrorAction SilentlyContinue
Write-Log "Docker processes stopped."

$serviceInfo = sc.exe queryex wslservice
$pidLine = $serviceInfo | Select-String "PID"
$wslPid = if ($pidLine) { $pidLine.ToString().Split(":")[-1].Trim() } else { "" }

if ($wslPid -match "^\d+$" -and $wslPid -ne "0") {
  taskkill /F /PID $wslPid | Out-Null
  Write-Log "Killed wslservice PID $wslPid."
  Start-Sleep -Seconds 3
}

$diskDir = "C:\Users\devis posit\AppData\Local\Docker\wsl\disk"
if (Test-Path $diskDir) {
  $suffix = Get-Date -Format "yyyyMMdd-HHmmss"
  Rename-Item -Path $diskDir -NewName ("disk.bak-" + $suffix)
  Write-Log "Renamed Docker WSL disk folder."
}

sc.exe start wslservice | Tee-Object -FilePath $logFile -Append
Start-Sleep -Seconds 4

try {
  wsl.exe -l -v --all 2>&1 | Tee-Object -FilePath $logFile -Append
  Write-Log "wsl -l -v --all completed."
} catch {
  Write-Log "wsl -l -v --all failed: $($_.Exception.Message)"
}

Write-Log "Force disk reset finished."
