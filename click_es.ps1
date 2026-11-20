Add-Type -AssemblyName System.Windows.Forms

# Клик по испанскому каналу ES Spanish (X=2080, Y=560)
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(2080, 560)
Start-Sleep -Milliseconds 200

$signature = @"
[DllImport("user32.dll",CharSet=CharSet.Auto, CallingConvention=CallingConvention.StdCall)]
public static extern void mouse_event(long dwFlags, long dx, long dy, long cButtons, long dwExtraInfo);
"@

$SendMouseClick = Add-Type -memberDefinition $signature -name "Win32MouseEventNew" -namespace Win32Functions -passThru

# Клик по каналу ES Spanish
$SendMouseClick::mouse_event(0x02, 0, 0, 0, 0)
$SendMouseClick::mouse_event(0x04, 0, 0, 0, 0)

Write-Host "Clicked ES Spanish channel at (2080, 560)"
