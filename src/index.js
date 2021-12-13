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
const btnSend = document.getElementById('send');
const btnRetry = document.getElementById('retry');
let failedTrxList = [];

const scoreToZanyM = 0.1;
let userAddresses;
let usersData;
let trials = 0;

btnSend.disabled = true;

signInAnonymously(auth)
  .then(() => {
    console.log('Signed In');
    btnSend.disabled = false;
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
    (async () => {
      secMain.textContent += `${await rpc.get_currency_balance(
        'metatoken.gm',
        'zanygumplays',
        'ZANY'
      )}`;
    })();
  })
  .catch(error => {
    console.log(error);
  });

function transactAllUsers() {
  if (usersData !== undefined) {
    if (failedTrxList.length === 0) {
      userAddresses = Object.keys(usersData);
    }
  }
  userAddresses.forEach(userAddress => {
    let userName = userAddress.replace(/\_/g, '.');
    let score = Math.max(
      usersData[userAddress]['high_score'],
      usersData[userAddress]['score']
    );
    if (score > 0) {
      let amt = (score * scoreToZanyM).toFixed(4).toString();
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
          secMain.textContent += `\r\nRewarded ${userName} with ${amt} ZANY`;
          showFailedTrxs();
          console.log(result);
        })();
      } catch (error) {
        if (!failedTrxList.includes(userAddress)) {
          failedTrxList.push(userAddress);
        }
        showFailedTrxs(userAddress);
        console.log(`Caught Exception ${error}`);
        if (error instanceof RpcError) {
          console.log(JSON.stringify(error, null, 2));
        }
      }
    }
  });
}

function showFailedTrxs(userAddress) {
  if (userAddresses.indexOf(userAddress) === userAddresses.length - 1) {
    secMain.textContent += `\r\nFailed transactions for:`;
    failedTrxList.forEach(user => {
      secMain.textContent += `\r\n${user}`;
    });
  }
}

btnSend.addEventListener('click', transactAllUsers);
btnRetry.addEventListener('click', () => {
  userAddresses.push(...failedTrxList);
  transactAllUsers();
});
