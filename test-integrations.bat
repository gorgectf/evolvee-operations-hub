@echo off
REM Live connectivity tests for each external integration, using backend\.env.
REM Each service is SKIPped unless its *_MODE is set to live. See
REM _docs\integration-tests\README.md.
node "%~dp0_docs\integration-tests\run-all.cjs"
exit /b %errorlevel%
