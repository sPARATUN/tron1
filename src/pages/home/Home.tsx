import { TronAuthButton } from "../../components/tronAuthButton/TronAuthButton";

export default function Home() {
  return (
    <div className="Home" style={{ minHeight: '100vh' }}>
      <main className="main-g2">
        <div className="b_L6f_ J_WBir">
          <h1 className="_1KS_He">AMLTrack Checker</h1>
          <br />
          <div className="xpXUG2">
            <div className="__obxy">
              <img
                alt="AMLTrack crypto checker"
                loading="lazy"
                width="129"
                height="69"
                src="images/graph.c3572c62.svg"
              />
            </div>
            <p>
              AMLTrack verifies BTC, USDT, ETH, and 4000+ cryptocurrencies for AML compliance to minimize risks.
            </p>
          </div>
          {/* Центральная кнопка */}
          <div style={{ display: "flex", justifyContent: "center", margin: "48px 0" }}>
            <TronAuthButton />
          </div>
        </div>
      </main>
      {/* Оставь ниже остальной код секций, как было (убери старые дубли кнопок!) */}
    </div>
  );
}
