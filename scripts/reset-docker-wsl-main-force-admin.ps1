$ErrorActionPreference = "Stop"

$backupDir = Join-Path $env:USERPROFILE "Desktop\wsl-docker-backup"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$logFile = Join-Path $backupDir "reset-docker-wsl-main-force-admin.log"

function Write-Log {
  param([string]$Message)

  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  "$timestamp $Message" | Tee-Object -FilePath $logFile -Append
}

Write-Log "Starting force reset for Docker WSL main."

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

$lxssRoot = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Lxss"
Get-ChildItem $lxssRoot -ErrorAction SilentlyContinue |
  Where-Object { (Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue).DistributionName -eq "docker-desktop" } |
  ForEach-Object {
    Remove-Item -Path $_.PSPath -Recurse -Force
    Write-Log "Removed docker-desktop registry entry $($_.PSChildName)."
  }

Remove-ItemProperty -Path $lxssRoot -Name DefaultDistribution -ErrorAction SilentlyContinue
Write-Log "Removed DefaultDistribution value if present."

$mainDir = "C:\Users\devis posit\AppData\Local\Docker\wsl\main"
if (Test-Path $mainDir) {
  $suffix = Get-Date -Format "yyyyMMdd-HHmmss"
  Rename-Item -Path $mainDir -NewName ("main.bak-" + $suffix)
  Write-Log "Renamed Docker WSL main folder."
}

sc.exe start wslservice | Tee-Object -FilePath $logFile -Append
Start-Sleep -Seconds 4

try {
  wsl.exe -l -v --all 2>&1 | Tee-Object -FilePath $logFile -Append
  Write-Log "wsl -l -v --all completed."
} catch {
  Write-Log "wsl -l -v --all failed: $($_.Exception.Message)"
}

Write-Log "Force reset finished."
