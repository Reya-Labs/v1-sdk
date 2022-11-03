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

//   const fixedLowMinter = 8;
//   const fixedHighMinter = 12;
//   const fixedLowSwapper1 = 3;
//   const fixedHighSwapper1 = 6;
//   const fixedLowSwapper2 = 2;
//   const fixedHighSwapper2 = 7;

//   {
//     const req = (await ammWallet.getInfoPostMint({
//       fixedLow: fixedLowMinter,
//       fixedHigh: fixedHighMinter,
//       notional: 200000,
//     })) as number;

//     await ammWallet.mint({
//       fixedLow: fixedLowMinter,
//       fixedHigh: fixedHighMinter,
//       margin: req + 10,
//       notional: 200000,
//     });

//     console.log('mint performed');
//   }

//   {
//     const { marginRequirement: req } = (await ammOther.getInfoPostSwap({
//       isFT: false,
//       notional: 50000,
//       fixedLow: fixedLowSwapper1,
//       fixedHigh: fixedHighSwapper1,
//     })) as InfoPostSwap;

//     await ammOther.swap({
//       isFT: false,
//       notional: 50000,
//       fixedLow: fixedLowSwapper1,
//       fixedHigh: fixedHighSwapper1,
//       margin: req + 10,
//     });

//     console.log('swap performed');
//   }

//   {
//     const { marginRequirement: req } = (await ammOther.getInfoPostSwap({
//       isFT: true,
//       notional: 25000,
//       fixedLow: fixedLowSwapper2,
//       fixedHigh: fixedHighSwapper2,
//     })) as InfoPostSwap;

//     await ammOther.swap({
//       isFT: true,
//       notional: 25000,
//       fixedLow: fixedLowSwapper2,
//       fixedHigh: fixedHighSwapper2,
//       margin: req + 10,
//     });

//     console.log('swap performed');
//   }

//   await ammOther.fcmSwap({
//     notional: 25000,
//   });

//   console.log('fcm swap performed');
// };

// setup();
