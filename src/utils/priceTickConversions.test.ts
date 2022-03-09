
import { Price } from '../entities/fractions/price'
import { priceToClosestTick, tickToPrice } from './priceTickConversions'

describe('priceTickConversions', () => {

  describe('#tickToPrice', () => {
    it('price is 1', () => {
        expect(tickToPrice(0).toSignificant(5)).toEqual('1')
    })

    it('1800 t0/1 t1', () => {
        expect(tickToPrice(10000).toSignificant(5)).toEqual('2.7181')
    })

    // it('1 t1/1800 t0', () => {
    //   expect(tickToPrice(-74959).toSignificant(5)).toEqual('0.00055556')
    // })

    // it('1800 t1/1 t0', () => {
    //   expect(tickToPrice(74959).toSignificant(5)).toEqual('1800')
    // })

    // it('1 t0/1800 t1', () => {
    //   expect(tickToPrice(74959).toSignificant(5)).toEqual('0.00055556')
    // })

  })

//   describe('#priceToClosestTick', () => {
//     it('1800 t0/1 t1', () => {
//       expect(priceToClosestTick(new Price(1, 1800))).toEqual(-74960)
//     })

//     it('1 t1/1800 t0', () => {
//       expect(priceToClosestTick(new Price(1800, 1))).toEqual(-74960)
//     })

//     it('1.01 t2/1 t0', () => {
//       expect(priceToClosestTick(new Price(100e18, 101e6))).toEqual(-276225)
//     })

//     it('1 t0/1.01 t2', () => {
//       expect(priceToClosestTick(new Price(101e6, 100e18))).toEqual(-276225)
//     })

//     describe('reciprocal with tickToPrice', () => {
//       it('1800 t0/1 t1', () => {
//         expect(priceToClosestTick(tickToPrice(-74960))).toEqual(-74960)
//       })

//       it('1 t0/1800 t1', () => {
//         expect(priceToClosestTick(tickToPrice(74960))).toEqual(74960)
//       })

//       it('1 t1/1800 t0', () => {
//         expect(priceToClosestTick(tickToPrice(-74960))).toEqual(-74960)
//       })

//       it('1800 t1/1 t0', () => {
//         expect(priceToClosestTick(tickToPrice(74960))).toEqual(74960)
//       })

//       it('1.01 t2/1 t0', () => {
//         expect(priceToClosestTick(tickToPrice(-276225))).toEqual(-276225)
//       })

//       it('1 t0/1.01 t2', () => {
//         expect(priceToClosestTick(tickToPrice(-276225))).toEqual(-276225)
//       })
//     })
//   })
})