/* eslint-disable import/no-extraneous-dependencies */

import * as dotenv from 'dotenv';

import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-waffle';
import providerApiKeyToURL from './src/utils/providerApiKeyToURL';

dotenv.config();

const hardhatNetworkConfig = {
  allowUnlimitedContractSize: true,
  saveDeployments: false,
  chainId: 1,
  live: false,
  forking: {
    url: `${providerApiKeyToURL(1, process.env.ALCHEMY_API_KEY || '', process.env.INFURE_API_KEY || '')}`,
  },
};

const config = {
  solidity: {
    version: '0.8.9',
  },
  networks: {
    hardhat: {
      ...hardhatNetworkConfig,
    },
  },

  paths: {
    sources: './contracts',
    tests: './tests/mocha',
    cache: './cache',
    artifacts: './artifacts',
  },
  mocha: {
    timeout: 2400000,
  },
};

export default config;
