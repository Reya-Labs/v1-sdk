import { expect } from 'chai';
import { getExpectedApy } from '../../../src/services';
import { fail } from '../../utils';

const DELTA = 0.000001;

describe('getExpectedApy', () => {
  [1, 2, 3, 4, 5, 6, 7].forEach((rateOracleID) => {
    it(`fixed taker in the middle of a pool in profit - compounding rate oracle ${rateOracleID}`, () => {
      const currentInSeconds = 15 * 24 * 60 * 60;
      const endInSeconds = 30 * 24 * 60 * 60;

      // 1000 notional @ 5%
      const unbalancedFixedTokens = 5000;
      const variableTokens = -1000;

      // 10x leverage
      const margin = 100;

      const predictedApr = 0.04;

      const [pnl, ecs] = getExpectedApy(
        currentInSeconds,
        endInSeconds,
        unbalancedFixedTokens,
        variableTokens,
        margin,
        predictedApr,
        rateOracleID,
      );

      expect(pnl).to.be.closeTo(0.10747661686374087, DELTA);
      expect(ecs).to.be.closeTo(0.4416847268372912, DELTA);
    });
  });

  [8].forEach((rateOracleID) => {
    it(`fixed taker in the middle of a pool in profit - linear rate oracle ${rateOracleID}`, () => {
      const currentInSeconds = 15 * 24 * 60 * 60;
      const endInSeconds = 30 * 24 * 60 * 60;

      // 1000 notional @ 5%
      const unbalancedFixedTokens = 5000;
      const variableTokens = -1000;

      // 10x leverage
      const margin = 100;

      const predictedApr = 0.04;

      const [pnl, ecs] = getExpectedApy(
        currentInSeconds,
        endInSeconds,
        unbalancedFixedTokens,
        variableTokens,
        margin,
        predictedApr,
        rateOracleID,
      );

      expect(pnl).to.be.closeTo(0.1, DELTA);
      expect(ecs).to.be.closeTo(0.410958904109589, DELTA);
    });
  });

  [1, 2, 3, 4, 5, 6, 7].forEach((rateOracleID) => {
    it(`fixed taker in the middle of a pool in profit - compounding rate oracle ${rateOracleID}`, () => {
      const currentInSeconds = 15 * 24 * 60 * 60;
      const endInSeconds = 30 * 24 * 60 * 60;

      // 1000 notional @ 5%
      const unbalancedFixedTokens = 5000;
      const variableTokens = -1000;

      // 10x leverage
      const margin = 100;

      const predictedApr = 0.07;

      const [pnl, ecs] = getExpectedApy(
        currentInSeconds,
        endInSeconds,
        unbalancedFixedTokens,
        variableTokens,
        margin,
        predictedApr,
        rateOracleID,
      );

      expect(pnl).to.be.closeTo(-0.1775279789321389, DELTA);
      expect(ecs).to.be.closeTo(-0.7295670367074205, DELTA);
    });
  });

  [8].forEach((rateOracleID) => {
    it(`fixed taker in the middle of a pool in loss - linear rate oracle ${rateOracleID}`, () => {
      const currentInSeconds = 15 * 24 * 60 * 60;
      const endInSeconds = 30 * 24 * 60 * 60;

      // 1000 notional @ 5%
      const unbalancedFixedTokens = 5000;
      const variableTokens = -1000;

      // 10x leverage
      const margin = 100;

      const predictedApr = 0.07;

      const [pnl, ecs] = getExpectedApy(
        currentInSeconds,
        endInSeconds,
        unbalancedFixedTokens,
        variableTokens,
        margin,
        predictedApr,
        rateOracleID,
      );

      expect(pnl).to.be.closeTo(-0.2, DELTA);
      expect(ecs).to.be.closeTo(-0.821917808219178, DELTA);
    });
  });

  [1, 2, 3, 4, 5, 6, 7].forEach((rateOracleID) => {
    it(`variable taker in the middle of a pool in loss - compounding rate oracle ${rateOracleID}`, () => {
      const currentInSeconds = 15 * 24 * 60 * 60;
      const endInSeconds = 30 * 24 * 60 * 60;

      // 1000 notional @ 5%
      const unbalancedFixedTokens = -5000;
      const variableTokens = 1000;

      // 10x leverage
      const margin = 100;

      const predictedApr = 0.04;

      const [pnl, ecs] = getExpectedApy(
        currentInSeconds,
        endInSeconds,
        unbalancedFixedTokens,
        variableTokens,
        margin,
        predictedApr,
        rateOracleID,
      );

      expect(pnl).to.be.closeTo(-0.10747661686374087, DELTA);
      expect(ecs).to.be.closeTo(-0.4416847268372912, DELTA);
    });
  });

  [8].forEach((rateOracleID) => {
    it(`variable taker in the middle of a pool in loss - linear rate oracle ${rateOracleID}`, () => {
      const currentInSeconds = 15 * 24 * 60 * 60;
      const endInSeconds = 30 * 24 * 60 * 60;

      // 1000 notional @ 5%
      const unbalancedFixedTokens = -5000;
      const variableTokens = 1000;

      // 10x leverage
      const margin = 100;

      const predictedApr = 0.04;

      const [pnl, ecs] = getExpectedApy(
        currentInSeconds,
        endInSeconds,
        unbalancedFixedTokens,
        variableTokens,
        margin,
        predictedApr,
        rateOracleID,
      );

      expect(pnl).to.be.closeTo(-0.1, DELTA);
      expect(ecs).to.be.closeTo(-0.410958904109589, DELTA);
    });
  });

  [1, 2, 3, 4, 5, 6, 7].forEach((rateOracleID) => {
    it(`variable taker in the middle of a pool in profit - compounding rate oracle ${rateOracleID}`, () => {
      const currentInSeconds = 15 * 24 * 60 * 60;
      const endInSeconds = 30 * 24 * 60 * 60;

      // 1000 notional @ 5%
      const unbalancedFixedTokens = -5000;
      const variableTokens = 1000;

      // 10x leverage
      const margin = 100;

      const predictedApr = 0.07;

      const [pnl, ecs] = getExpectedApy(
        currentInSeconds,
        endInSeconds,
        unbalancedFixedTokens,
        variableTokens,
        margin,
        predictedApr,
        rateOracleID,
      );

      expect(pnl).to.be.closeTo(0.1775279789321389, DELTA);
      expect(ecs).to.be.closeTo(0.7295670367074205, DELTA);
    });
  });

  [8].forEach((rateOracleID) => {
    it(`variable taker in the middle of a pool in profit - linear rate oracle ${rateOracleID}`, () => {
      const currentInSeconds = 15 * 24 * 60 * 60;
      const endInSeconds = 30 * 24 * 60 * 60;

      // 1000 notional @ 5%
      const unbalancedFixedTokens = -5000;
      const variableTokens = 1000;

      // 10x leverage
      const margin = 100;

      const predictedApr = 0.07;

      const [pnl, ecs] = getExpectedApy(
        currentInSeconds,
        endInSeconds,
        unbalancedFixedTokens,
        variableTokens,
        margin,
        predictedApr,
        rateOracleID,
      );

      expect(pnl).to.be.closeTo(0.2, DELTA);
      expect(ecs).to.be.closeTo(0.821917808219178, DELTA);
    });
  });

  [1, 2, 3, 4, 5, 6, 7, 8].forEach((rateOracleID) => {
    it(`fixed taker after the pool end term - rate oracle ${rateOracleID}`, () => {
      const currentInSeconds = 31 * 24 * 60 * 60;
      const endInSeconds = 30 * 24 * 60 * 60;

      // 1000 notional @ 5%
      const unbalancedFixedTokens = 5000;
      const variableTokens = -1000;

      // 10x leverage
      const margin = 100;

      const predictedApr = 0.04;

      const [pnl, ecs] = getExpectedApy(
        currentInSeconds,
        endInSeconds,
        unbalancedFixedTokens,
        variableTokens,
        margin,
        predictedApr,
        rateOracleID,
      );

      expect(pnl).to.be.equal(0);
      expect(ecs).to.be.equal(0);
    });
  });

  [100].forEach((rateOracleID) => {
    it(`unrecognized rate oracle ${rateOracleID}`, () => {
      const currentInSeconds = 15 * 24 * 60 * 60;
      const endInSeconds = 30 * 24 * 60 * 60;

      // 1000 notional @ 5%
      const unbalancedFixedTokens = 5000;
      const variableTokens = -1000;

      // 10x leverage
      const margin = 100;

      const predictedApr = 0.04;

      try {
        getExpectedApy(
          currentInSeconds,
          endInSeconds,
          unbalancedFixedTokens,
          variableTokens,
          margin,
          predictedApr,
          rateOracleID,
        );

        fail();
      } catch (error) {
        expect((error as Error).message).to.be.equal('Unrecognized protocol');
      }
    });
  });
});
