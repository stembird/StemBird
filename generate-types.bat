@echo off
echo Generating Supabase types...
echo.
echo This will connect to your production database.
echo You may be prompted for your database password.
echo.
npx supabase gen types typescript --project-id qxuvqrfqkdpfjfwkqatf > src/integrations/supabase/types.ts
echo.
if %ERRORLEVEL% EQU 0 (
    echo Success! Types generated in src/integrations/supabase/types.ts
    echo.
    echo Now run:
    echo   git add src/integrations/supabase/types.ts
    echo   git commit -m "chore: regenerate Supabase types"
    echo   git push
) else (
    echo Failed to generate types. Error code: %ERRORLEVEL%
    echo.
    echo Try running manually:
    echo   npx supabase gen types typescript --project-id qxuvqrfqkdpfjfwkqatf
)
pause
