import {
  Bell,
  Boxes,
  ChevronDown,
  ClipboardList,
  Home,
  Menu,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';

const items = [
  { label: 'Visão geral', icon: Home },
  { label: 'Clientes', icon: Users },
  { label: 'Produtos', icon: Boxes },
  { label: 'Pedidos', icon: ClipboardList },
];

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark"><i /><i /><i /></span>
      <strong>Gestão Fácil</strong>
    </div>
  );
}

function Navigation({ active, onNavigate, close }) {
  return (
    <nav className="navigation">
      {items.map(({ label, icon: Icon }, index) => (
        <button
          key={label}
          className={active === index ? 'active' : ''}
          onClick={() => { onNavigate(index); close?.(); }}
        >
          <Icon size={21} strokeWidth={1.9} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

export function Layout({ active, onNavigate, children }) {
  const [drawer, setDrawer] = useState(false);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <Navigation active={active} onNavigate={onNavigate} />
      </aside>

      {drawer && (
        <div className="drawer-layer" onMouseDown={() => setDrawer(false)}>
          <aside className="mobile-drawer" onMouseDown={(event) => event.stopPropagation()}>
            <div className="drawer-header"><Brand /><button onClick={() => setDrawer(false)}><X /></button></div>
            <Navigation active={active} onNavigate={onNavigate} close={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <div className="main-column">
        <header className="topbar">
          <button className="menu-button" onClick={() => setDrawer(true)} aria-label="Abrir menu"><Menu /></button>
          <div className="topbar-spacer" />
          <button className="notification" aria-label="Notificações"><Bell size={23} /><span /></button>
          <button className="profile">
            <span>AP</span>
            <ChevronDown size={16} />
          </button>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
