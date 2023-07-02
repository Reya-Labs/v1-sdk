import { getPortfolioPositions } from '../../../src';
import { expect } from 'chai';

describe('get portfolio positions ', () => {
  it.skip(`get portfolio positions with glp`, async () => {
    jest.setTimeout(100000);
    const portfolioPositions = await getPortfolioPositions(
      [42161],
      '0x36374ee7a7ec2a9ca99df05e310fd707f4c0a675',
    );

    const firstPosition = portfolioPositions[0];

    expect(firstPosition.variant).to.be.equal('settled');
    expect(firstPosition.maxWithdrawableMargin).to.be.equal(0);
    expect(firstPosition.margin).to.be.equal(0);
    expect(firstPosition.unrealizedPNL).to.be.equal(0);
    expect(firstPosition.realizedPNLFees).to.be.equal(0);
    expect(firstPosition.realizedPNLCashflow).to.be.equal(0);
    expect(firstPosition.realizedPNLTotal).to.be.equal(0);
    expect(firstPosition.settlementCashflow).to.be.equal(0);

    const fourthPositionWithPositiveBalance = portfolioPositions[3];

    expect(fourthPositionWithPositiveBalance.variant).to.be.equal('matured');
    expect(fourthPositionWithPositiveBalance.maxWithdrawableMargin).to.be.equal(0.000005188244205);
    expect(fourthPositionWithPositiveBalance.margin).to.be.equal(0.000005188244205);
    expect(fourthPositionWithPositiveBalance.unrealizedPNL).to.be.equal(0);
    expect(fourthPositionWithPositiveBalance.realizedPNLFees).to.be.equal(0);
    expect(fourthPositionWithPositiveBalance.realizedPNLCashflow).to.be.equal(0);
    expect(fourthPositionWithPositiveBalance.realizedPNLTotal).to.be.equal(0);
    expect(fourthPositionWithPositiveBalance.settlementCashflow).to.be.equal(0);
  });
});
