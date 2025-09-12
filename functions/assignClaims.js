/**
 * assignClaims.js — run with Firebase Admin SDK (Node.js)
 * Usage (CMD):  node assignClaims.js user@example.com admin
 * Usage (PS):   node assignClaims.js user@example.com admin "{\"expenses\":true,\"uploads\":true,\"charts\":true}"
 */
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json'); // do NOT commit this file

if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

function parsePerms(input) {
  if (!input) return { expenses: true, uploads: true, charts: true };
  try { return JSON.parse(input); }
  catch {
    console.error('Could not parse permissions JSON. Example for PowerShell:');
    console.error('  "{\"expenses\":true,\"uploads\":true,\"charts\":true}"');
    process.exit(1);
  }
}

async function main() {
  const [,, email, role, permsJson] = process.argv;
  if (!email || !role) {
    console.error('Usage: node assignClaims.js <email> <role:admin|user> <permissionsJson?>');
    process.exit(1);
  }
  if (!['admin', 'user'].includes(role)) {
    console.error("Role must be 'admin' or 'user'");
    process.exit(1);
  }
  const permissions = parsePerms(permsJson);
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, { role, permissions });
  console.log('Claims set for', email, { role, permissions });
}

main().catch(err => { console.error(err); process.exit(1); });
