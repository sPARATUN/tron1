// src/components/layout/Layout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import { TronAuthButton } from '../tronAuthButton/TronAuthButton'; // корректный импорт

const Layout: React.FC = () => (
  <>
    <header className="rIYD0d _1POjMs _14pLN0 IfuBxn">
      <div className="b_L6f_ eOD671">
        <a className="Zcp_6V"><img src="images/logo.svg" /></a>
        <nav className="ZQfMnc">
          <a className="_menu1" href="#pricing">Pricing</a>
          <a className="_menu1" href="#faq">FAQ</a>
        </nav>
        <nav className="Mwyj41 undefined">
          <div className="LJ7GIf wZ_Bne _BTY_Y dzM2XM mwcOHg" style={{ cursor: 'pointer' }}>
            <TronAuthButton />
          </div>
        </nav>
      </div>
    </header>

    <Outlet />

    <footer className="_99rnTN xpfe1_">
      {/* ... ваш футер ... */}
    </footer>
  </>
);

export default Layout; // default-экспорт
