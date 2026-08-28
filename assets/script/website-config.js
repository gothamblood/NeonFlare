/* Website category registry -- backs the Dashboard's Website panel
   (project/dashboard.html) and its Settings > Config Website card.
   Same lazy-migration pattern as assets/script/dashboards.js: nothing
   is written to localStorage until the user actually adds/edits/
   removes a category or a link, so a fresh install still shows exactly
   the original 14 categories below. */

const WEBSITE_CATEGORIES_KEY = "/settings.html/websiteCategories";

const DEFAULT_WEBSITE_CATEGORIES = [
  { id: "learning-platforms", title: "Learning Platforms", sub: "TryHackMe, HTB, Root-Me…", links: [
    { name: "TryHackMe", url: "https://tryhackme.com" },
    { name: "Hack The Box", url: "https://hackthebox.com" },
    { name: "Root‑Me", url: "https://root-me.org" },
    { name: "OverTheWire", url: "https://overthewire.org/wargames/" },
  ] },
  { id: "web-security", title: "Web Security", sub: "PortSwigger, OWASP, MDN", links: [
    { name: "PortSwigger Academy", url: "https://portswigger.net/web-security" },
    { name: "OWASP Top 10", url: "https://owasp.org/www-project-top-ten/" },
    { name: "MDN Security Docs", url: "https://developer.mozilla.org/en-US/docs/Web/Security" },
  ] },
  { id: "ctf-challenges", title: "CTF & Challenges", sub: "CTFtime, picoCTF, HackThisSite", links: [
    { name: "CTFtime", url: "https://ctftime.org" },
    { name: "picoCTF", url: "https://picoctf.org" },
    { name: "HackThisSite", url: "https://hackthissite.org" },
  ] },
  { id: "exploit-databases", title: "Exploit Databases", sub: "Exploit-DB, NVD, MITRE CVE", links: [
    { name: "Exploit‑DB", url: "https://exploit-db.com" },
    { name: "NVD Database", url: "https://nvd.nist.gov/vuln/search" },
    { name: "MITRE CVE", url: "https://cve.mitre.org" },
  ] },
  { id: "documentation", title: "Documentation", sub: "Kali, Nmap, Wireshark docs", links: [
    { name: "Kali Docs", url: "https://kali.org/docs" },
    { name: "Nmap Guide", url: "https://nmap.org/book/" },
    { name: "Wireshark Docs", url: "https://wireshark.org/docs" },
  ] },
  { id: "communities", title: "Communities", sub: "r/netsec, StackExchange", links: [
    { name: "r/netsec", url: "https://reddit.com/r/netsec" },
    { name: "r/AskNetsec", url: "https://reddit.com/r/AskNetsec" },
    { name: "Security StackExchange", url: "https://security.stackexchange.com" },
  ] },
  { id: "breach-exposure", title: "Breach / Credential Exposure", sub: "HaveIBeenPwned", links: [
    { name: "HaveIBeenPwned", url: "https://haveibeenpwned.com" },
  ] },
  { id: "deep-osint", title: "Deep OSINT / Cyber Intelligence", sub: "IntelX, Shodan, Censys", links: [
    { name: "IntelX", url: "https://intelx.io" },
    { name: "DarkSearch", url: "https://darksearch.io" },
    { name: "Ahmia", url: "https://ahmia.fi" },
    { name: "GreyNoise", url: "https://www.greynoise.io" },
    { name: "AbuseIPDB", url: "https://abuseipdb.com" },
    { name: "Shodan", url: "https://www.shodan.io" },
    { name: "Censys", url: "https://censys.io" },
  ] },
  { id: "web-recon", title: "Web Recon / Domain Intelligence", sub: "crt.sh, SecurityTrails, DNSDumpster", links: [
    { name: "crt.sh", url: "https://crt.sh" },
    { name: "SecurityTrails", url: "https://securitytrails.com" },
    { name: "DNSDumpster", url: "https://dnsdumpster.com" },
    { name: "Netcraft", url: "https://www.netcraft.com" },
    { name: "BuiltWith", url: "https://builtwith.com" },
    { name: "LeakIX", url: "https://leakix.net" },
    { name: "PublicWWW", url: "https://publicwww.com" },
    { name: "Wayback Machine", url: "https://web.archive.org" },
  ] },
  { id: "people-osint", title: "People / Identity OSINT", sub: "Pipl, Epieos, WhatsMyName", links: [
    { name: "Pipl", url: "https://pipl.com" },
    { name: "Epieos", url: "https://epieos.com" },
    { name: "SocialSearcher", url: "https://www.social-searcher.com" },
    { name: "NameCheckr", url: "https://www.namecheckr.com" },
    { name: "WhatsMyName", url: "https://whatsmyname.app" },
  ] },
  { id: "ip-network-intel", title: "IP / Network Intelligence", sub: "IPinfo, BGPView, ViewDNS", links: [
    { name: "IPinfo", url: "https://ipinfo.io" },
    { name: "WhoisXML", url: "https://whoisxmlapi.com" },
    { name: "BGPView", url: "https://bgpview.io" },
    { name: "ViewDNS", url: "https://viewdns.info" },
    { name: "Talos Intelligence", url: "https://talosintelligence.com" },
  ] },
  { id: "dorks", title: "Dorks / Code / Indexation", sub: "Google/GitHub dorks, PublicWWW", links: [
    { name: "Google Dorks DB", url: "https://www.exploit-db.com/google-hacking-database" },
    { name: "GitHub Dorks", url: "https://github.com/techgaun/github-dorks" },
    { name: "PublicWWW", url: "https://publicwww.com" },
  ] },
  { id: "threat-intel", title: "Threat Intelligence / Malware Analysis", sub: "VirusTotal, AnyRun, MalwareBazaar", links: [
    { name: "VirusTotal", url: "https://virustotal.com" },
    { name: "HybridAnalysis", url: "https://hybrid-analysis.com" },
    { name: "AnyRun", url: "https://any.run" },
    { name: "ThreatFox", url: "https://threatfox.abuse.ch" },
    { name: "MalwareBazaar", url: "https://bazaar.abuse.ch" },
    { name: "URLhaus", url: "https://urlhaus.abuse.ch" },
  ] },
  { id: "living-off-the-land", title: "Living off the Land", sub: "GTFOBins, LOLBAS", links: [
    { name: "GTFOBins", url: "https://gtfobins.github.io" },
    { name: "LOLBAS", url: "https://lolbas-project.github.io" },
  ] },
];

