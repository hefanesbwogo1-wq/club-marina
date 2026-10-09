const {initializeApp,cert}=require('firebase-admin/app');const {getAuth}=require('firebase-admin/auth');
initializeApp({credential:cert(require('../serviceAccountKey.json'))});
getAuth().deleteUser(process.argv[2]).then(()=>console.log('Deleted')).catch(e=>getAuth().getUserByEmail(process.argv[2]).then(u=>getAuth().deleteUser(u.uid).then(()=>console.log('Deleted '+u.email))).catch(console.log))