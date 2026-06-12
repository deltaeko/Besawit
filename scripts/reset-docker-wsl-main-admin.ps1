$ErrorActionPreference = "Stop"

$backupDir = Join-Path $env:USERPROFILE "Desktop\wsl-docker-backup"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$logFile = Join-Path $backupDir "reset-docker-wsl-main-admin.log"

function Write-Log {
  param([string]$Message)

  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  "$timestamp $Message" | Tee-Object -FilePath $logFile -Append
}

Write-Log "Starting Docker WSL main reset."

Get-Process -Name "Docker Desktop", "com.docker.backend" -ErrorAction SilentlyContinue |
  Stop-Process -Force -ErrorAction SilentlyContinue
Write-Log "Docker Desktop processes stopped."

if (Get-Service -Name "com.docker.service" -ErrorAction SilentlyContinue) {
  Stop-Service -Name "com.docker.service" -Force -ErrorAction SilentlyContinue
  Write-Log "Docker Desktop service stopped."
}

$wslPid = (sc.exe queryex wslservice | Select-String "PID").ToString().Split(":")[-1].Trim()

try {
  Stop-Service -Name "wslservice" -Force -ErrorAction Stop
  Write-Log "WSL service stop requested."
  Start-Sleep -Seconds 5
} catch {
  Write-Log "Stop-Service wslservice raised: $($_.Exception.Message)"
}

if ((Get-Service wslservice).Status -ne "Stopped" -and $wslPid -match "^\d+$" -and $wslPid -ne "0") {
  taskkill /F /PID $wslPid | Out-Null
  Write-Log "Forced termination of wslservice PID $wslPid."
  Start-Sleep -Seconds 3
}

$lxssRoot = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Lxss"
$dockerKey = Get-ChildItem $lxssRoot -ErrorAction SilentlyContinue |
  Where-Object { (Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue).DistributionName -eq "docker-desktop" } |
  Select-Object -First 1

if ($dockerKey) {
  Remove-Item -Path $dockerKey.PSPath -Recurse -Force
  Write-Log "Removed docker-desktop registry key $($dockerKey.PSChildName)."
}

$defaultDistribution = (Get-ItemProperty $lxssRoot -ErrorAction SilentlyContinue).DefaultDistribution
if ($defaultDistribution) {
  Remove-ItemProperty -Path $lxssRoot -Name DefaultDistribution -ErrorAction SilentlyContinue
  Write-Log "Removed DefaultDistribution value."
}

$mainDir = "C:\Users\devis posit\AppData\Local\Docker\wsl\main"
if (Test-Path $mainDir) {
  $suffix = Get-Date -Format "yyyyMMdd-HHmmss"
  $backupMainDir = "C:\Users\devis posit\AppData\Local\Docker\wsl\main.bak-$suffix"
  Rename-Item -Path $mainDir -NewName ("main.bak-" + $suffix)
  Write-Log "Renamed Docker WSL main folder to $backupMainDir."
}

Start-Service -Name "wslservice"
Write-Log "WSL service started."

try {
  wsl.exe -l -v --all 2>&1 | Out-File -FilePath $logFile -Append
  Write-Log "wsl -l -v --all executed after reset."
} catch {
  Write-Log "wsl -l -v --all failed after reset: $($_.Exception.Message)"
}

Write-Log "Docker WSL main reset finished."
