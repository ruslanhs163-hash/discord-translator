Add-Type -AssemblyName System.Windows.Forms

# Клик по иконке сервера WARDOGS (X=2050, Y=280)
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(2050, 280)
Start-Sleep -Milliseconds 200

$signature = @"
[DllImport("user32.dll",CharSet=CharSet.Auto, CallingConvention=CallingConvention.StdCall)]
public static extern void mouse_event(long dwFlags, long dx, long dy, long cButtons, long dwExtraInfo);
"@

$SendMouseClick = Add-Type -memberDefinition $signature -name "Win32MouseEventNew" -namespace Win32Functions -passThru

# Клик по серверу WARDOGS
$SendMouseClick::mouse_event(0x02, 0, 0, 0, 0)
$SendMouseClick::mouse_event(0x04, 0, 0, 0, 0)

Start-Sleep -Seconds 1

# Клик по каналу # support (X=2120, Y=330)
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(2120, 330)
$SendMouseClick::mouse_event(0x02, 0, 0, 0, 0)
$SendMouseClick::mouse_event(0x04, 0, 0, 0, 0)

Write-Host "Clicked WARDOGS server and # support channel"
