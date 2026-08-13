; O sidecar da API (api.exe) e a app principal (app.exe) podem continuar em
; execução quando o instalador corre — seja manualmente (duplo-clique no
; instalador descarregado) ou através do updater automático. Se estiverem
; vivos, os respetivos .exe ficam bloqueados e a cópia de ficheiros falha
; com "Can't write: ...\api.exe" a meio da instalação, deixando o backend
; por atualizar mesmo que o resto da app pareça ter atualizado.
!macro NSIS_HOOK_PREINSTALL
  nsExec::ExecToLog 'taskkill /F /IM api.exe /T'
  Pop $0
  nsExec::ExecToLog 'taskkill /F /IM app.exe /T'
  Pop $0
  Sleep 300
!macroend
