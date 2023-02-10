import { describe } from 'mocha';
import { expect } from 'chai';

import Sinon from 'sinon';
import { Signer } from 'ethers';
import { detectNetworkWithChainId, detectNetworkWithSigner } from '../../src';
import { SupportedChainId } from '../../src/types';

describe('Network Switching tests', async () => {
  describe('Detect Network', async () => {
    const getMockedSigner = (chainId: number) => {
      return {
        getChainId: Sinon.stub().returns(chainId),
      };
    };

    it('Detect network using chain Id', () => {
      {
        const networkDetected = detectNetworkWithChainId(1);
        expect(networkDetected.isSupported).to.be.eq(true);
        expect(networkDetected.network).to.be.eq(SupportedChainId.mainnet);
      }

      {
        const networkDetected = detectNetworkWithChainId(2);
        expect(networkDetected.isSupported).to.be.eq(false);
        expect(networkDetected.network).to.be.eq(null);
      }

      {
        const networkDetected = detectNetworkWithChainId(5);
        expect(networkDetected.isSupported).to.be.eq(true);
        expect(networkDetected.network).to.be.eq(SupportedChainId.goerli);
      }

      {
        const networkDetected = detectNetworkWithChainId(42161);
        expect(networkDetected.isSupported).to.be.eq(true);
        expect(networkDetected.network).to.be.eq(SupportedChainId.arbitrum);
      }

      {
        const networkDetected = detectNetworkWithChainId(421613);
        expect(networkDetected.isSupported).to.be.eq(true);
        expect(networkDetected.network).to.be.eq(SupportedChainId.arbitrumGoerli);
      }
    });

    it('Detect network using signer', async () => {
      {
        const networkDetected = await detectNetworkWithSigner(
          getMockedSigner(1) as unknown as Signer,
        );
        expect(networkDetected.isSupported).to.be.eq(true);
        expect(networkDetected.network).to.be.eq(SupportedChainId.mainnet);
      }

      {
        const networkDetected = await detectNetworkWithSigner(
          getMockedSigner(2) as unknown as Signer,
        );
        expect(networkDetected.isSupported).to.be.eq(false);
        expect(networkDetected.network).to.be.eq(null);
      }

      {
        const networkDetected = await detectNetworkWithSigner(
          getMockedSigner(5) as unknown as Signer,
        );
        expect(networkDetected.isSupported).to.be.eq(true);
        expect(networkDetected.network).to.be.eq(SupportedChainId.goerli);
      }

      {
        const networkDetected = await detectNetworkWithSigner(
          getMockedSigner(42161) as unknown as Signer,
        );
        expect(networkDetected.isSupported).to.be.eq(true);
        expect(networkDetected.network).to.be.eq(SupportedChainId.arbitrum);
      }

      {
        const networkDetected = await detectNetworkWithSigner(
          getMockedSigner(421613) as unknown as Signer,
        );
        expect(networkDetected.isSupported).to.be.eq(true);
        expect(networkDetected.network).to.be.eq(SupportedChainId.arbitrumGoerli);
      }
    });
  });

  // describe('Init and Rearm SDK', async () => {
  //   const alchemyApiKeys = {
  //     [SupportedChainId.mainnet]: 'abc',
  //     [SupportedChainId.goerli]: 'bcd',
  //     [SupportedChainId.arbitrum]: 'cde',
  //     [SupportedChainId.arbitrumGoerli]: 'def',
  //   };

  //   let network: SupportedChainId;

  //   it('Init', async () => {
  //     network = SupportedChainId.mainnet;
  //     initV1({
  //       network,
  //       alchemyApiKey: alchemyApiKeys[network],
  //     });

  //     expect(getNetwork()).to.be.eq(network);

  //     expect(alchemyApiKeyToURL(alchemyApiKeys[network])).to.be.eq(
  //       `https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKeys[network]}`,
  //     );

  //     expect(getSubgraphURL(SubgraphURLEnum.voltzProtocol)).to.be.eq(
  //       'https://api.thegraph.com/subgraphs/name/voltzprotocol/mainnet-v1',
  //     );

  //     // make sure it doesn't throw errors
  //     getSentryTracker();
  //   });

  //   it('Rearm', async () => {
  //     network = SupportedChainId.goerli;
  //     rearm({
  //       network,
  //       alchemyApiKey: alchemyApiKeys[network],
  //     });

  //     expect(getNetwork()).to.be.eq(network);

  //     expect(alchemyApiKeyToURL(alchemyApiKeys[network])).to.be.eq(
  //       `https://eth-goerli.g.alchemy.com/v2/${alchemyApiKeys[network]}`,
  //     );

  //     expect(getSubgraphURL(SubgraphURLEnum.voltzProtocol)).to.be.eq(
  //       'https://api.thegraph.com/subgraphs/name/voltzprotocol/voltz-goerli',
  //     );

  //     // make sure it doesn't throw errors
  //     getSentryTracker();
  //   });
  // });
});
