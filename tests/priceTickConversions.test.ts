import { expect } from 'chai';
import { Price } from '../src/entities/fractions/price';
import {
  priceToClosestTick,
  tickToPrice,
  fixedRateToPrice,
  tickToFixedRate,
  fixedRateToClosestTick,
  priceToFixedRate,
} from '../src/utils/priceTickConversions';

describe('priceTickConversions', () => {
  describe('#tickToPrice', () => {
    it('price is 1', () => {
      expect(tickToPrice(0).toSignificant(5)).to.be.eq('1');
    });

    it('price is 2.7181', () => {
      expect(tickToPrice(10000).toSignificant(5)).to.be.eq('2.7181');
    });

    it('price is 0.36789', () => {
      expect(tickToPrice(-10000).toSignificant(5)).to.be.eq('0.3679');
    });
  });

  describe('#priceToClosestTick', () => {
    // NOTE: the first argument to the Price constructor is the denominator and the second one is the numerator
    it('tick 10000', () => {
      expect(priceToClosestTick(new Price(3679, 10000))).to.be.eq(9999); // investigate if this can be an issue
    });

    it('tick -10000', () => {
      expect(priceToClosestTick(new Price(10000, 3679))).to.be.eq(-10000);
    });

    describe('reciprocal with tickToPrice', () => {
      it('tick -10000', () => {
        expect(priceToClosestTick(tickToPrice(-10000))).to.be.eq(-10000);
      });

      it('tick 10000', () => {
        expect(priceToClosestTick(tickToPrice(10000))).to.be.eq(10000);
      });

      it('tick 0', () => {
        expect(priceToClosestTick(tickToPrice(0))).to.be.eq(0);
      });

      it('tick 30000', () => {
        expect(priceToClosestTick(tickToPrice(30000))).to.be.eq(30000);
      });

      it('tick -30000', () => {
        expect(priceToClosestTick(tickToPrice(-30000))).to.be.eq(-30000);
      });
    });
  });

  describe('#fixedRateToPrice', () => {
    it('10000/3679', () => {
      const tmp = fixedRateToPrice(new Price(10000, 3679));
      expect(tmp.denominator.toString()).to.be.eq('3679');
      expect(tmp.numerator.toString()).to.be.eq('10000');
    });

    it('3679/10000', () => {
      const tmp = fixedRateToPrice(new Price(3679, 10000));
      expect(tmp.denominator.toString()).to.be.eq('10000');
      expect(tmp.numerator.toString()).to.be.eq('3679');
    });
  });

  describe('#tickToFixedRate', () => {
    it('fixed rate is 1, price is also 1', () => {
      expect(tickToFixedRate(0).toSignificant(5)).to.be.eq('1');
    });

    it('price is 2.7181, fixed rate is 0.3679 %', () => {
      expect(tickToFixedRate(10000).toSignificant(5)).to.be.eq('0.3679');
    });

    it('price is 0.36789, fixed rate is 2.7181 %', () => {
      expect(tickToFixedRate(-10000).toSignificant(5)).to.be.eq('2.7181');
    });
  });

  describe('#fixedRateToTheClosestTick', () => {
    it('tick 10000', () => {
      expect(fixedRateToClosestTick(new Price(10000, 3679))).to.be.eq(9999); // investigate if this can be an issue
    });

    it('tick -10000', () => {
      expect(fixedRateToClosestTick(new Price(3679, 10000))).to.be.eq(-10000);
    });

    describe('reciprocal with tickToFixedRate', () => {
      it('tick -10000', () => {
        expect(fixedRateToClosestTick(tickToFixedRate(-10000))).to.be.eq(-10000);
      });

      it('tick 10000', () => {
        expect(fixedRateToClosestTick(tickToFixedRate(10000))).to.be.eq(10000);
      });

      it('tick 0', () => {
        expect(fixedRateToClosestTick(tickToFixedRate(0))).to.be.eq(0);
      });

      it('tick 30000', () => {
        expect(fixedRateToClosestTick(tickToFixedRate(30000))).to.be.eq(30000);
      });

      it('tick -30000', () => {
        expect(fixedRateToClosestTick(tickToFixedRate(-30000))).to.be.eq(-30000);
      });
    });
  });

  describe('#priceToFixedRate', () => {
    it('10000/3679', () => {
      const tmp = priceToFixedRate(new Price(10000, 3679));
      expect(tmp.denominator.toString()).to.be.eq('3679');
      expect(tmp.numerator.toString()).to.be.eq('10000');
    });
  });
});
