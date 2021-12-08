import { Api, JsonRpc, RpcError } from 'eosjs';
import { JsSignatureProvider } from 'eosjs/dist/JsSignatureProvider';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getDatabase, ref, onValue } from 'firebase/database';
import { firebaseConfig } from './config';
import { pvk } from './config';
import 'regenerator-runtime';

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const database = getDatabase(app);

const signatureProvider = new JsSignatureProvider([pvk]);
const rpc = new JsonRpc('https://api.wax.alohaeos.com');
const api = new Api({ rpc, signatureProvider });
const scoreToZanyM = 0.1;
let usersData;

signInAnonymously(auth)
  .then(() => {
    console.log('Signed In');
  })
  .catch(error => {
    console.log(error);
  });

onValue(
  ref(database),
  snapshot => {
    if (snapshot !== null) {
      usersData = snapshot;
    }
  },
  error => {
    console.log(error);
  }
);

function transactAllUsers() {
  if (usersData !== undefined) {
    let userAddresses = Object.keys(usersData);
    userAddresses.forEach(userAddress => {
      let amt = (usersData[userAddress]['score'] * scoreToZanyM)
        .toFixed(4)
        .toString();
      (async () => {
        const result = await api.transact(
          {
            actions: [
              {
                account: 'metatoken.gm',
                name: 'transfer',
                authorization: [
                  {
                    actor: 'zanygumplays',
                    permission: 'active'
                  }
                ],
                data: {
                  from: 'zanygumplays',
                  to: userAddress,
                  quantity: amt,
                  memo: 'Thanks for Playing'
                }
              }
            ]
          },
          {
            blocksBehind: 3,
            expireSeconds: 30
          }
        );
        console.log(result);
      })();
    });
  }
}
