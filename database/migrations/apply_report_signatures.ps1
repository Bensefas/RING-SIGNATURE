$ErrorActionPreference = "Stop"

$securePassword = Read-Host "PostgreSQL password (input is hidden)" -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")

try {
    $env:DB_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    Push-Location (Join-Path $projectRoot "server")
    try {
        node .\scripts\applyReportSignatureMigration.js
        if ($LASTEXITCODE -ne 0) {
            throw "Migration failed. See the database error above."
        }
    }
    finally {
        Pop-Location
    }
}
finally {
    Remove-Item Env:DB_PASSWORD -ErrorAction SilentlyContinue
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    $securePassword.Dispose()
}
