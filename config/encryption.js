/* Master switch for the optional Network/Topology/GRC encryption
   feature (TODOSecurityStandpoint.txt #3, "données au repos"). Off by
   default -- flipping this to true doesn't itself secure anything, it
   only makes the "Chiffrement" card appear in Settings so the user can
   do the actual setup (pick a strength level, choose a passphrase). No
   passphrase is ever stored here -- see assets/script/vault.js. */
const encryptionConfig = {
  "enabled": false
};
