import { Api, JsonRpc, RpcError } from 'eosjs';
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getDatabase, ref, onValue } from 'firebase/database';
import { firebaseConfig, pvk } from './config';
import 'regenerator-runtime/runtime';

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const database = getDatabase(app);

const signatureProvider = new JsSignatureProvider([pvk]);
const rpc = new JsonRpc('https://wax.greymass.com', { fetch });
const api = new Api({ rpc, signatureProvider });

const secMain = document.querySelector('.section-main');
const btnSend = document.querySelector('.send');
let failedTrxList = [];

const scoreToZanyM = 0.1;
let userAddresses;
let usersData;

signInAnonymously(auth)
  .then(() => {
    console.log('Signed In');
    onValue(
      ref(database),
      snapshot => {
        if (snapshot !== null) {
          usersData = snapshot.val();
          console.log(usersData);
        }
      },
      error => {
        console.log(error);
      }
    );
  })
  .catch(error => {
    console.log(error);
  });

function transactAllUsers() {
  if (usersData !== undefined) {
    if (failedTrxList.length === 0) {
      userAddresses = Object.keys(usersData);
    }
    console.log('userAddresses', userAddresses);

    userAddresses.forEach(userAddress => {
      let userName = userAddress.replace(/\_/g, '.');
      console.log('username', userName);
      let amt = (usersData[userAddress]['score'] * scoreToZanyM)
        .toFixed(4)
        .toString();
      console.log('amt', amt);
      secMain.textContent = `Rewarding ${userName} with ${amt} Zany`;
      try {
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
                    to: userName,
                    quantity: `${amt} ZANY`,
                    memo: 'Thanks for Coming by'
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
      } catch (error) {
        failedTrxList.push(userAddress);
        console.log(`Caught Exception ${error}`);
        if (error instanceof RpcError) {
          console.log(JSON.stringify(error, null, 2));
        }
      }
    });
    if (failedTrxList.length !== 0) {
      userAddresses = failedTrxList;
      transactAllUsers();
    }
  }
}

function transact() {
  (async () => {
    const result = await api.transact(
      {
        actions: [
          {
            account: 'eosio.token',
            name: 'transfer',
            authorization: [
              {
                actor: 'zanygumplays',
                permission: 'active'
              }
            ],
            data: {
              from: 'zanygumplays',
              to: 'rweue.wam',
              quantity: `0.00000000 WAX`,
              memo: 'Thanks for Coming by'
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
}

btnSend.addEventListener('click', transact);
