import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Boxes,
  CalendarDays,
  ClipboardList,
  LineChart as LineChartIcon,
  Plus,
  ShoppingBag,
  Users,
  WalletCards,
  Zap,
} from 'lucide-react';
import { EmptyState, ErrorState, Loading, PageTitle, Panel, StatusBadge } from '../components/Ui';

const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const shortDate = new Intl.DateTimeFormat('pt-BR');

function apiDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function MetricCard({ title, value, caption, icon: Icon, tone }) {
  return (
    <Panel className="metric-card">
      <div className={`metric-icon ${tone}`}><Icon size={27} /></div>
      <div className="metric-content">
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{caption}</small>
      </div>
    </Panel>
  );
}

function OrdersChart({ values }) {
  const width = 760;
  const height = 280;
  const left = 45;
  const right = 20;
  const top = 18;
  const bottom = 42;
  const max = Math.max(10, ...values);
  const ceiling = Math.ceil(max / 10) * 10;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const points = values.map((value, index) => ({
    x: left + (plotWidth / 11) * index,
    y: top + plotHeight - (value / ceiling) * plotHeight,
  }));
  const line = points.map((point) => `${point.x},${point.y}`).join(' ');
  const area = `${left},${top + plotHeight} ${line} ${left + plotWidth},${top + plotHeight}`;

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Pedidos por mês">
        <defs>
          <linearGradient id="chartArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#0d6efd" stopOpacity=".24" />
            <stop offset="100%" stopColor="#0d6efd" stopOpacity=".02" />
          </linearGradient>
        </defs>
        {[0, .25, .5, .75, 1].map((ratio) => {
          const y = top + plotHeight * ratio;
          return <line key={ratio} x1={left} x2={width - right} y1={y} y2={y} className="chart-grid" />;
        })}
        {months.map((month, index) => {
          const x = left + (plotWidth / 11) * index;
          return <text key={month} x={x} y={height - 12} textAnchor="middle" className="chart-label">{month}</text>;
        })}
        <polygon points={area} fill="url(#chartArea)" />
        <polyline points={line} fill="none" className="chart-line" />
        {points.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="5" className="chart-point" />)}
      </svg>
    </div>
  );
}

export function Dashboard({ api, onNavigate }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const yearEnd = new Date(now.getFullYear(), 11, 31);
      const [clientes, produtos, pedidos] = await Promise.all([
        api.clientes.list({ page: 1, limit: 1 }),
        api.produtos.list({ page: 1, limit: 1 }),
        api.pedidos.all({ dataInicio: apiDate(yearStart), dataFim: apiDate(yearEnd) }),
      ]);
      setData({ clientes, produtos, pedidos });
    } catch (err) {
      setError(err);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const summary = useMemo(() => {
    if (!data) return null;
    const now = new Date();
    const monthly = Array(12).fill(0);
    let ordersThisMonth = 0;
    let salesThisMonth = 0;
    data.pedidos.forEach((pedido) => {
      const date = new Date(`${pedido.dataPedido}T12:00:00`);
      monthly[date.getMonth()] += 1;
      if (date.getMonth() === now.getMonth()) {
        ordersThisMonth += 1;
        salesThisMonth += Number(pedido.valorTotal);
      }
    });
    return {
      monthly,
      ordersThisMonth,
      salesThisMonth,
      recent: data.pedidos.slice().sort((a, b) => b.dataPedido.localeCompare(a.dataPedido) || b.id.localeCompare(a.id)).slice(0, 5),
    };
  }, [data]);

  if (error) return <><PageTitle title="Visão geral" /><ErrorState error={error} onRetry={load} /></>;
  if (!data || !summary) return <><PageTitle title="Visão geral" /><Loading /></>;

  return (
    <>
      <PageTitle
        title="Visão geral"
        action={<div className="period-pill"><CalendarDays size={18} /> Este mês</div>}
      />

      <div className="metrics-grid">
        <MetricCard title="Clientes cadastrados" value={data.clientes.paginacao.total} caption="Total registrado na base" icon={Users} tone="green" />
        <MetricCard title="Produtos cadastrados" value={data.produtos.paginacao.total} caption="Itens disponíveis no catálogo" icon={Boxes} tone="blue" />
        <MetricCard title="Pedidos no mês" value={summary.ordersThisMonth} caption="Calculado com dados reais" icon={ClipboardList} tone="blue" />
        <MetricCard title="Vendas no mês" value={money.format(summary.salesThisMonth)} caption="Somatório dos pedidos do mês" icon={WalletCards} tone="green" />
      </div>

      <div className="dashboard-main-grid">
        <Panel className="chart-panel">
          <div className="panel-heading"><LineChartIcon className="blue-text" /><h2>Pedidos ao longo do tempo</h2></div>
          <OrdersChart values={summary.monthly} />
        </Panel>

        <Panel className="recent-panel">
          <div className="panel-heading actions">
            <div><ClipboardList className="blue-text" /><h2>Pedidos recentes</h2></div>
            <button className="button primary" onClick={() => onNavigate(3, true)}><Plus size={18} /> Gerar pedido</button>
          </div>
          {summary.recent.length === 0 ? <EmptyState /> : (
            <div className="table-scroll">
              <table>
                <thead><tr><th>Pedido</th><th>Cliente</th><th>Data</th><th>Total</th><th>Status</th></tr></thead>
                <tbody>
                  {summary.recent.map((pedido) => (
                    <tr key={pedido.id}>
                      <td className="strong">#{pedido.id.replace('PED', '')}</td>
                      <td>{pedido.clienteNome}</td>
                      <td>{shortDate.format(new Date(`${pedido.dataPedido}T12:00:00`))}</td>
                      <td>{money.format(Number(pedido.valorTotal))}</td>
                      <td><StatusBadge status={pedido.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <Panel className="quick-panel">
        <div className="panel-heading actions">
          <div><Zap className="blue-text fill-icon" /><h2>Acessos rápidos</h2></div>
          <div className="heading-buttons">
            <button className="button primary" onClick={() => onNavigate(1, true)}><Plus size={18} /> Novo cliente</button>
            <button className="button primary" onClick={() => onNavigate(2, true)}><Plus size={18} /> Novo produto</button>
          </div>
        </div>
        <div className="quick-grid">
          {[
            { title: 'Consultar clientes', text: 'Visualize e gerencie os clientes cadastrados.', icon: Users, tone: 'green', page: 1 },
            { title: 'Consultar produtos', text: 'Consulte produtos, preços e saldo em estoque.', icon: ShoppingBag, tone: 'blue', page: 2 },
            { title: 'Consultar pedidos', text: 'Acompanhe todos os pedidos realizados.', icon: ClipboardList, tone: 'purple', page: 3 },
          ].map(({ title, text, icon: Icon, tone, page }) => (
            <article className="quick-card" key={title}>
              <div className={`quick-icon ${tone}`}><Icon /></div>
              <div><strong>{title}</strong><p>{text}</p></div>
              <button onClick={() => onNavigate(page)}>Acessar <ArrowRight size={17} /></button>
            </article>
          ))}
        </div>
      </Panel>
    </>
  );
}
