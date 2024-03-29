import { SupportedChainId } from '../../../types';
import { NetworkConfiguration } from './types';

const networkConfigurations: { [key in SupportedChainId]: NetworkConfiguration } = {
  [SupportedChainId.mainnet]: {
    MELLOW_LENS: '0xb34FF2F4BA8ECE3Ceb4570277D748c908Ac13E14',
    MELLOW_OPTIMISERS: [
      {
        optimiser: '0xC99c70492Bc15c056813d1ddA95C89Bb285Cdc86',
        isVault: true,
        title: 'MELLOW - ETH',
        description:
          'This vault is no longer accepting deposits. Funds will become available for withdrawal at pool maturity.',
        show: true,
        soon: false,
        deprecated: true,
        vaults: [
          {
            address: '0xC99c70492Bc15c056813d1ddA95C89Bb285Cdc86',
            weight: 100,
            pools: ['Lido - ETH'],
            estimatedHistoricApy: [-10, 20],
            withdrawable: true,
          },
        ],
      },

      {
        optimiser: '0xF875B4BD81b1be40775652d8fDC174512C36DB20',
        isVault: false,
        title: 'MELLOW - USDC',
        description: 'Optimised for LPing across pools in 50x levered positions.',
        show: true,
        soon: false,
        deprecated: false,
        vaults: [
          {
            address: '0x6D3F5363bB30BB5CAE7F30c74689Ee6a7154350E',
            weight: 0,
            pools: ['AAVE - USDC LEND'],
            estimatedHistoricApy: [-10, 20],
            withdrawable: true,
          },
          {
            address: '0xfd89E1274D96884381601D533e8d051bCf20fC71',
            weight: 0,
            pools: ['AAVE - USDC BORROW'],
            estimatedHistoricApy: [-10, 20],
            withdrawable: true,
          },
          {
            address: '0x87065A6e0e6609583976404fd33F670FaA310390',
            weight: 0,
            pools: ['AAVE - USDC LEND'],
            estimatedHistoricApy: [-10, 20],
            withdrawable: true,
          },
          {
            address: '0xedF3cb10dE6Ad6449B9F9Ee561f18e50b6B79234',
            weight: 0,
            pools: ['AAVE - USDC LEND'],
            estimatedHistoricApy: [-10, 20],
            withdrawable: true,
          },
          {
            address: '0x9Fe673EAefd59281679dad8eaf1a86212ab24654',
            weight: 0,
            pools: ['AAVE - USDC LEND'],
            estimatedHistoricApy: [-10, 20],
            withdrawable: true,
          },
          {
            address: '0xd5817100223aD11919b0EFfd866459E96AE37B96',
            weight: 0,
            pools: ['AAVE - USDC LEND', 'AAVE - USDC BORROW'],
            estimatedHistoricApy: [-10, 20],
            withdrawable: true,
          },
          {
            address: '0xbd3831a1e5ebd16e4867924ec047deafee42c8ca',
            weight: 0,
            pools: ['AAVE - USDC LEND', 'AAVE - USDC BORROW'],
            estimatedHistoricApy: [-10, 20],
            withdrawable: true,
          },
          {
            address: '0xda5d31dc70e5acd6e66b49f31ee796977566152b',
            weight: 0,
            pools: ['AAVE - USDC BORROW', 'AAVE V3 - USDC BORROW'],
            estimatedHistoricApy: [-10, 20],
            withdrawable: true,
          },
          {
            address: '0x47867f3e9277e0e08893e8309cb4180c8247c0a4',
            weight: 100,
            pools: ['AAVE - USDC BORROW', 'AAVE V3 - USDC BORROW'],
            estimatedHistoricApy: [-10, 20],
            withdrawable: true,
          },
        ],
      },

      {
        optimiser: '0x1963efb3B756e7D17D0e54645339e7E037705cc1',
        isVault: false,
        title: 'MELLOW - ETH',
        description: 'Optimised for Lping across pools in 50x levered positions.',
        show: true,
        soon: false,
        deprecated: false,
        vaults: [
          {
            address: '0x0c43098E8aF3D3d27555c3FD4cCf62638d269C68',
            weight: 0,
            pools: ['AAVE - ETH BORROW', 'AAVE - ETH LEND', 'LIDO - ETH', 'ROCKET - ETH'],
            estimatedHistoricApy: [-10, 20],
            withdrawable: true,
          },
          {
            address: '0x5e6f99876b709E0C8384dd2A7F9F12771E00d240',
            weight: 0,
            pools: ['LIDO - ETH', 'ROCKET - ETH'],
            estimatedHistoricApy: [-10, 20],
            withdrawable: true,
          },

          {
            address: '0x074764CDB38c2AD8e90Bc56FEfd06061d35e345D',
            weight: 0,
            pools: ['LIDO - ETH', 'ROCKET - ETH', 'AAVE - ETH BORROW'],
            estimatedHistoricApy: [-10, 20],
            withdrawable: true,
          },
          {
            address: '0x0b27c51924c5d27edc12f4740de9b46c3e54b159',
            weight: 0,
            pools: ['LIDO - ETH', 'ROCKET - ETH', 'AAVE - ETH BORROW'],
            estimatedHistoricApy: [-10, 20],
            withdrawable: true,
          },
        ],
      },

      {
        optimiser: '0xD6e133B9C82F04734B48d5808800078038231a22',
        isVault: false,
        title: 'MELLOW - DAI',
        description: 'Optimised for LPing across pools in 50x levered positions.',
        show: true,
        soon: false,
        deprecated: false,
        vaults: [
          {
            address: '0x02B9f3AfB742Ce533f6d3cc8900b588674C8B795',
            weight: 0,
            pools: ['AAVE - DAI LEND', 'COMPOUND - DAI LEND'],
            estimatedHistoricApy: [-10, 20],
            withdrawable: true,
          },
          {
            address: '0x3AF84EC55b9A696C650C2a7Cab7D2555dbf45892',
            weight: 0,
            pools: ['AAVE - DAI LEND', 'COMPOUND - DAI LEND'],
            estimatedHistoricApy: [-10, 20],
            withdrawable: true,
          },
        ],
      },

      {
        optimiser: '0x9c1100A321ab778cE5d3B42c7b99f44afc3A4c41',
        isVault: false,
        title: 'MELLOW - USDT',
        description: 'Optimised for LPing across pools in 50x levered positions.',
        show: true,
        soon: false,
        deprecated: false,
        vaults: [
          {
            address: '0x6F0e45AA2B7D936F88166F92Be82AB162788Ed9b',
            weight: 0,
            pools: ['COMPOUND - USDT BORROW'],
            estimatedHistoricApy: [-10, 20],
            withdrawable: true,
          },
          {
            address: '0x336ce0084D1aCF7c32578924b13F7abCed47Ac3e',
            weight: 0,
            pools: ['AAVE - USDT BORROW'],
            estimatedHistoricApy: [-10, 20],
            withdrawable: true,
          },
          {
            address: '0x3223D78Ee640cf3C5fC56605151d13C37bfB3Fd5',
            weight: 0,
            pools: ['COMPOUND - USDT BORROW', 'AAVE - USDT BORROW'],
            estimatedHistoricApy: [-10, 20],
            withdrawable: true,
          },
          {
            address: '0x0893a7c5bdb12c57a134c2346e163e86c673bf68',
            weight: 0,
            pools: ['COMPOUND - USDT BORROW', 'AAVE - USDT BORROW'],
            estimatedHistoricApy: [-10, 20],
            withdrawable: true,
          },
        ],
      },
    ],
  },
  [SupportedChainId.goerli]: {
    MELLOW_LENS: '0x3BC31926adc64587c1E48c2f3749B66B3fE366E9',
    MELLOW_OPTIMISERS: [
      {
        optimiser: '0x62E224d9ae2f4702CC88695e6Ea4aA16D0925BdB',
        isVault: true,
        title: 'MELLOW - ETH',
        description:
          'The Mellow LP Optimiser runs a permissionless strategy that takes deposits and generates optimised LP fees by providing liquidity on Voltz Protocol.',
        show: true,
        soon: false,
        deprecated: true,
        vaults: [
          {
            address: '0x62E224d9ae2f4702CC88695e6Ea4aA16D0925BdB',
            weight: 100,
            pools: ['Compound - ETH'],
            estimatedHistoricApy: [-10, 20],
            withdrawable: true,
          },
        ],
      },
      {
        optimiser: '0x704F6E9cB4f7e041CC89B6a49DF8EE2027a55164',
        isVault: false,
        title: 'MELLOW - ETH',
        description:
          'The Mellow LP Optimiser runs a permissionless strategy that takes deposits and generates optimised LP fees by providing liquidity on Voltz Protocol.',
        show: true,
        soon: false,
        deprecated: false,
        vaults: [
          {
            address: '0x205d180a7E712fc821320D061388cfa6e8422c9D',
            weight: 0,
            pools: ['Compound - ETH', 'Compound - ETH'],
            estimatedHistoricApy: [-10, 20],
            withdrawable: true,
          },
          {
            address: '0x1C4808DE8F806a611b30ECbaFA20C52D1209ecB6',
            weight: 0,
            pools: ['Compound - ETH'],
            estimatedHistoricApy: [-10, 20],
            withdrawable: true,
          },
          {
            address: '0x3269FD624efAE90dc813135eB002C121E01e9995',
            weight: 0,
            pools: ['Compound - ETH'],
            estimatedHistoricApy: [-10, 20],
            withdrawable: true,
          },
          {
            address: '0xca5ecDeb7f6E3E6d40E685ac49E76aC8EeE7049B',
            weight: 0,
            pools: ['Compound - ETH'],
            estimatedHistoricApy: [-10, 20],
            withdrawable: true,
          },
          {
            address: '0x4FE3444AC2Ee16cAF4661fba06186b09E4F0a706',
            weight: 50,
            pools: ['Compound - ETH'],
            estimatedHistoricApy: [-10, 20],
            withdrawable: false,
          },
          {
            address: '0x5de7a5BbEDcE4a739b8a8D1cdA15D71924BDC9f7',
            weight: 50,
            pools: ['Compound - ETH'],
            estimatedHistoricApy: [-10, 20],
            withdrawable: false,
          },
        ],
      },
      {
        optimiser: '0x9f397CD24103A0a0252DeC82a88e656480C53fB7',
        isVault: false,
        title: 'MELLOW - USDC',
        description:
          'The Mellow LP Optimiser runs a permissionless strategy that takes deposits and generates optimised LP fees by providing liquidity on Voltz Protocol.',
        show: true,
        soon: false,
        deprecated: false,
        vaults: [
          {
            address: '0x5e25887EA7507e1646C3637c5CCCE29D7D2c1E9C',
            weight: 0,
            pools: ['Compound - USDC', 'Compound - USDC'],
            withdrawable: true,
            estimatedHistoricApy: [-10, 20],
          },
          {
            address: '0x5e25887EA7507e1646C3637c5CCCE29D7D2c1E9C',
            weight: 0,
            pools: ['Compound - USDC', 'Compound - USDC'],
            estimatedHistoricApy: [-10, 20],
            withdrawable: true,
          },
          {
            address: '0xAb0f8CeE5fa7e3D577d1a546Aeb11fE5c768c75E',
            weight: 0,
            pools: ['Compound - USDC'],
            estimatedHistoricApy: [-10, 20],
            withdrawable: true,
          },
          {
            address: '0x4972C5f24E6EDfD479ba989b204bD376503D48d8',
            weight: 100,
            pools: ['Compound - USDC'],
            estimatedHistoricApy: [-10, 20],
            withdrawable: false,
          },
        ],
      },
      {
        optimiser: '0xB1EBCC0367c775D9447DFb0B55082aA694113ae0',
        isVault: false,
        title: 'MELLOW - USDT',
        description:
          'The Mellow LP Optimiser runs a permissionless strategy that takes deposits and generates optimised LP fees by providing liquidity on Voltz Protocol.',
        show: true,
        soon: false,
        deprecated: false,
        vaults: [
          {
            address: '0x6D2b3Cab0dD3367862C3Be90E702D976102482b3',
            weight: 0,
            pools: ['Compound - USDT'],
            estimatedHistoricApy: [-10, 20],
            withdrawable: true,
          },
          {
            address: '0x27F41ce17725B79cfD195475F3e2B3231a27640e',
            weight: 100,
            pools: ['Compound - USDT'],
            estimatedHistoricApy: [-10, 20],
            withdrawable: false,
          },
        ],
      },
    ],
  },
  [SupportedChainId.arbitrum]: {
    MELLOW_LENS: '0x0000000000000000000000000000000000000000',
    MELLOW_OPTIMISERS: [],
  },
  [SupportedChainId.arbitrumGoerli]: {
    MELLOW_LENS: '0x0000000000000000000000000000000000000000',
    MELLOW_OPTIMISERS: [],
  },
  [SupportedChainId.avalanche]: {
    MELLOW_LENS: '0x0000000000000000000000000000000000000000',
    MELLOW_OPTIMISERS: [],
  },
  [SupportedChainId.avalancheFuji]: {
    MELLOW_LENS: '0x0000000000000000000000000000000000000000',
    MELLOW_OPTIMISERS: [],
  },
  [SupportedChainId.spruce]: {
    MELLOW_LENS: '0x0000000000000000000000000000000000000000',
    MELLOW_OPTIMISERS: [],
  },
};

export const getMellowConfig = (chainId: SupportedChainId): NetworkConfiguration => {
  return networkConfigurations[chainId];
};
