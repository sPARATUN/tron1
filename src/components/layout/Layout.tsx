import { Outlet } from "react-router-dom";
import { TronAuthButton } from "../tronAuthButton/TronAuthButton";

const Layout = () => {
    return (
        <>
            <header className="rIYD0d _1POjMs _14pLN0 IfuBxn">
                <div className="b_L6f_ eOD671">
                    <a className="Zcp_6V">
                        <img src="images/logo.svg" />
                    </a>
                    <nav className="ZQfMnc">
                        <a className="_menu1" href="index.html#pricing">Pricing</a>
                        <a className="_menu1" href="index.html#faq">FAQ</a>
                    </nav>
                    <nav className="Mwyj41 undefined">
                        <div className="LJ7GIf wZ_Bne _BTY_Y dzM2XM mwcOHg" style={{ cursor: "pointer" }}>
                            <TronAuthButton />
                            
                        </div>
                    </nav>
                </div>
            </header>

            <Outlet />

            <footer className="_99rnTN xpfe1_">
                <div className="b_L6f_">
                    <div className="gsp1gS">
                        <div className="_0xfACM">
                            <div className="mwrkyb">
                                <img src="images/logo.svg" />
                            </div>
                            <div className="EOxXQw">
                                <p>Unit 3C. 45 Hing Wah Street, Sham Shui Po, Kowloon, Hong Kong</p>
                            </div>
                        </div>
                        <div className="TGa6sT">
                            <div className="j8Gu_5">
                                <img alt="ISO 9001:215" loading="lazy" width="120" height="120" decoding="async" src="images/iso-9001-black.58844294.svg" />
                                <img alt="ISO 27001:2017" loading="lazy" width="120" height="120" decoding="async" src="images/iso-27001-black.6acb33dc.svg" />
                            </div>
                        </div>
                    </div>
                    <div className="_8yyV1L">
                        <div className="to2XVo">© 2025 AMLTrack</div>
                        <a href="https://t.me/amlcheck_support" rel="nofollow" className="e4Ejat">
                            <svg className="icon icon-telegram">
                                <use xmlnsXlink="http://www.w3.org/1999/xlink" xlinkHref="#icon-telegram"></use>
                            </svg>
                            Support
                        </a>
                    </div>
                </div>
            </footer>
        </>
    );
};

export default Layout;
