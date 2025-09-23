$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jaWVkeWNmZ2txdmNxd2R4cHJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTY5OTE0OSwiZXhwIjoyMDY1Mjc1MTQ5fQ.j4AzaxD2layIcpVzjJEM1U3l4_tqtnEYwH9bPI1B0Mo"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jaWVkeWNmZ2txdmNxd2R4cHJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTY5OTE0OSwiZXhwIjoyMDY1Mjc1MTQ5fQ.j4AzaxD2layIcpVzjJEM1U3l4_tqtnEYwH9bPI1B0Mo"
    "Content-Type" = "application/json"
}

$body = @{
    email = "testadmin@example.com"
    password = "testpassword123"
    email_confirm = $true
    user_metadata = @{
        name = "Test Admin"
        role = "admin_unit"
        unit_kerja = "TEST_UNIT"
    }
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://ociedycfgkqvcqwdxxprt.supabase.co/auth/v1/admin/users" \
        -Method Post \
        -Headers $headers \
        -Body $body
    
    Write-Host "✅ Successfully created test user:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5 | Write-Host -ForegroundColor Cyan
    
    # Now update the public.users table
    $supabase = New-Object System.Data.Odbc.OdbcConnection
    $supabase.ConnectionString = "Driver={PostgreSQL Unicode};Server=db.ociedycfgkqvcqwdxxprt.supabase.co;Port=5432;Database=postgres;Uid=postgres;Pwd=your-db-password;"
    $supabase.Open()
    
    $command = $supabase.CreateCommand()
    $command.CommandText = @"
    INSERT INTO public.users (
        id, email, username, name, role, unit_kerja, status, created_at, updated_at
    ) VALUES (
        '11111111-1111-1111-1111-111111111111',
        'testadmin@example.com',
        'testadmin',
        'Test Admin',
        'admin_unit',
        'TEST_UNIT',
        'active',
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        username = EXCLUDED.username,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        unit_kerja = EXCLUDED.unit_kerja,
        status = EXCLUDED.status,
        updated_at = NOW();
"@
    $rowsAffected = $command.ExecuteNonQuery()
    Write-Host "✅ Updated public.users table. Rows affected: $rowsAffected" -ForegroundColor Green
    
    $supabase.Close()
    
    # Run the test
    Write-Host "\n🚀 Running test..." -ForegroundColor Yellow
    node test-with-auth.js
    
} catch {
    Write-Host "❌ Error:" -ForegroundColor Red
    $_.Exception.Message
    
    if ($_.ErrorDetails.Message) {
        Write-Host "Details:" -ForegroundColor Red
        $_.ErrorDetails.Message | ConvertFrom-Json | ConvertTo-Json -Depth 5 | Write-Host -ForegroundColor Red
    }
}
