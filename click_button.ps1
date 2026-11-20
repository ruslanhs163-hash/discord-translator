Add-Type -AssemblyName System.Windows.Forms

# Клик по плашке перевода (X=2390, Y=110)
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(2390, 110)
Start-Sleep -Milliseconds 200

$signature = @"
[DllImport("user32.dll",CharSet=CharSet.Auto, CallingConvention=CallingConvention.StdCall)]
public static extern void mouse_event(long dwFlags, long dx, long dy, long cButtons, long dwExtraInfo);
"@

$SendMouseClick = Add-Type -memberDefinition $signature -name "Win32MouseEventNew" -namespace Win32Functions -passThru

# Клик по кнопке
$SendMouseClick::mouse_event(0x02, 0, 0, 0, 0)
Start-Sleep -Milliseconds 100
$SendMouseClick::mouse_event(0x04, 0, 0, 0, 0)

Write-Host "Clicked translator button at (2390, 110)"
