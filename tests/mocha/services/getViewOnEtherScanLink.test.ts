import { expect } from 'chai';
import { SupportedChainId } from '../../../src';
import { getViewOnEtherScanLink } from '../../../src/services/getViewOnEtherScanLink';

describe('getViewOnEtherScanLink', () => {
  it('returns a link to goerli.etherscan.io when ethereumNetworkIdentifier is "goerli"', () => {
    const result = getViewOnEtherScanLink(SupportedChainId.goerli, '0x12345');
    expect(result).to.be.eq('https://goerli.etherscan.io/tx/0x12345');
  });

  it('returns a link to etherscan.io when ethereumNetworkIdentifier is "homestead"', () => {
    const result = getViewOnEtherScanLink(SupportedChainId.mainnet, '0x12345');
    expect(result).to.be.eq('https://etherscan.io/tx/0x12345');
  });

  it('returns a link to arbiscan.etherscan.io when ethereumNetworkIdentifier is "arbitrum"', () => {
    const result = getViewOnEtherScanLink(SupportedChainId.arbitrum, '0x12345');
    expect(result).to.be.eq('https://arbiscan.io/tx/0x12345');
  });

  it('returns a link to goerli.arbiscan.io when ethereumNetworkIdentifier is "arbitrumGoerli"', () => {
    const result = getViewOnEtherScanLink(SupportedChainId.arbitrumGoerli, '0x12345');
    expect(result).to.be.eq('https://goerli.arbiscan.io/tx/0x12345');
  });

  it('returns undefined when ethereumNetworkIdentifier is not "goerli" or "homestead"', () => {
    const result = getViewOnEtherScanLink('testnet' as never, '0x12345');
    expect(result).to.be.eq('https://etherscan.io/');
  });

  it('returns undefined when transactionId is not provided', () => {
    const result = getViewOnEtherScanLink(SupportedChainId.goerli);
    expect(result).to.be.eq('https://etherscan.io/');
  });
});
