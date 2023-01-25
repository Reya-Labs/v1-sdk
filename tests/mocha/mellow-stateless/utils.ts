import { NetworkConfiguration } from '../../../src/entities/mellow-stateless/config/types';

export const MockGoerliConfig: NetworkConfiguration = {
  MELLOW_LENS: '0x41600c23a9803D644b55CD5b263ec9cB961FaC04',
  MELLOW_ROUTERS: [
    {
      router: '0x62E224d9ae2f4702CC88695e6Ea4aA16D0925BdB',
      isVault: true,
      title: 'MELLOW - ETH',
      description: 'A',
      show: true,
      soon: false,
      deprecated: true,
      vaults: [
        {
          address: '0x62E224d9ae2f4702CC88695e6Ea4aA16D0925BdB',
          weight: 100,
          pools: ['Compound - ETH'],
          estimatedHistoricApy: [31.03, 31.03],
          withdrawable: true,
        },
      ],
    },
    {
      router: '0x704F6E9cB4f7e041CC89B6a49DF8EE2027a55164',
      isVault: false,
      title: 'MELLOW - ETH',
      description: 'B',
      show: true,
      soon: false,
      deprecated: false,
      vaults: [
        {
          address: '0x205d180a7E712fc821320D061388cfa6e8422c9D',
          weight: 0,
          pools: ['Compound - ETH', 'Compound - ETH'],
          estimatedHistoricApy: [10, 10],
          withdrawable: true,
        },
        {
          address: '0x1C4808DE8F806a611b30ECbaFA20C52D1209ecB6',
          weight: 0,
          pools: ['Compound - ETH'],
          estimatedHistoricApy: [10, 10],
          withdrawable: true,
        },
        {
          address: '0x3269FD624efAE90dc813135eB002C121E01e9995',
          weight: 0,
          pools: ['Compound - ETH'],
          estimatedHistoricApy: [20, 20],
          withdrawable: true,
        },
        {
          address: '0xca5ecDeb7f6E3E6d40E685ac49E76aC8EeE7049B',
          weight: 0,
          pools: ['Compound - ETH'],
          estimatedHistoricApy: [30, 30],
          withdrawable: true,
        },
        {
          address: '0x4FE3444AC2Ee16cAF4661fba06186b09E4F0a706',
          weight: 50,
          pools: ['Compound - ETH'],
          estimatedHistoricApy: [30, 30],
          withdrawable: false,
        },
        {
          address: '0x5de7a5BbEDcE4a739b8a8D1cdA15D71924BDC9f7',
          weight: 50,
          pools: ['Compound - ETH'],
          estimatedHistoricApy: [30, 30],
          withdrawable: false,
        },
      ],
    },
    {
      router: '0x9f397CD24103A0a0252DeC82a88e656480C53fB7',
      isVault: false,
      title: 'MELLOW - USDC',
      description: 'C',
      show: true,
      soon: false,
      deprecated: false,
      vaults: [
        {
          address: '0x5e25887EA7507e1646C3637c5CCCE29D7D2c1E9C',
          weight: 0,
          pools: ['Compound - USDC', 'Compound - USDC'],
          withdrawable: true,
          estimatedHistoricApy: [10, 10],
        },
        {
          address: '0x5e25887EA7507e1646C3637c5CCCE29D7D2c1E9C',
          weight: 0,
          pools: ['Compound - USDC', 'Compound - USDC'],
          estimatedHistoricApy: [30, 30],
          withdrawable: true,
        },
        {
          address: '0xAb0f8CeE5fa7e3D577d1a546Aeb11fE5c768c75E',
          weight: 0,
          pools: ['Compound - USDC'],
          estimatedHistoricApy: [30, 30],
          withdrawable: true,
        },
        {
          address: '0x4972C5f24E6EDfD479ba989b204bD376503D48d8',
          weight: 100,
          pools: ['Compound - USDC'],
          estimatedHistoricApy: [30, 30],
          withdrawable: false,
        },
      ],
    },
    {
      router: '0xB1EBCC0367c775D9447DFb0B55082aA694113ae0',
      isVault: false,
      title: 'MELLOW - USDT',
      description: 'D',
      show: true,
      soon: false,
      deprecated: false,
      vaults: [
        {
          address: '0x6D2b3Cab0dD3367862C3Be90E702D976102482b3',
          weight: 0,
          pools: ['Compound - USDT'],
          estimatedHistoricApy: [15, 15],
          withdrawable: true,
        },
        {
          address: '0x27F41ce17725B79cfD195475F3e2B3231a27640e',
          weight: 100,
          pools: ['Compound - USDT'],
          estimatedHistoricApy: [15, 15],
          withdrawable: false,
        },
      ],
    },
  ],
};

export const RETRY_ATTEMPTS = 2;
