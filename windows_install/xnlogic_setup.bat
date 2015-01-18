@echo off



echo Checking dependencies ...

:: Verifying admin rights ...
net session >nul 2>&1
if not %errorLevel% == 0 (
    echo This scripts requires admin rights. 
    echo Please run this script again as administrator.
	exit /B 1
)


:: NOTE: GitHub for windows doesn't set the PATH variable (it makes `git` available only in the Git shell)
:: Let's add things to the path, if GitHub for windows was installed.
FOR /D %%f in (%LOCALAPPDATA%\GitHub\PortableGit_*) DO SET PATH=%PATH%;%%f\bin
:: TODO: Need to check other possible Git setups

:: Verifying git installation ...
git --version >nul 2>&1 
if %errorLevel% == 9009 (
	echo Please make sure that git is installed, and is available as a command.
	echo For example, make sure you can run 'git --version' in this shell.
	EXIT /B 1
)


:: Verifying Chocolatey installation ...
choco >nul 2>&1 
if not %errorLevel% == 0 (
    echo Installing Chocolatey package manager ...
    @powershell -NoProfile -ExecutionPolicy unrestricted -Command "iex ((new-object net.webclient).DownloadString('https://chocolatey.org/install.ps1'))" && SET PATH "%PATH%;%ALLUSERSPROFILE%\\chocolatey\\bin"
)

:: Verifying Ruby installation ...
ruby --version >nul 2>&1 
if not %errorLevel% == 0 (
	@echo on
	choco install ruby
	@echo off
)


:: Verifying Vagrant installation ...
vagrant --version >nul 2>&1 
if not %errorLevel% == 0 (
	@echo on
	choco install vagrant
	@echo off
)

:: Verifying VirtualBox installation ...
IF NOT EXIST "%ProgramFiles%\Oracle\VirtualBox" (
	@echo on
	choco install virtualbox
	@echo off
)


:: Verifying xnlogic installation ...
call xnlogic >nul 2>&1 
if not %errorLevel% == 0 (
	@echo on
	:: We run the command in a new CMD windows, because we need to ensure that `gem` is on the PATH
	start cmd /i /K gem install xnlogic
	@echo off

	echo xnlogic command-line utility is being installed in a separate window.
	echo When the installation complets, run 'xnlogic help' for more info.
) else (
	echo You are ready to go.
	echo Run 'xnlogic help' for more info. 
)


