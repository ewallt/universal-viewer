#
# Set-Project.ps1
#
# This script copies the specified project's files from the 'staging'
# area to the 'public' directory, making them the active content.
#
# Usage: .\Set-Project.ps1 -ProjectName thinkers
#        .\Set-Project.ps1 -ProjectName byg
#

# --- Configuration ---
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("thinkers", "byg")]
    [string]$ProjectName
)

# Define file paths
$stagingPath = ".\staging"
$schemaDestinationPath = ".\public\data"
$contentDestinationPath = ".\public\data\contents"

# --- Logic ---
Write-Host "--- Activating project: '$ProjectName' ---" -ForegroundColor Yellow

try {
    # 1. Define source and destination file names
    $sourceSchema = Join-Path $stagingPath "schema-$ProjectName.json"
    $destSchema = Join-Path $schemaDestinationPath "schema.json"

    $sourceContent1 = Join-Path $stagingPath "content1-$ProjectName.json"
    $destContent1 = Join-Path $contentDestinationPath "content1.json"

    $sourceContent2 = Join-Path $stagingPath "content2-$ProjectName.json"
    $destContent2 = Join-Path $contentDestinationPath "content2.json"

    # 2. Perform the copy operations, overwriting existing files
    Write-Host "Copying schema file..." -ForegroundColor Cyan
    Copy-Item -Path $sourceSchema -Destination $destSchema -Force
    Write-Host "  OK: '$destSchema' updated."

    Write-Host "Copying content files..." -ForegroundColor Cyan
    Copy-Item -Path $sourceContent1 -Destination $destContent1 -Force
    Write-Host "  OK: '$destContent1' updated."
    Copy-Item -Path $sourceContent2 -Destination $destContent2 -Force
    Write-Host "  OK: '$destContent2' updated."

    Write-Host ""
    Write-Host "--- Project '$ProjectName' is now active. ---" -ForegroundColor Green

} catch {
    Write-Host ""
    Write-Host "An error occurred:" -ForegroundColor Red
    Write-Host $_
}