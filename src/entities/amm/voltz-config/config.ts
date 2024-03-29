import { SupportedChainId } from '../../../types';
import { NetworkConfiguration } from './types';

export const networkConfigurations: { [key in SupportedChainId]: NetworkConfiguration } = {
  [SupportedChainId.mainnet]: {
    factoryAddress: '0x6a7a5c3824508D03F0d2d24E0482Bea39E08CcAF',
    peripheryAddress: '0x07ceD903E6ad0278CC32bC83a3fC97112F763722',
    wethAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    apply: true,
    defaultMinLeverageAllowed: 10,
    pools: [
      // aUSDC pools
      {
        name: 'aUSDC_v1',
        id: '0xae16bb8fe13001b61ddb44e2ceae472d6af08755', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },

      {
        name: 'aUSDC_v2',
        id: '0x538e4ffee8aed76efe35565c322a7b0d8cdb4cff', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },

      {
        name: 'aUSDC_v3',
        id: '0x953e581dd817b0faa69eacafb2c5709483f39aba', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },

      {
        name: 'aUSDC_v4',
        id: '0x6db5e4e8732dd6cb1b6e5fbe39fd102d8e76c512', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
        rollover: '0x2913a888C95d1300d66978905331c7F50EbC78b2',
      },

      {
        name: 'aUSDC_v5',
        id: '0x368811e781c4300561d1cc204f7333a778d87ad5', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },

      {
        name: 'aUSDC_v6',
        id: '0x2913a888C95d1300d66978905331c7F50EbC78b2', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },

      {
        name: 'aUSDC_v7',
        id: '0x8773315B21961828d5bdaB9a29881b9aB25147f8', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
        isAaveV3: true,
      },

      {
        name: 'aUSDC_v8',
        id: '0x66Ad47d8C8A0beDd32f5692fFB2df85041CD4Bd2', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
        isAaveV3: true,
      },

      {
        name: 'aUSDC_v9',
        id: '0x47C46765d633B6BC03d31cC224585c6856beeCB2', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },

      {
        name: 'aUSDC_v10',
        id: '0x943309c6D1fD572414A640C68F6F71Ef2113171c', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
        isAaveV3: true,
      },

      {
        name: 'aUSDC_v11',
        id: '0x57c2a977b01b8e91ee6ce10d8425c5a43c101e7d', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
        isAaveV3: true,
      },

      {
        name: 'aUSDC_v12',
        id: '0xf222043c6ebd7cd5d2a055333897dbb215cbbeb7', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },

      {
        name: 'aUSDC_v13',
        id: '0x14441c6dae81d4897921ef0134d119076a0741a7', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
        isAaveV3: true,
      },

      {
        name: 'aUSDC_v15',
        id: '0x9206A3c4448637469411DB4FD129223d1B575686', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
        isAaveV3: true,
      },

      // borrow aUSDC pools
      {
        name: 'borrow_aUSDC_v1',
        id: '0x0f91a255b5ba8e59f3b97b1ede91dec88bcc17eb', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },

      {
        name: 'borrow_aUSDC_v2',
        id: '0xb1842fe197320359271d061b42795d7ce4b77513', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },

      {
        name: 'borrow_aUSDC_v3',
        id: '0xb62d44e1bd91e868b682c09b1792a9026f35b1e4', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
        isAaveV3: true,
      },

      {
        name: 'borrow_aUSDC_v4',
        id: '0x799a0b21114e2E388FaA7D2bd59F817fdb7D350a', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },

      {
        name: 'borrow_aUSDC_v5',
        id: '0xF5513Ba2f5C1174C25A408D4072fe92952Ee5393', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
        isAaveV3: true,
      },

      {
        name: 'borrow_aUSDC_v6',
        id: '0xd6fc50c52b198f5017a4bd383c92a3da753883a3', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
        isAaveV3: true,
      },

      {
        name: 'borrow_aUSDC_30Jun23',
        id: '0xe8ddb4676eec36acffdffa6707f422e23a8dfc12', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },

      {
        name: 'borrow_av3USDC_30Jun23',
        id: '0x3ca96c10ac0b7651c9ea78b110db9e2e355893df', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
        isAaveV3: true,
      },

      {
        name: 'borrow_aUSDC_31Jul23',
        id: '0x037c8d42972c3c058224a2e51b5cb9b504f75b77', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: false,
      },

      {
        name: 'borrow_av3USDC_31Jul23',
        id: '0xd9a3f015a4ffd645014ec0f43148685be8754737', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: false,
        isAaveV3: true,
      },

      // aDAI pools
      {
        name: 'aDAI_v1',
        id: '0xa1a75f6689949ff413aa115d300f5e30f35ba061', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },
      {
        name: 'aDAI_v2',
        id: '0xc75e6d901817b476a9f3b6b79831d2b61673f9f5', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },
      {
        name: 'aDAI_v3',
        id: '0xad6bbd2eb576a82fc4ff0399a4ef2f123be7cfd2', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },
      {
        name: 'aDAI_v4',
        id: '0x7df7aa512f1eb4dd5c1b69486f45fe895ba41ece', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },

      // cDAI pools
      {
        name: 'cDAI_v1',
        id: '0xe4668bc57b1a73aaa832fb083b121d5b4602f475', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },
      {
        name: 'cDAI_v2',
        id: '0xd09723a7f4c26f4723aa63bf4a4a4a5dad970a49', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },
      {
        name: 'cDAI_v3',
        id: '0x1f0cb00ac15694c810a3326abf27921ef42d6d6d', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },
      {
        name: 'cDAI_v4',
        id: '0xef05af8b766b33e8c0fe768278dee326946a4858', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },

      // stETH pools
      {
        name: 'stETH_v1',
        id: '0x3806b99d0a0483e0d07501b31884c10e8e8b1215', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },
      {
        name: 'stETH_v2',
        id: '0x05cae5fe1faab605f795b018be6ba979c2c89cdb', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },
      {
        name: 'stETH_v3',
        id: '0xb7edbed9c7ec58fb781a972091d94846a25097e9', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },
      {
        name: 'stETH_v4',
        id: '0x2a07920e78ea904cFBef04d48Deb35E480E6f28E', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },

      // rETH pools
      {
        name: 'rETH_v1',
        id: '0x5842254e74510e000d25b5e601bcbc43b52946b4', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },
      {
        name: 'rETH_v2',
        id: '0xe07324a394acfff8fe24a09c3f2e2bd62e929efb', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },
      {
        name: 'rETH_v3',
        id: '0x0d05e6cf8cd82b0447eff4f2ca732d02308aa848', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },
      {
        name: 'rETH_v4',
        id: '0xb332c271e90B9fbca53C061aA3590194e8700B1E', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },

      // aETH pools
      {
        name: 'aETH_v1',
        id: '0x5d82b85430d3737d8068248363b4d47395145387', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },

      // borrow aETH pools
      {
        name: 'borrow_aETH_v1',
        id: '0x682f3e5685ff51c232cf842840ba27e717c1ae2e', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },
      {
        name: 'borrow_aETH_v2',
        id: '0x27ed5d356937213f97c9f9cb7593d876e5d30f42', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },
      {
        name: 'borrow_aETH_v3',
        id: '0xf6421486af95c3ea6c4555554d55ef0c3a2048ba', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },
      {
        name: 'borrow_aETH_v4',
        id: '0x53064915a5FE121e3d80B9bd0024fE58cd1a8720', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },

      // borrow cUSDT pools
      {
        name: 'borrow_cUSDT_v1',
        id: '0xcd47347a8c4f40e6877425080d22f4c3115b60a5', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },
      {
        name: 'borrow_cUSDT_v2',
        id: '0x67665a9ed20849b48a89c267a69fe70c4de8af56', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },
      {
        name: 'borrow_cUSDT_v3',
        id: '0x4e4DDa5eD4f3a47a2DB86a284cC3d26155DA5933', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },

      // borrow aUSDT pools
      {
        name: 'borrow_aUSDT_v1',
        id: '0x9a37bcc8ff3055d7223b169bc9c9fe2157a1b60e', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },
      {
        name: 'borrow_aUSDT_v2',
        id: '0xacf59c72660d1e6629a721fd958f7a8c64379835', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },
      {
        name: 'borrow_aUSDT_v3',
        id: '0xb64C6e4AEDe709c0b862fCac6662e2a7bd20855B', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },
    ],
  },

  [SupportedChainId.goerli]: {
    factoryAddress: '0x9f30Ec6903F1728ca250f48f664e48c3f15038eD',
    peripheryAddress: '0x12872b785dBC464F56086aFAB2b3ff7c27a5d007',
    wethAddress: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
    apply: false,
    defaultMinLeverageAllowed: 5,
    pools: [],
  },

  [SupportedChainId.arbitrum]: {
    factoryAddress: '0xda66a7584da7210fd26726EFb12585734F7688c1',
    peripheryAddress: '0x5971eedc4ae37c7fe86af716737e5c19efd07a80',
    wethAddress: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    apply: true,
    defaultMinLeverageAllowed: 10,
    pools: [
      // aUSDC pools
      {
        name: 'aUSDC_v1',
        id: '0x1d7E4d7c1629c9D6E3Bb6a344496b1B782c9ca9a', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
        isAaveV3: true,
      },
      {
        name: 'aUSDC_v2',
        id: '0x0c6dbf063fd1effe971ecf4091a40064936eae35', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
        isAaveV3: true,
      },

      // borrow aUSDC pools
      {
        name: 'borrow_aUSDC_v1',
        id: '0x8ce24926b49f9e1b97dc21109ed8ab67cf0293c2', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
        isAaveV3: true,
      },

      {
        name: 'borrow_aUSDC_v2',
        id: '0xb97191595b38b192e776402a6ed2a23c7cf25582', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
        isAaveV3: true,
      },

      {
        name: 'borrow_aUSDC_v3',
        id: '0xaeb387b339ea6e9e0e57c3718e0bd00637f20a1d', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
        isAaveV3: true,
      },

      {
        name: 'borrow_aUSDC_v4',
        id: '0x168f5ba6d36737ecd894c13f26405cbaac66a72d', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
        isAaveV3: true,
      },

      {
        name: 'borrow_av3USDC_30Jun23',
        id: '0xa3c0c89ac146b89edd17efd4e9c43cc4fc35ec1e', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
        isAaveV3: true,
      },

      {
        name: 'borrow_av3USDC_31Aug23',
        id: '0x3ecf01157e9b1a66197325771b63789d1fb18f1f', // vamm address
        show: {
          general: false,
          trader: false,
        },
        traderWithdrawable: false,
        isAaveV3: true,
      },

      // GLP pools
      {
        name: 'glpETH_v1',
        id: '0xB69c2b77C844b55F9924242df4299a1598753320', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },
      {
        name: 'glpETH_v2',
        id: '0x1aac6232b7c7cd6c8479077844eb0302cca0d2af', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },
      {
        name: 'glpETH_v3',
        id: '0x034f2b4137ed637c6b6ca9636d5f9fee0998e5f1', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: true,
      },
      {
        name: 'glpETH_28Jun23',
        id: '0x22393f23f16925d282aeca0a8464dccaf10ee480', // vamm address
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: false,
      },
    ],
  },

  [SupportedChainId.arbitrumGoerli]: {
    factoryAddress: '0xCC39fF9f5413DA2dFB8475a88E3E6C8B190CeAe6', // TBC
    peripheryAddress: '0xb1fb9e3610b0ca31a698ea81c2de3242eb45b12c',
    wethAddress: '0xb83C277172198E8Ec6b841Ff9bEF2d7fa524f797',
    apply: false,
    defaultMinLeverageAllowed: 5,
    pools: [],
  },
  [SupportedChainId.spruce]: {
    factoryAddress: '0xFa9DDF4569206625370D2A8546f42c1CC924063c',
    peripheryAddress: '', //  todo spruce: update once deployment is done
    wethAddress: '', // todo spruce: confirm address
    apply: false,
    defaultMinLeverageAllowed: 5,
    pools: [],
  },

  [SupportedChainId.avalanche]: {
    factoryAddress: '0xda66a7584da7210fd26726EFb12585734F7688c1',
    peripheryAddress: '0x4870b57E2e4bAA82ac8CC87350A2959e4b51694f',
    wethAddress: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // wavax
    apply: true,
    defaultMinLeverageAllowed: 10,
    pools: [
      // SOFR pools
      {
        name: 'sofrUSDC_30Sep23',
        id: '0xb69c2b77c844b55f9924242df4299a1598753320',
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: false,
      },
      {
        name: 'sofrUSDC_31Dec23',
        id: '0x1d7e4d7c1629c9d6e3bb6a344496b1b782c9ca9a',
        show: {
          general: true,
          trader: true,
        },
        traderWithdrawable: false,
      },
    ],
    sofrRatePriceFeed: '0xdEF67A0c85A8613D13C69F233FFc76C55dEa5603',
  },

  [SupportedChainId.avalancheFuji]: {
    factoryAddress: '0xda66a7584da7210fd26726EFb12585734F7688c1',
    peripheryAddress: '0x00D25e91774a509e5FA91CaE69793545B88686e1',
    wethAddress: '0xd00ae08403b9bbb9124bb305c09058e32c39a48c', // wavax
    apply: false,
    defaultMinLeverageAllowed: 5,
    pools: [],
    sofrRatePriceFeed: '0x89F48f6671Ec1B1C4f6abE964EBdd21F4eb7076f',
  },
};