function getRawWebsiteCategories() {
  try {
    const raw = localStorage.getItem(WEBSITE_CATEGORIES_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function getWebsiteCategories() {
  const raw = getRawWebsiteCategories();
  if (raw) return raw;
  // Seed links have no id of their own (see DEFAULT_WEBSITE_CATEGORIES
  // above) -- assign one lazily, same reasoning as dashboards.js/
  // network-config.js's "seed-" ids, so a link can be targeted for
  // edit/remove before anything's ever been customized.
  return DEFAULT_WEBSITE_CATEGORIES.map((cat) => Object.assign({}, cat, {
    links: (cat.links || []).map((link, i) => Object.assign({ id: cat.id + "-l" + i }, link)),
  }));
}

function saveWebsiteCategories(list) {
  localStorage.setItem(WEBSITE_CATEGORIES_KEY, JSON.stringify(list));
}

function addWebsiteCategory(category) {
  const id = "website-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const list = getWebsiteCategories();
  list.push(Object.assign({ id, links: [] }, category));
  saveWebsiteCategories(list);
  return id;
}

function updateWebsiteCategory(id, changes) {
  const list = getWebsiteCategories();
  const idx = list.findIndex((c) => c.id === id);
  if (idx === -1) return;
  list[idx] = Object.assign({}, list[idx], changes);
  saveWebsiteCategories(list);
}

function removeWebsiteCategory(id) {
  saveWebsiteCategories(getWebsiteCategories().filter((c) => c.id !== id));
}

function getWebsiteCategory(id) {
  return getWebsiteCategories().find((c) => c.id === id);
}

function addWebsiteLink(catId, link) {
  const list = getWebsiteCategories();
  const cat = list.find((c) => c.id === catId);
  if (!cat) return;
  const id = "link-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  cat.links = cat.links || [];
  cat.links.push(Object.assign({ id }, link));
  saveWebsiteCategories(list);
}

function updateWebsiteLink(catId, linkId, changes) {
  const list = getWebsiteCategories();
  const cat = list.find((c) => c.id === catId);
  if (!cat) return;
  const idx = (cat.links || []).findIndex((l) => l.id === linkId);
  if (idx === -1) return;
  cat.links[idx] = Object.assign({}, cat.links[idx], changes);
  saveWebsiteCategories(list);
}

function removeWebsiteLink(catId, linkId) {
  const list = getWebsiteCategories();
  const cat = list.find((c) => c.id === catId);
  if (!cat) return;
  cat.links = (cat.links || []).filter((l) => l.id !== linkId);
  saveWebsiteCategories(list);
}

// Round-trippable backup/restore of the live registry (assets/script/
// config-io.js has the shared download/read helpers).
function exportWebsiteConfigAsJson() {
  exportJsonFile(getWebsiteCategories(), "website-categories.json");
}

function importWebsiteConfigFromJson(file) {
  return readJsonFile(file).then((categories) => {
    if (!Array.isArray(categories)) throw new Error("Format invalide : un tableau de catégories est attendu.");
    saveWebsiteCategories(categories);
  });
}

function resetWebsiteConfig() {
  localStorage.removeItem(WEBSITE_CATEGORIES_KEY);
}
