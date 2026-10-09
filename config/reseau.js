/* Seed nodes for the Dashboard "Réseau" panel -- what a new install
   shows until you add your own from Settings > Registres (they persist
   in this browser's localStorage from then on). Stable ids so other
   registries can reference them. */
const reseauConfig = {
  "background": "../assets/images/kali_xl_sharp.png",
  "cards": [
    {
      "log": false,
      "id": "seed-neonflare",
      "url": "https://neonflare.ca/",
      "img": "../assets/images/dragon4_logo.png",
      "title": "NeonFlare.ca",
      "sub": "Site web",
      "category": "GothamTech"
    },
    {
      "log": false,
      "id": "seed-github",
      "url": "https://github.com/gothamblood",
      "img": "../assets/images/icon-github.svg",
      "title": "GothamBlood",
      "sub": "GitHub",
      "category": "GothamTech"
    },
    {
      "log": false,
      "id": "seed-gothamtech",
      "url": "https://gothamtech.ca/",
      "img": "../assets/images/dragon-logo.svg",
      "title": "GothamTech.ca",
      "sub": "Site web",
      "category": "GothamTech"
    }
  ]
};
