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
                            <img alt="AMLTrack crypto checker" loading="lazy" width="129" height="69" decoding="async" src="images/graph.c3572c62.svg" />
                        </div>
                        <p>AMLTrack verifies BTC, USDT, ETH, and 4000+ cryptocurrencies for AML compliance to minimize risks.</p>
                    </div>
                    <div className="ojEDBR">
                        <div className="Ty0xmD">
                            {/* Только кнопка, без дублирующего текста */}
                            <TronAuthButton />
                        </div>
                    </div>
                </div>
            </main>
            <section className="HXvDMk">
                {/* ... (без изменений) ... */}
            </section>
            <section className="_Oit_i">
                {/* ... (без изменений) ... */}
            </section>
            <section className="FfIMvv">
                <div className="b_L6f_ wEsNDo">
                    <div className="a9Vo_w">
                        <h2 className="tvPmXe">Crypto AML services</h2>
                        <p className="IsNi6g">AML wallet checker</p>
                    </div>
                    <div className="UmGsIm">
                        {/* ... (остальные блоки без изменений) ... */}
                    </div>
                    <div className="c_w5Y_">
                        <div className="Ty0xmD">
                            {/* Только кнопка! */}
                            <TronAuthButton />
                        </div>
                    </div>
                </div>
            </section>
            {/* Остальные секции без изменений */}
            <section className="ePrVrt at7PLk" id="what-do-we-analyze">
                {/* ... */}
            </section>
            <section className="how-much" id="pricing">
                <div className="container">
                    {/* Оставь оформление как есть, не вставляй TronAuthButton если не нужна кнопка */}
                    <a className="how-much__wrap aos-init">
                        <span className="how-much__title">How much is your peace of mind worth</span>
                        <span className="how-much__up">From</span>
                        <span className="how-much__cost">
                            <span className="how-much__cost-num">25 TRX</span>
                            <span className="how-much__cost-label">/ per check</span>
                        </span>
                        <span className="how-much__link">Check your wallet <svg className="icon"><use xmlnsXlink="http://www.w3.org/1999/xlink" xlinkHref="#icon-arrow-right-long" /></svg></span>
                    </a>
                    <div className="how-much__text aos-init">
                        According to our statistics, <b>every fourth wallet is suspicious.</b> <br />
                        Spending a couple dollars on a check can save you from losing several thousand dollars.
                    </div>
                </div>
            </section>
            {/* ...другие секции без изменений... */}
        </div>
    );
}
