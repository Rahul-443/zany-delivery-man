import { Api, JsonRpc, RpcError } from 'eosjs';
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  getDatabase,
  ref,
  onValue,
  query,
  orderByChild,
  startAt
} from 'firebase/database';
import { createDfuseClient } from '@dfuse/client';
import { firebaseConfig, pvk, dfk } from './config';
import 'regenerator-runtime/runtime';

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const database = getDatabase(app);

const signatureProvider = new JsSignatureProvider([pvk]);
const rpc = new JsonRpc('https://wax.dfuse.eosnation.io', {
  fetch: customizedFetch
});
const api = new Api({ rpc, signatureProvider });

const secMain = document.querySelector('.section-main');
const btnSend = document.getElementById('send');
const btnRetry = document.getElementById('retry');
let succededTrxList = [];

const scoreToZanyM = 0.0001;
let userAddresses = [];
let usersData;
let usersKeys;

btnSend.disabled = true;

signInAnonymously(auth)
  .then(() => {
    console.log('Signed In');
    btnSend.disabled = false;
    onValue(
      query(ref(database), orderByChild(`high_score`), startAt(1)),
      snapshot => {
        if (snapshot !== null) {
          usersData = snapshot.val();
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

const client = createDfuseClient({
  apiKey: dfk,
  network: `wax.dfuse.eosnation.io`
});

const customizedFetch = async (input, init) => {
  if (init === undefined) {
    init = {};
  }
  if (init.headers === undefined) {
    init.headers = {};
  }
  const apiTokenInfo = await client.getTokenInfo();
  const headers = init.headers;
  headers['Authorization'] = apiTokenInfo;
  headers[`X-Eos-Push-Guarantee`] = `in-block`;
  return input, init;
};

function main(userAddresses) {
  let i = 0;
  const transactHandler = setInterval(() => {
    let userAddress = userAddresses[i];
    i++;
    let userName = userAddress.replace(/\_/g, '.');
    let score = Math.max(
      usersData[userAddress]['high_score'],
      usersData[userAddress]['score']
    );
    let amt = (score * scoreToZanyM).toFixed(4).toString();

    try {
      (async () => {
        const transferAction = {
          account: `metatoken.gm`,
          name: `transfer`,
          authorization: [
            {
              actor: `zanygumplays`,
              permission: `active`
            }
          ],
          data: {
            from: `zanygumplays`,
            to: userName,
            quantity: `${amt} ZANY`,
            memo: `Thanks for Coming by`
          }
        };

        const result = await api.transact(
          {
            actions: [transferAction]
          },
          {
            blocksBehind: 360,
            expireSeconds: 3600
          }
        );

        secMain.textContent += `\r\n${i}. Rewarded ${userName} with ${amt} ZANY`;
        succededTrxList.push(userAddress);
        console.log(result);
        if (
          i === userAddresses.length &&
          succededTrxList.length === userAddresses.length
        ) {
          secMain.textContent += `\r\nAll Transactions successfully completed`;
          clearInterval(transactHandler);
        } else if (i === userAddresses.length) {
          secMain.textContent += `\r\nSome Transactions couldn't be completed. Please Retry`;
          clearInterval(transactHandler);
        }

        console.log(result);
      })();
    } catch (error) {
      console.log(`Caught Exception ${error}`);
      secMain.textContent;
      if (error instanceof RpcError) {
        console.log(JSON.stringify(error, null, 2));
      }
    }
  }, 500);
}

addEventListener('unhandledrejection', promiseRejectionEvent => {
  secMain.textContent += `\r\nFailed a transaction`;
});

btnSend.addEventListener('click', () => {
  usersKeys = Object.keys(usersData);
  secMain.textContent += `\r\n${usersKeys.length} users to be rewarded`;
  usersKeys.forEach(userKey => {
    secMain.textContent += `\r\n${userKey}`;
  });
  console.log(usersData);
  userAddresses.push(...usersKeys);
  main(userAddresses);
});

btnRetry.addEventListener('click', () => {
  userAddresses = [];
  userAddresses = usersKeys.filter(userKey => {
    return !succededTrxList.find(succededTrx => {
      return succededTrx === userKey;
    });
  });
  usersKeys = [];
  succededTrxList = [];
  usersKeys.push(...userAddresses);
  console.log(userAddresses);
  console.log(usersKeys);
  console.log(succededTrxList);
  main(userAddresses);
});
