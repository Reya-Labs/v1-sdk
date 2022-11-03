// /* eslint-disable no-console */
// /* eslint-disable no-await-in-loop */
// import { providers, Wallet } from 'ethers';

// import JSBI from 'jsbi';
// import { Token, RateOracle, AMM, InfoPostSwap } from '../src';

// const setup = async () => {
//   const vammAddress = '0xe451980132e65465d0a498c53f0b5227326dd73f';
//   const marginEngineAddress = '0x75537828f2ce51be7289709686a69cbfdbb714f1';
//   const provider = new providers.JsonRpcProvider('http://0.0.0.0:8545/');
//   const privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
//   const wallet = new Wallet(privateKey, provider);
//   const other = new Wallet(
//     '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
//     provider,
//   );

//   const ammWallet = new AMM({
//     id: vammAddress,
//     signer: wallet,
//     provider,
//     environment: 'LOCALHOST_SDK',
//     fcmAddress: '0x5392a33f7f677f59e833febf4016cddd88ff9e67',
//     marginEngineAddress,
//     rateOracle: new RateOracle({
//       id: '0x0165878a594ca255338adfa4d48449f69242eb8f',
//       protocolId: 1,
//     }),
//     underlyingToken: new Token({
//       id: '0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9',
//       name: 'USDC',
//       decimals: 18,
//     }),
//     termEndTimestamp: JSBI.BigInt('1649458800000000000000000000'),
//     termStartTimestamp: JSBI.BigInt('1646856441000000000000000000'),
//     tick: 0,
//     tickSpacing: 1000,
//     txCount: 0,
//     updatedTimestamp: JSBI.BigInt('1646856471'),
//   });

//   const ammOther = new AMM({
//     id: vammAddress,
//     signer: other,
//     provider,
//     environment: 'LOCALHOST_SDK',
//     fcmAddress: '0x5392a33f7f677f59e833febf4016cddd88ff9e67',
//     marginEngineAddress,
//     rateOracle: new RateOracle({
//       id: '0x0165878a594ca255338adfa4d48449f69242eb8f',
//       protocolId: 1,
//     }),
//     underlyingToken: new Token({
//       id: '0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9',
//       name: 'USDC',
//       decimals: 18,
//     }),
//     termEndTimestamp: JSBI.BigInt('1649458800000000000000000000'),
//     termStartTimestamp: JSBI.BigInt('1646856441000000000000000000'),
//     tick: 0,
//     tickSpacing: 1000,
//     txCount: 0,
//     updatedTimestamp: JSBI.BigInt('1646856471'),
//   });

//   const mints = [
//     [4, 6],
//     [3, 7],
//     [4, 10],
//     [9, 13],
//     [0.1, 100],
//   ];
//   const notionalDeposited = [0, 0, 0, 0, 0];

//   let fcmNotionalTraded = 0;

//   const txs = 100;
//   const ops = ['mint', 'burn', 'swap', 'fcmSwap', 'fcmUnwind'];
//   for (let i = 0; i < txs; i += 1) {
//     const op = i < 10 ? 0 : Math.floor(Math.random() * ops.length);

//     switch (op) {
//       case 0: {
//         const mintIndex = Math.floor(Math.random() * mints.length);
//         const notional = 100000 + Math.random() * 100000;

//         const req = (await ammWallet.getInfoPostMint({
//           fixedLow: mints[mintIndex][0],
//           fixedHigh: mints[mintIndex][1],
//           notional,
//         })) as number;

//         await ammWallet.mint({
//           fixedLow: mints[mintIndex][0],
//           fixedHigh: mints[mintIndex][1],
//           margin: req + 10,
//           notional,
//         });
//         notionalDeposited[mintIndex] += notional;

//         console.log('mint performed');
//         break;
//       }

//       case 1: {
//         const mintIndex = Math.floor(Math.random() * mints.length);
//         const notional = Math.random() * notionalDeposited[mintIndex];

//         await ammWallet.burn({
//           fixedLow: mints[mintIndex][0],
//           fixedHigh: mints[mintIndex][1],
//           notional,
//         });
//         notionalDeposited[mintIndex] -= notional;

//         console.log('burn performed');
//         break;
//       }

//       case 2: {
//         const notional = 1 + Math.random() * 10000;
//         const isFT = Math.random() < 0.5;

//         const { marginRequirement: req } = (await ammOther.getInfoPostSwap({
//           isFT,
//           notional,
//           fixedLow: 1,
//           fixedHigh: 2,
//         })) as InfoPostSwap;

//         await ammOther.swap({
//           isFT,
//           notional,
//           fixedLow: 1,
//           fixedHigh: 2,
//           margin: req + 10,
//         });

//         console.log('swap performed');
//         break;
//       }

//       case 3: {
//         const notional = 1 + Math.random() * 10000;

//         await ammOther.fcmSwap({
//           notional,
//         });

//         fcmNotionalTraded += notional;

//         console.log('fcm swap performed');
//         break;
//       }

//       case 4: {
//         const notional = Math.random() * fcmNotionalTraded;

//         await ammOther.fcmUnwind({
//           notionalToUnwind: notional,
//         });

//         fcmNotionalTraded -= notional;

//         console.log('fcm unwind performed');
//         break;
//       }

//       default: {
//         break;
//       }
//     }
//   }
// };

// setup();
