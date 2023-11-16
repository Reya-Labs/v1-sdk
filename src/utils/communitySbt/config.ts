import { SupportedChainId } from '../../types';

export const communityContractAddress: { [key in SupportedChainId]: string } = {
  [SupportedChainId.mainnet]: '0x914643668d83C1eeeF33Fd8286BF514a9Dea498e',
  [SupportedChainId.arbitrum]: '0x721a352dF62B7CBCE746650C1a3E2A4E990866aC',
  [SupportedChainId.goerli]: '0x089b1768444D86b58462De28cdd5F497Ea1b43F8',
  [SupportedChainId.arbitrumGoerli]: '',
  [SupportedChainId.avalanche]: '',
  [SupportedChainId.avalancheFuji]: '',
  [SupportedChainId.spruce]: '',
};

export const leavesCids: { [key in SupportedChainId]: Array<string> } = {
  [SupportedChainId.mainnet]: [
    'QmYGApREh6m163xQU9izU7MZDBK59oNTCCKUWKfmBz57GJ',
    'QmeavFtMpZt3kYRMrd6Cu65KDZ4NnwpyoSLznFY8n47Qqg',
    'QmVrEC5vC2tNVGKtTNkX3utkHmanuAAaAf1XPhEjAWmfgc',
    'QmRQ9akJmrnH7M5YG72gNj2GbpgPs1CVkBdcZEX2mAQC2m',
    'QmdnHFrHrKHjLTAzbj3exK9vcmb7PXuTohAEwmFvgowM1i',
  ],
  [SupportedChainId.arbitrum]: [
    '',
    '',
    '',
    'QmT9TFwvJzQPN4GoVQkX6z5H4PVhdFfZ8ZnNEyhMEV36pF',
    'QmTcfpoDBZb5nUsLsed2mTgzhijxzAFUZ3CzkRifvGyWtr',
  ],
  [SupportedChainId.goerli]: [],
  [SupportedChainId.arbitrumGoerli]: [],
  [SupportedChainId.avalanche]: [],
  [SupportedChainId.avalancheFuji]: [],
  [SupportedChainId.spruce]: [],
};

export const badgesCids: { [key in SupportedChainId]: Array<string> } = {
  [SupportedChainId.mainnet]: [
    'QmXaFnWn7KnN3GdgZJ5xn5wKGYusVbFGUNnNTpf8ndBT7P',
    'QmeavFtMpZt3kYRMrd6Cu65KDZ4NnwpyoSLznFY8n47Qqg',
    'QmVrEC5vC2tNVGKtTNkX3utkHmanuAAaAf1XPhEjAWmfgc',
    'QmRQ9akJmrnH7M5YG72gNj2GbpgPs1CVkBdcZEX2mAQC2m',
    'QmdnHFrHrKHjLTAzbj3exK9vcmb7PXuTohAEwmFvgowM1i',
  ],
  [SupportedChainId.arbitrum]: [
    '',
    '',
    '',
    'QmT9TFwvJzQPN4GoVQkX6z5H4PVhdFfZ8ZnNEyhMEV36pF',
    'QmTcfpoDBZb5nUsLsed2mTgzhijxzAFUZ3CzkRifvGyWtr',
  ],
  [SupportedChainId.goerli]: [],
  [SupportedChainId.arbitrumGoerli]: [],
  [SupportedChainId.avalanche]: [],
  [SupportedChainId.avalancheFuji]: [],
  [SupportedChainId.spruce]: [],
};
