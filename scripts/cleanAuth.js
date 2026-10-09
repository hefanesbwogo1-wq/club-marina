// CLUB MARINA - CLEAN ALL AUTH USERS - Node 24 + firebase-admin v13
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const serviceAccount = require('../serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const auth = getAuth();

const KEEP_EMAILS = [
  'admin@clubmarina.co.ke',
  'admin@clubmarina.com',
];

async function cleanAuth() {
  console.log('Fetching all auth users...');
  let users = [];
  let nextPageToken;
  
  do {
    const list = await auth.listUsers(1000, nextPageToken);
    users = users.concat(list.users);
    nextPageToken = list.pageToken;
  } while (nextPageToken);

  console.log(`Found ${users.length} auth users`);
  
  const toDelete = users.filter(u => {
    const email = (u.email || '').toLowerCase();
    if (!email) return true;
    return !KEEP_EMAILS.map(e=>e.toLowerCase()).includes(email);
  });

  console.log(`Keeping: ${users.length - toDelete.length} - Deleting: ${toDelete.length}`);
  console.log('Keeping:', users.filter(u=> !toDelete.includes(u)).map(u=>u.email));
  console.log('Deleting:', toDelete.map(u=>u.email));

  if (toDelete.length === 0) {
    console.log('Nothing to delete - already clean!');
    process.exit(0);
  }

  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question(`\nTYPE "DELETE ${toDelete.length} USERS" to confirm: `, async (ans) => {
    if (ans !== `DELETE ${toDelete.length} USERS`) {
      console.log('Aborted');
      readline.close();
      process.exit(0);
    }
    readline.close();

    for (let i = 0; i < toDelete.length; i += 100) {
      const batch = toDelete.slice(i, i+100);
      const uids = batch.map(u=>u.uid);
      const result = await auth.deleteUsers(uids);
      console.log(`Deleted batch ${Math.floor(i/100)+1}: ${result.successCount} success, ${result.failureCount} failed`);
    }
    console.log('\n✅ AUTH CLEAN DONE - Only super admin remains');
    process.exit(0);
  });
}

cleanAuth().catch(e=>{
  console.error(e);
  process.exit(1);
});