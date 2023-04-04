/* eslint-disable import/no-extraneous-dependencies */

import * as dotenv from 'dotenv';

import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-waffle';
import alchemyApiKeyToURL from './src/utils/alchemyApiKeyToURL';

dotenv.config();

const hardhatNetworkConfig = {
  allowUnlimitedContractSize: true,
  saveDeployments: false,
  chainId: 1,
  live: false,
  forking: {
    url: `${alchemyApiKeyToURL(1, process.env.ALCHEMY_API_KEY || '')}`,
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
