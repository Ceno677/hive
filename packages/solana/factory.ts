import type {Config} from '../shared/config.js';
import type {Chain} from './chain.js';
import {SolanaChain} from './chain.js';
import {CustodialSolanaChain} from './custodial.js';
export const createChain=(c:Config):Chain=>c.PAYMENT_MODE==='custodial'?new CustodialSolanaChain(c):new SolanaChain(c);
