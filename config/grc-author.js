/* Default "who" for the GRC change-log (assets/script/grc-checklist.js),
   used only until Settings > Checklist GRC > "Ton nom" is filled in --
   from then on localStorage is the only source of truth, same pattern
   as config/reseau.js and the other seed-data config files. Handy for a
   solo deployment: set your own name here once and every fresh browser
   profile already attributes your edits correctly, without having to
   fill in Settings first. Free text, not a verified identity -- same
   caveat as the Settings field itself. */
const grcAuthorConfig = {
  "defaultName": ""
};
