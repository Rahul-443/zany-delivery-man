import { Api, JsonRpc, RpcError } from 'eosjs';
import { JsSignatureProvider } from 'eosjs/dist/JsSignatureProvider';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from './config';
import { getDatabase, ref, onValue } from 'firebase/database';

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const database = getDatabase(app);

const scoreToZanyM = 0.1;

signInAnonymously(auth)
  .then(() => {
    console.log('Signed In');
  })
  .catch(error => {
    console.log(error);
  });
