[CmdletBinding()]
param(
    [string]$DbHost = "localhost",
    [int]$DbPort = 5432,
    [string]$DbUser = "postgres",
    [string]$DbName = "university_incident_db",
    [string]$AdminEmail = "admin@university.edu"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function ConvertFrom-SecureInput {
    param([Security.SecureString]$Value)

    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}

function ConvertTo-DotEnvValue {
    param([string]$Value)

    if ($Value -match "[`r`n]") {
        throw "Environment values must not contain line breaks."
    }

    $escaped = $Value.Replace('\', '\\').Replace('"', '\"')
    return '"' + $escaped + '"'
}

function Invoke-ProjectPsql {
    param(
        [string]$Database,
        [string[]]$Arguments
    )

    $connectionArguments = @(
        "-X", "-v", "ON_ERROR_STOP=1",
        "-h", $DbHost,
        "-p", "$DbPort",
        "-U", $DbUser,
        "-d", $Database
    )
    & $script:PsqlPath @connectionArguments @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "psql failed while operating on database '$Database'."
    }
}

$repoRoot = $PSScriptRoot
$serverDir = Join-Path $repoRoot "server"
$schemaFile = Join-Path $repoRoot "database\schema.sql"
$migrationsDir = Join-Path $repoRoot "database\migrations"
$envFile = Join-Path $serverDir ".env"
$envExample = Join-Path $serverDir ".env.example"

foreach ($requiredPath in @($serverDir, $schemaFile, $migrationsDir)) {
    if (-not (Test-Path $requiredPath)) {
        throw "Required project path not found: $requiredPath"
    }
}

$psqlCommand = Get-Command "psql" -ErrorAction SilentlyContinue
$createdbCommand = Get-Command "createdb" -ErrorAction SilentlyContinue
$npmCommand = Get-Command "npm" -ErrorAction SilentlyContinue
if ((-not $psqlCommand -or -not $createdbCommand) -and $env:ProgramFiles) {
    $postgresRoot = Join-Path $env:ProgramFiles "PostgreSQL"
    if (Test-Path $postgresRoot) {
        $postgresBin = Get-ChildItem -Path $postgresRoot -Directory |
            Where-Object { $_.Name -match '^\d+(\.\d+)*$' } |
            Sort-Object { [version]($_.Name + '.0') } -Descending |
            ForEach-Object { Join-Path $_.FullName "bin" } |
            Where-Object { (Test-Path (Join-Path $_ "psql.exe")) -and (Test-Path (Join-Path $_ "createdb.exe")) } |
            Select-Object -First 1
        if ($postgresBin) {
            $env:PATH = "$postgresBin;$env:PATH"
            $psqlCommand = Get-Command "psql" -ErrorAction SilentlyContinue
            $createdbCommand = Get-Command "createdb" -ErrorAction SilentlyContinue
        }
    }
}
if (-not $psqlCommand -or -not $createdbCommand) {
    throw "PostgreSQL command-line tools psql and createdb must be installed and available in PATH."
}
if (-not $npmCommand -or -not (Get-Command "node" -ErrorAction SilentlyContinue)) {
    throw "Node.js and npm must be installed and available in PATH before running this setup."
}

$script:PsqlPath = $psqlCommand.Source
$createdbPath = $createdbCommand.Source
$npmPath = $npmCommand.Source

$dbPassword = ConvertFrom-SecureInput (Read-Host "PostgreSQL password for '$DbUser'" -AsSecureString)
$adminPassword = ConvertFrom-SecureInput (Read-Host "Password to set for $AdminEmail" -AsSecureString)
if ([string]::IsNullOrWhiteSpace($dbPassword) -or [string]::IsNullOrWhiteSpace($adminPassword)) {
    throw "The PostgreSQL and admin passwords cannot be empty."
}

$env:PGPASSWORD = $dbPassword
try {
    $escapedDbName = $DbName.Replace("'", "''")
    $existsOutput = & $script:PsqlPath -X -v ON_ERROR_STOP=1 -h $DbHost -p $DbPort -U $DbUser -d postgres -tA -c "SELECT 1 FROM pg_database WHERE datname = '$escapedDbName';"
    if ($LASTEXITCODE -ne 0) {
        throw "Could not connect to PostgreSQL at ${DbHost}:$DbPort as '$DbUser'."
    }

    $databaseCreated = ($existsOutput -join "").Trim() -ne "1"
    if ($databaseCreated) {
        Write-Host "Creating database '$DbName'..."
        $createdbArguments = @("-h", $DbHost, "-p", "$DbPort", "-U", $DbUser, $DbName)
        & $createdbPath @createdbArguments
        if ($LASTEXITCODE -ne 0) {
            throw "Could not create database '$DbName'."
        }
    }
    else {
        Write-Host "Database '$DbName' already exists; checking its schema without dropping tables."
    }

    $tableCountOutput = & $script:PsqlPath -X -v ON_ERROR_STOP=1 -h $DbHost -p $DbPort -U $DbUser -d $DbName -tA -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"
    if ($LASTEXITCODE -ne 0) {
        throw "Could not inspect database '$DbName'."
    }
    $tableCount = [int](($tableCountOutput -join "").Trim())

    if ($tableCount -eq 0) {
        Write-Host "Initializing the empty database schema..."
        Invoke-ProjectPsql -Database $DbName -Arguments @("--single-transaction", "-f", $schemaFile)

        Get-ChildItem -Path $migrationsDir -Filter "*.sql" | Sort-Object Name | ForEach-Object {
            Write-Host "Applying migration $($_.Name)..."
            Invoke-ProjectPsql -Database $DbName -Arguments @("--single-transaction", "-f", $_.FullName)
        }
    }
    else {
        $requiredTablesOutput = & $script:PsqlPath -X -v ON_ERROR_STOP=1 -h $DbHost -p $DbPort -U $DbUser -d $DbName -tA -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users', 'roles', 'incident_categories', 'incident_statuses');"
        if ($LASTEXITCODE -ne 0 -or [int](($requiredTablesOutput -join "").Trim()) -ne 4) {
            throw "This database has an incomplete schema. No tables were changed; inspect it or choose a new database name."
        }

        $adminCountOutput = & $script:PsqlPath -X -v ON_ERROR_STOP=1 -h $DbHost -p $DbPort -U $DbUser -d $DbName -tA -c "SELECT COUNT(*) FROM users WHERE role_id = 14;"
        if ($LASTEXITCODE -ne 0) {
            throw "Could not check existing admin accounts."
        }
        if ([int](($adminCountOutput -join "").Trim()) -gt 1) {
            throw "Multiple admin accounts already exist. Setup stopped without deleting any accounts; resolve them before rerunning."
        }

        Get-ChildItem -Path $migrationsDir -Filter "*.sql" | Sort-Object Name | ForEach-Object {
            Write-Host "Applying migration $($_.Name)..."
            Invoke-ProjectPsql -Database $DbName -Arguments @("--single-transaction", "-f", $_.FullName)
        }
    }

    $escapedAdminEmail = $AdminEmail.Replace("'", "''")
    $escapedAdminPassword = $adminPassword.Replace("'", "''")
    $seedSql = @"
INSERT INTO roles (role_id, role_name)
VALUES (1, 'STUDENT'), (2, 'STAFF / ICT'), (5, 'HOD'), (10, 'GUIDANCE'), (11, 'CLINIC'), (12, 'SUG'), (14, 'ADMIN')
ON CONFLICT (role_id) DO UPDATE SET role_name = EXCLUDED.role_name;

INSERT INTO incident_categories (category_name, description)
VALUES
  ('Safety and Security', 'Safety, security, or threat-related incidents'),
  ('Harassment and Discrimination', 'Harassment, bullying, or discrimination incidents'),
  ('Health and Wellbeing', 'Health, welfare, or wellbeing concerns'),
  ('Facilities and Infrastructure', 'Buildings, equipment, or campus infrastructure'),
  ('Academic Misconduct', 'Academic integrity or misconduct concerns'),
  ('Other', 'Incidents that do not fit another category')
ON CONFLICT (category_name) DO NOTHING;

INSERT INTO incident_statuses (status_id, status_name)
VALUES (1, 'Pending'), (2, 'Under Review'), (3, 'Resolved')
ON CONFLICT (status_id) DO UPDATE SET status_name = EXCLUDED.status_name;

DO `$setup`$
DECLARE
  admin_count INTEGER;
  admin_email_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM users WHERE role_id = 14;
  SELECT COUNT(*) INTO admin_email_count FROM users WHERE LOWER(email) = LOWER('$escapedAdminEmail');

  IF admin_count > 1 THEN
    RAISE EXCEPTION 'Multiple admin accounts exist; setup stopped without changing them.';
  END IF;
  IF admin_count = 1 AND admin_email_count = 0 THEN
    RAISE EXCEPTION 'A different admin account already exists; setup stopped without replacing it.';
  END IF;
END `$setup`$;

INSERT INTO users (staff_student_id, first_name, last_name, email, password_hash, role_id, is_active)
VALUES ('ADMIN-001', 'System', 'Administrator', '$escapedAdminEmail', crypt('$escapedAdminPassword', gen_salt('bf')), 14, TRUE)
ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    role_id = EXCLUDED.role_id,
    is_active = TRUE;
"@

    Invoke-ProjectPsql -Database $DbName -Arguments @("-c", $seedSql)

    $secretBytes = New-Object byte[] 48
    $randomGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $randomGenerator.GetBytes($secretBytes)
        $jwtSecret = [Convert]::ToBase64String($secretBytes)
    }
    finally {
        $randomGenerator.Dispose()
        [Array]::Clear($secretBytes, 0, $secretBytes.Length)
    }

    $settings = [ordered]@{
        PORT = "5000"
        DB_HOST = $DbHost
        DB_PORT = "$DbPort"
        DB_NAME = $DbName
        DB_USER = $DbUser
        DB_PASSWORD = $dbPassword
        JWT_SECRET = $jwtSecret
    }
    if (Test-Path $envFile) {
        $envLines = @(Get-Content -Path $envFile)
    }
    elseif (Test-Path $envExample) {
        $envLines = @(Get-Content -Path $envExample)
    }
    else {
        $envLines = @()
    }

    $writtenKeys = @{}
    $updatedLines = foreach ($line in $envLines) {
        if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=') {
            $key = $Matches[1]
            if ($settings.Contains($key)) {
                $writtenKeys[$key] = $true
                "$key=$(ConvertTo-DotEnvValue $settings[$key])"
                continue
            }
        }
        $line
    }
    foreach ($key in $settings.Keys) {
        if (-not $writtenKeys.ContainsKey($key)) {
            $updatedLines += "$key=$(ConvertTo-DotEnvValue $settings[$key])"
        }
    }
    $encoding = New-Object System.Text.UTF8Encoding($false)
    [IO.File]::WriteAllLines($envFile, [string[]]$updatedLines, $encoding)
    Write-Host "Updated $envFile while preserving unrelated settings."
}
finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host "Installing backend dependencies..."
Push-Location $serverDir
try {
    & $npmPath ci
    if ($LASTEXITCODE -ne 0) {
        throw "npm ci failed."
    }

    Write-Host "Starting the backend. Press Ctrl+C to stop it."
    & $npmPath start
    if ($LASTEXITCODE -ne 0) {
        throw "The backend exited with an error."
    }
}
finally {
    Pop-Location
}
