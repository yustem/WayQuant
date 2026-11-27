param([switch]$NoBrowser)

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$logDir = Join-Path $PSScriptRoot '.verification-start'
$python = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
$started = @()
$mutex = New-Object System.Threading.Mutex($false, 'Local\WayQuantDevelopmentStartup')
$locked = $false

function Test-Http([string]$Url, [string]$Expected) {
    $request = [System.Net.HttpWebRequest]::Create($Url)
    $request.Proxy = $null
    $request.Timeout = 1500
    $request.ReadWriteTimeout = 1500
    $response = $null
    $reader = $null
    try {
        $response = $request.GetResponse()
        $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
        return ($reader.ReadToEnd() -match $Expected)
    }
    catch { return $false }
    finally {
        if ($reader) { $reader.Dispose() }
        if ($response) { $response.Dispose() }
    }
}

function Assert-FreePort([int]$Port) {
    $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
    try { $listener.Start() }
    catch { throw "Port $Port is occupied by another service. Close it and run start.bat again." }
    finally { $listener.Stop() }
}

function Wait-Ready($Process, [string]$Url, [string]$Expected, [string]$Name) {
    $deadline = [DateTime]::UtcNow.AddSeconds(45)
    do {
        if ($Process.HasExited) { throw "$Name exited. See $logDir\$Name.err.log" }
        if (Test-Http $Url $Expected) { return }
        Start-Sleep -Milliseconds 500
    } while ([DateTime]::UtcNow -lt $deadline)
    throw "$Name did not become ready in 45 seconds. See $logDir\$Name.err.log"
}

try {
    $locked = $mutex.WaitOne(0)
    if (-not $locked) { throw 'Another WayQuant launcher is running. Wait for it to finish.' }
    New-Item -ItemType Directory -Force -Path $logDir | Out-Null

    # Bypass HTTP proxies only for local traffic. Keep external network settings.
    $env:NO_PROXY = (@($env:NO_PROXY, 'localhost', '127.0.0.1', '::1') | Where-Object { $_ }) -join ','
    $env:no_proxy = $env:NO_PROXY
    # The existing Vite proxy uses localhost; the API listens on IPv4.
    $env:NODE_OPTIONS = "$env:NODE_OPTIONS --dns-result-order=ipv4first".Trim()

    $apiReady = Test-Http 'http://127.0.0.1:8000/api/v1/health' '"status"\s*:\s*"ok"'
    $uiReady = (Test-Http 'http://127.0.0.1:5173/' '/src/main') -and
               (Test-Http 'http://127.0.0.1:5173/@vite/client' 'vite')
    if (-not $apiReady) { Assert-FreePort 8000 }
    if (-not $uiReady) { Assert-FreePort 5173 }

    $node = (Get-Command node.exe -ErrorAction Stop).Source
    $nodeVersion = & $node --version
    if ($LASTEXITCODE -ne 0 -or [int]($nodeVersion.TrimStart('v').Split('.')[0]) -lt 20) { throw 'Node.js 20 or newer is required.' }

    if (-not $apiReady) {
        if (-not (Test-Path -LiteralPath $python)) {
            Write-Host 'Preparing the Python environment (first launch)...'
            $candidates = @()
            foreach ($command in @('py.exe', 'python.exe')) {
                $found = Get-Command $command -ErrorAction SilentlyContinue
                if ($found) { $candidates += $found.Source }
            }
            # Also support the Python bundled with this user's Codex installation.
            $candidates += Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
            $basePython = $null
            foreach ($candidate in $candidates) {
                if (-not (Test-Path -LiteralPath $candidate)) { continue }
                & $candidate -c 'import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)' 2>$null
                if ($LASTEXITCODE -eq 0) { $basePython = $candidate; break }
            }
            if (-not $basePython) { throw 'Python 3.11+ was not found. Install Python and run start.bat again.' }
            & $basePython -m venv (Join-Path $PSScriptRoot '.venv')
            if ($LASTEXITCODE -ne 0) { throw 'Could not create .venv. See the Python error above.' }
        }
        & $python -c "import importlib.util as u, sys; sys.exit(0 if all(u.find_spec(m) for m in ['fastapi', 'uvicorn', 'numpy', 'pydantic']) else 1)"
        if ($LASTEXITCODE -ne 0) {
            Write-Host 'Installing API dependencies (internet required for initial setup)...'
            & $python -m pip install --disable-pip-version-check -r (Join-Path $PSScriptRoot 'backend\requirements.txt')
            if ($LASTEXITCODE -ne 0) { throw 'API dependency installation failed. Check the network/proxy error above and retry.' }
        }
    }

    $vite = Join-Path $PSScriptRoot 'frontend\node_modules\vite\bin\vite.js'
    if (-not $uiReady -and -not (Test-Path -LiteralPath $vite)) {
        Write-Host 'Installing frontend dependencies (internet required for initial setup)...'
        Push-Location -LiteralPath (Join-Path $PSScriptRoot 'frontend')
        try {
            & npm.cmd ci --no-audit --no-fund
            if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed. Check the error above and retry.' }
        }
        finally { Pop-Location }
    }

    if (-not $apiReady) {
        Write-Host 'Starting API...'
        $apiProcess = Start-Process -FilePath $python -ArgumentList @('-m', 'uvicorn', 'app.main:app', '--app-dir', 'backend', '--host', '127.0.0.1', '--port', '8000', '--limit-concurrency', '8') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput "$logDir\api.out.log" -RedirectStandardError "$logDir\api.err.log"
        $started += $apiProcess
        Wait-Ready $apiProcess 'http://127.0.0.1:8000/api/v1/health' '"status"\s*:\s*"ok"' 'api'
    }
    if (-not $uiReady) {
        Write-Host 'Starting frontend...'
        $uiProcess = Start-Process -FilePath $node -ArgumentList @(('"{0}"' -f $vite), '--host', '127.0.0.1', '--port', '5173', '--strictPort') -WorkingDirectory (Join-Path $PSScriptRoot 'frontend') -WindowStyle Hidden -PassThru -RedirectStandardOutput "$logDir\ui.out.log" -RedirectStandardError "$logDir\ui.err.log"
        $started += $uiProcess
        Wait-Ready $uiProcess 'http://127.0.0.1:5173/' '/src/main' 'ui'
    }
    if (-not (Test-Http 'http://127.0.0.1:5173/api/v1/health' '"status"\s*:\s*"ok"')) {
        throw 'Frontend cannot reach the API through its proxy. See the UI log; check VPN loopback exclusions.'
    }
    Write-Host 'WayQuant is ready: http://127.0.0.1:5173'
    Write-Host "Logs: $logDir"
    if (-not $NoBrowser) { Start-Process 'http://127.0.0.1:5173' }
}
catch {
    foreach ($child in $started) {
        if (-not $child.HasExited) { Stop-Process -Id $child.Id -ErrorAction SilentlyContinue }
    }
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
finally {
    if ($locked) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
