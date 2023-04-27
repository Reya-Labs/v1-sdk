import { SupportedChainId } from '../../../types';
import { NetworkConfiguration } from './types';

export const networkConfigurations: { [key in SupportedChainId]: NetworkConfiguration } = {
  [SupportedChainId.mainnet]: {
    factoryAddress: '0x6a7a5c3824508D03F0d2d24E0482Bea39E08CcAF',
    wethAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    apply: true,
    defaultMinLeverageAllowed: 10,
  },

  [SupportedChainId.goerli]: {
    factoryAddress: '0x9f30Ec6903F1728ca250f48f664e48c3f15038eD',
    wethAddress: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
    apply: false,
    defaultMinLeverageAllowed: 5,
  },

  [SupportedChainId.arbitrum]: {
    factoryAddress: '0xda66a7584da7210fd26726EFb12585734F7688c1',
    wethAddress: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    apply: true,
    defaultMinLeverageAllowed: 10,
  },

  [SupportedChainId.arbitrumGoerli]: {
    factoryAddress: '0xCC39fF9f5413DA2dFB8475a88E3E6C8B190CeAe6', // TBC
    wethAddress: '0xb83C277172198E8Ec6b841Ff9bEF2d7fa524f797',
    apply: false,
    defaultMinLeverageAllowed: 5,
  },
};
