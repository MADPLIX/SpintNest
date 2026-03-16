; Zusätzliche AppData-Pfade löschen, die die App tatsächlich nutzt.
; Die App verwendet ProjectDirs::from("com", "scrum-planner", "Scrum Planner")
; → %APPDATA%\com\scrum-planner\Scrum Planner
; Der Standard-NSIS-Installer löscht nur $APPDATA\com.sprintnest.app (BUNDLEID).
!macro NSIS_HOOK_POSTUNINSTALL
  ${If} $DeleteAppDataCheckboxState = 1
  ${AndIf} $UpdateMode <> 1
    SetShellVarContext current
    ; Alter Pfad (Scrum Planner / SprintNest Abwärtskompatibilität)
    RmDir /r "$APPDATA\com\scrum-planner\Scrum Planner"
    RmDir /r "$LOCALAPPDATA\com\scrum-planner\Scrum Planner"
  ${EndIf}
!macroend
