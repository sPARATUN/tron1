import { TronAuthButton } from "../../components/tronAuthButton/TronAuthButton";

export default function Home() {
    return (
        <div className="Home">
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
                                decoding="async"
                                data-nimg="1"
                                src="images/graph.c3572c62.svg"
                            />
                        </div>
                        <p>
                            AMLTrack verifies BTC, USDT, ETH, and 4000+ cryptocurrencies for AML compliance to minimize risks.
                        </p>
                    </div>
                    {/* Кнопка по центру вверху */}
                    <div className="ojEDBR">
                        <div
                            className="Ty0xmD"
                            style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "30px 0" }}
                        >
                            <TronAuthButton />
                        </div>
                    </div>
                </div>
            </main>
            <section className="HXvDMk">
                {/* ...твой остальной код секции без изменений... */}
            </section>
            <section className="_Oit_i">
                {/* ...твой остальной код секции без изменений... */}
            </section>
            <section className="fe6PY6">
                {/* ...твой остальной код секции без изменений... */}
            </section>
            <section className="FfIMvv">
                {/* ...предыдущий код секции... */}
                <div className="c_w5Y_">
                    {/* Кнопка по центру внизу */}
                    <div
                        className="Ty0xmD"
                        style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "30px 0" }}
                    >
                        <TronAuthButton />
                    </div>
                </div>
            </section>
            {/* ...оставшиеся секции без изменений... */}
        </div>
    );
}
