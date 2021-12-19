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

const balText = document.getElementById(`balance`);
const recpHolder = document.querySelector(`.recipients-holder`);
const resHolder = document.querySelector(`.result-holder`);
const btnSend = document.getElementById('send');
const btnRetry = document.getElementById('retry');

let usersData;
let usersKeys;
let userAddresses;
let succededTrxList;
const scoreToZanyM = 0.1;
const acctName = `zanygumplays`;
const contractName = `metatoken.gm`;
const symbol = `ZANY`;
const colorGreen1 = `#fb6185`;

btnSend.disabled = true;

signInAnonymously(auth)
  .then(() => {
    console.log('Signed In');
    btnSend.disabled = false;
    onValue(
      query(
        ref(database, `leaderboard`),
        orderByChild(`highScore`),
        startAt(1)
      ),
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
      balText.textContent = `${await rpc.get_currency_balance(
        contractName,
        acctName,
        symbol
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

btnSend.addEventListener('click', () => {
  refreshArrays();
  if (usersData !== null) {
    usersKeys = Object.keys(usersData);
    recpHolder.innerHTML = ``;
    usersKeys.forEach(userKey => {
      recpHolder.innerHTML += `<p class="recipient" id="recp-${getWamInDot(
        userKey
      )}">${getWamInDot(userKey)}</p>`;
    });
    userAddresses.push(...usersKeys);
    main(userAddresses);
  } else {
    alert(`No player found to be rewarded!`);
  }
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

function main(userAddresses) {
  let i = 0;
  let j = 0;
  const transactHandler = setInterval(() => {
    let userAddress = userAddresses[i];
    if (userAddress !== undefined) {
      i++;
      let userName = getWamInDot(userAddress);
      let userZanyPts = usersData[userAddress][`pts`];
      let userScore = usersData[userAddress][`highScore`];
      let amt = (userScore * userZanyPts * scoreToZanyM).toFixed(4);

      try {
        (async () => {
          const transferAction = {
            account: contractName,
            name: `transfer`,
            authorization: [
              {
                actor: acctName,
                permission: `active`
              }
            ],
            data: {
              from: acctName,
              to: userName,
              quantity: `${amt} ${symbol}`,
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

          document.getElementById(
            `recp-${userName}`
          ).style.borderColor = colorGreen1;
          console.log(result);
        })().then(() => {
          j++;
          succededTrxList.push(userAddress);
          resHolder.textContent += `\r\n${j}. Rewarded ${userName} with ${amt} ZANY`;
          if (
            j === userAddresses.length &&
            succededTrxList.length === userAddresses.length
          ) {
            resHolder.textContent += `\r\nAll Transactions successfully completed`;
            clearInterval(transactHandler);
          } else if (j === userAddresses.length) {
            resHolder.textContent += `\r\nSome Transactions couldn't be completed. Please Retry`;
            clearInterval(transactHandler);
          }
        });
      } catch (error) {
        console.log(`Caught Exception ${error}`);
        resHolder.textContent;
        if (error instanceof RpcError) {
          console.log(JSON.stringify(error, null, 2));
        }
      }
    }
  }, 1000);
}

addEventListener('unhandledrejection', promiseRejectionEvent => {
  resHolder.textContent += `\r\nFailed a transaction`;
});

function refreshArrays() {
  usersKeys = [];
  userAddresses = [];
  succededTrxList = [];
}

function getWamInDot(userName) {
  return userName.replace(/\_/g, `.`);
}

const customizedFetch = async (input, init) => {
  if (init === undefined) {
    init = {};
  }
  if (init.headers === undefined) {
    init.headers = {};
  }
  const apiTokenInfo = await client.getTokenInfo();
  const headers = init.headers;

  headers['Authorization'] = `Bearer ${apiTokenInfo.token}`;
  headers[`X-Eos-Push-Guarantee`] = `in-block`;

  return input, init;
};
