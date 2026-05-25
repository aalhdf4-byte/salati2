$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Prefix = "http://127.0.0.1:4173/"
$ExportDir = Join-Path $Root "exports"
New-Item -ItemType Directory -Force -Path $ExportDir | Out-Null

$Types = @{
  ".html" = "text/html; charset=utf-8"
  ".css" = "text/css; charset=utf-8"
  ".js" = "text/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".png" = "image/png"
}

function Send-Bytes {
  param($Response, [int]$Status, [byte[]]$Bytes, [string]$ContentType)
  $Response.StatusCode = $Status
  if ($ContentType) { $Response.ContentType = $ContentType }
  $Response.ContentLength64 = $Bytes.Length
  $Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
  $Response.Close()
}

function Send-Text {
  param($Response, [int]$Status, [string]$Text, [string]$ContentType = "text/plain; charset=utf-8")
  $Bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
  Send-Bytes -Response $Response -Status $Status -Bytes $Bytes -ContentType $ContentType
}

$Listener = [System.Net.HttpListener]::new()
$Listener.Prefixes.Add($Prefix)

try {
  $Listener.Start()
} catch {
  Write-Host "Could not start server on $Prefix"
  Write-Host "Close any old server window, then run this file again."
  Read-Host "Press Enter to exit"
  exit 1
}

Write-Host "Server is running:"
Write-Host "$($Prefix)eid-adha.html"
Write-Host "Keep this window open while using the page."

while ($Listener.IsListening) {
  $Context = $null
  try {
    $Context = $Listener.GetContext()
    $Request = $Context.Request
    $Response = $Context.Response
    $Path = [Uri]::UnescapeDataString($Request.Url.AbsolutePath)

    if (($Request.HttpMethod -eq "POST") -and ($Path -eq "/save-poster")) {
      $Memory = [System.IO.MemoryStream]::new()
      $Request.InputStream.CopyTo($Memory)
      $Bytes = $Memory.ToArray()

      $Name = $Request.Headers["X-File-Name"]
      if ([string]::IsNullOrWhiteSpace($Name)) {
        $Name = "salati-eid-adha-$([DateTimeOffset]::Now.ToUnixTimeMilliseconds()).png"
      }

      $SafeName = ($Name -replace '[^a-zA-Z0-9._-]', '-')
      $FilePath = Join-Path $ExportDir $SafeName
      [System.IO.File]::WriteAllBytes($FilePath, $Bytes)

      $Json = "{""url"":""/exports/$SafeName"",""size"":$($Bytes.Length)}"
      Send-Text -Response $Response -Status 200 -Text $Json -ContentType "application/json; charset=utf-8"
      continue
    }

    if ($Path -eq "/") {
      $Path = "/eid-adha.html"
    }

    $Relative = $Path.TrimStart("/")
    $File = [System.IO.Path]::GetFullPath((Join-Path $Root $Relative))
    $RootFull = [System.IO.Path]::GetFullPath($Root)

    if (-not $File.StartsWith($RootFull)) {
      Send-Text -Response $Response -Status 403 -Text "Forbidden"
      continue
    }

    if (-not [System.IO.File]::Exists($File)) {
      Send-Text -Response $Response -Status 404 -Text "Not found"
      continue
    }

    $Ext = [System.IO.Path]::GetExtension($File).ToLowerInvariant()
    $ContentType = $Types[$Ext]
    if (-not $ContentType) {
      $ContentType = "application/octet-stream"
    }

    if (($File.Contains("\exports\")) -and ($Ext -eq ".png")) {
      $DownloadName = [System.IO.Path]::GetFileName($File)
      $Response.AddHeader("Content-Disposition", "attachment; filename=""$DownloadName""")
    }

    $Bytes = [System.IO.File]::ReadAllBytes($File)
    Send-Bytes -Response $Response -Status 200 -Bytes $Bytes -ContentType $ContentType
  } catch {
    if ($Context -and $Context.Response) {
      try {
        Send-Text -Response $Context.Response -Status 500 -Text "Server error"
      } catch {}
    }
  }
}
