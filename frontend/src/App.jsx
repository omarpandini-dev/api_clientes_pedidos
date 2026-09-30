import { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Clientes } from './pages/Clientes';
import { Produtos } from './pages/Produtos';
import { Pedidos } from './pages/Pedidos';
import { api } from './api/client';

export default function App() {
  const [active, setActive] = useState(0);
  const [createNonce, setCreateNonce] = useState([0, 0, 0, 0]);

  function navigate(index, create = false) {
    setActive(index);
    if (create) {
      setCreateNonce((current) => current.map((value, i) => i === index ? value + 1 : value));
    }
  }

  function consumeCreate(index) {
    setCreateNonce((current) => current.map((value, i) => i === index ? 0 : value));
  }

  const pages = [
    <Dashboard key="dashboard" api={api} onNavigate={navigate} />,
    <Clientes key="clientes" api={api} createNonce={createNonce[1]} onCreateHandled={() => consumeCreate(1)} />,
    <Produtos key="produtos" api={api} createNonce={createNonce[2]} onCreateHandled={() => consumeCreate(2)} />,
    <Pedidos key="pedidos" api={api} createNonce={createNonce[3]} onCreateHandled={() => consumeCreate(3)} />,
  ];

  if (!api.configured) {
    return (
      <div className="config-error">
        <h1>Configuração necessária</h1>
        <p>Defina <code>VITE_API_KEY</code> com a mesma chave configurada no backend e gere novamente o frontend.</p>
      </div>
    );
  }

  return <Layout active={active} onNavigate={navigate}>{pages[active]}</Layout>;
}
