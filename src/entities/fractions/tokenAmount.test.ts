
   
// todo: ab to fix
// import JSBI from 'jsbi'
// import { MaxUint256 } from '../../constants'
// import Token from "../token";
// import { TokenAmount } from './tokenAmount'
// import Percent from "./percent";

// describe('TokenAmount', () => {
//   const ADDRESS_ONE = '0x0000000000000000000000000000000000000001'

//   describe('constructor', () => {
//     it('works', () => {
//       const token = new Token({ 
//         id: ADDRESS_ONE,
//         name: "Voltz",
//         decimals: 18
//       })
//       const amount = TokenAmount.fromRawAmount(token, 100)
//       expect(amount.quotient).toEqual(JSBI.BigInt(100))
//     })
//   })

//   describe('#quotient', () => {
//     it('returns the amount after multiplication', () => {
//       const token = new Token({ 
//         id: ADDRESS_ONE,
//         name: "Voltz",
//         decimals: 18
//       });
//       const amount = TokenAmount.fromRawAmount(token, 100).multiply(new Percent(15, 100))
//       expect(amount.quotient).toEqual(JSBI.BigInt(15))
//     })
//   })

//   it('token amount can be max uint256', () => {
//     const amount = TokenAmount.fromRawAmount(new Token({ 
//         id: ADDRESS_ONE,
//         name: "Voltz",
//         decimals: 18
//       }), MaxUint256)
//     expect(amount.quotient).toEqual(MaxUint256)
//   })

//   it('token amount cannot exceed max uint256', () => {
//     expect(() =>
//       TokenAmount.fromRawAmount(new Token({ 
//         id: ADDRESS_ONE,
//         name: "Voltz",
//         decimals: 18
//       }), JSBI.add(MaxUint256, JSBI.BigInt(1)))
//     ).toThrow('AMOUNT')
//   })

//   it('token amount quotient cannot exceed max uint256', () => {
//     expect(() =>
//       TokenAmount.fromFractionalAmount(
//         new Token({ 
//         id: ADDRESS_ONE,
//         name: "Voltz",
//         decimals: 18
//       }),
//         JSBI.add(JSBI.multiply(MaxUint256, JSBI.BigInt(2)), JSBI.BigInt(2)),
//         JSBI.BigInt(2)
//       )
//     ).toThrow('AMOUNT')
//   })
  
//   it('token amount numerator can be gt. uint256 if denominator is gt. 1', () => {
//     const amount = TokenAmount.fromFractionalAmount(
//       new Token({ 
//         id: ADDRESS_ONE,
//         name: "Voltz",
//         decimals: 18
//       }),
//       JSBI.add(MaxUint256, JSBI.BigInt(2)),
//       2
//     )
//     expect(amount.numerator).toEqual(JSBI.add(JSBI.BigInt(2), MaxUint256))
//   })

//   describe('#toFixed', () => {
//     it('throws for decimals > token.decimals', () => {
//       const token = new Token({ 
//         id: ADDRESS_ONE,
//         name: "Voltz",
//         decimals: 0
//       })


//       const amount = TokenAmount.fromRawAmount(token, 1000)
//       expect(() => amount.toFixed(3)).toThrow('DECIMALS')
//     })
//     it('is correct for 0 decimals', () => {
//       const token = new Token({ 
//         id: ADDRESS_ONE,
//         name: "Voltz",
//         decimals: 0
//       })
//       const amount = TokenAmount.fromRawAmount(token, 123456)
//       expect(amount.toFixed(0)).toEqual('123456')
//     })
//     it('is correct for 18 decimals', () => {
//       const token = new Token({ 
//         id: ADDRESS_ONE,
//         name: "Voltz",
//         decimals: 18
//       })
//       const amount = TokenAmount.fromRawAmount(token, 1e15)
//       expect(amount.toFixed(9)).toEqual('0.001000000')
//     })
//   })

//   describe('#toSignificant', () => {
//     it('does not throw for sig figs > token.decimals', () => {
//       const token = new Token({ 
//         id: ADDRESS_ONE,
//         name: "Voltz",
//         decimals: 0
//       })
//       const amount = TokenAmount.fromRawAmount(token, 1000)
//       expect(amount.toSignificant(3)).toEqual('1000')
//     })
//     it('is correct for 0 decimals', () => {
//       const token = new Token({ 
//         id: ADDRESS_ONE,
//         name: "Voltz",
//         decimals: 0
//       })
//       const amount = TokenAmount.fromRawAmount(token, 123456)
//       expect(amount.toSignificant(4)).toEqual('123400')
//     })
//     it('is correct for 18 decimals', () => {
//       const token = new Token({ 
//         id: ADDRESS_ONE,
//         name: "Voltz",
//         decimals: 18
//       })
//       const amount = TokenAmount.fromRawAmount(token, 1e15)
//       expect(amount.toSignificant(9)).toEqual('0.001')
//     })
//   })

//   describe('#toExact', () => {
//     it('does not throw for sig figs > token.decimals', () => {
//       const token = new Token({ 
//         id: ADDRESS_ONE,
//         name: "Voltz",
//         decimals: 0
//       })
//       const amount = TokenAmount.fromRawAmount(token, 1000)
//       expect(amount.toExact()).toEqual('1000')
//     })
//     it('is correct for 0 decimals', () => {
//       const token = new Token({ 
//         id: ADDRESS_ONE,
//         name: "Voltz",
//         decimals: 0
//       })
//       const amount = TokenAmount.fromRawAmount(token, 123456)
//       expect(amount.toExact()).toEqual('123456')
//     })
//     it('is correct for 18 decimals', () => {
//       const token = new Token({ 
//         id: ADDRESS_ONE,
//         name: "Voltz",
//         decimals: 18
//       })
//       const amount = TokenAmount.fromRawAmount(token, 123e13)
//       expect(amount.toExact()).toEqual('0.00123')
//     })
//   })
// })