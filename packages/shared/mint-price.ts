import {Fault} from './domain.js';
// Owner-approved whole-token price. Never treat this number as raw SPL base units.
export const MINT_PRICE_HMD=8888n;
export function mintPriceBaseUnits(decimals:number):string{
 if(!Number.isInteger(decimals)||decimals<0||decimals>15)throw new Fault(503,'unsupported_hmd_decimals');
 const amount=MINT_PRICE_HMD*10n**BigInt(decimals);
 if(amount>18446744073709551615n)throw new Fault(503,'mint_price_overflow');
 return amount.toString();
}
