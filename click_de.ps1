Add-Type -AssemblyName System.Windows.Forms

# Клик по немецкому каналу DE German (X=2080, Y=530)
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(2080, 530)
Start-Sleep -Milliseconds 200

$signature = @"
[DllImport("user32.dll",CharSet=CharSet.Auto, CallingConvention=CallingConvention.StdCall)]
public static extern void mouse_event(long dwFlags, long dx, long dy, long cButtons, long dwExtraInfo);
"@

$SendMouseClick = Add-Type -memberDefinition $signature -name "Win32MouseEventNew" -namespace Win32Functions -passThru

# Клик по каналу DE German
$SendMouseClick::mouse_event(0x02, 0, 0, 0, 0)
$SendMouseClick::mouse_event(0x04, 0, 0, 0, 0)

Write-Host "Clicked DE German channel at (2080, 530)"
