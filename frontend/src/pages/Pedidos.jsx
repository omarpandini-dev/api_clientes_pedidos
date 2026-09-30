import { useCallback, useEffect, useState } from 'react';
import { CalendarRange, ClipboardList, Filter, Plus } from 'lucide-react';
import {
  EmptyState,
  ErrorState,
  Loading,
  Modal,
  PageTitle,
  Pagination,
  Panel,
  StatusBadge,
  Toast,
} from '../components/Ui';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateFormat = new Intl.DateTimeFormat('pt-BR');

function PedidoForm({ api, onClose, onCreated }) {
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ clienteId: '', produtoId: '', quantidade: 1, formaPagamento: 'Pix' });
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  useEffect(() => {
    Promise.all([api.clientes.all(), api.produtos.all()])
      .then(([clientList, productList]) => {
        setClientes(clientList);
        setProdutos(productList.filter((item) => item.status === 'Ativo'));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [api]);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.pedidos.create({
        ...form,
        quantidade: Number(form.quantidade),
      });
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Gerar pedido" onClose={onClose}>
      {loading ? <Loading label="Carregando clientes e produtos..." /> : (
        <form className="form-grid" onSubmit={submit}>
          <label className="span-2">Cliente
            <select required value={form.clienteId} onChange={(e) => update('clienteId', e.target.value)}>
              <option value="">Selecione um cliente</option>
              {clientes.map((item) => <option value={item.id} key={item.id}>{item.nome} — {item.id}</option>)}
            </select>
          </label>
          <label className="span-2">Produto
            <select required value={form.produtoId} onChange={(e) => update('produtoId', e.target.value)}>
              <option value="">Selecione um produto</option>
              {produtos.map((item) => <option value={item.id} key={item.id} disabled={item.estoque === 0}>{item.nome} — estoque {item.estoque}</option>)}
            </select>
          </label>
          <label>Quantidade<input required type="number" min="1" step="1" value={form.quantidade} onChange={(e) => update('quantidade', e.target.value)} /></label>
          <label>Forma de pagamento
            <select value={form.formaPagamento} onChange={(e) => update('formaPagamento', e.target.value)}>
              <option>Pix</option><option>Cartão de crédito</option><option>Boleto</option>
            </select>
          </label>
          {error && <div className="form-error span-2">{error}</div>}
          <div className="form-actions span-2">
            <button type="button" className="button secondary" onClick={onClose}>Cancelar</button>
            <button className="button primary" disabled={saving}>{saving ? 'Gerando...' : 'Gerar pedido'}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export function Pedidos({ api, createNonce, onCreateHandled }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState({ clienteId: '', produtoId: '', status: '', dataInicio: '', dataFim: '' });
  const [filters, setFilters] = useState(draft);
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState('');
  const update = (field, value) => setDraft((current) => ({ ...current, [field]: value }));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await api.pedidos.list({ page, limit: 20, ...filters }));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [api, page, filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (createNonce) {
      setModal(true);
      onCreateHandled();
    }
  }, [createNonce, onCreateHandled]);

  function search(event) {
    event.preventDefault();
    setPage(1);
    setFilters({ ...draft });
  }

  function clear() {
    const empty = { clienteId: '', produtoId: '', status: '', dataInicio: '', dataFim: '' };
    setDraft(empty);
    setFilters(empty);
    setPage(1);
  }

  function created() {
    setModal(false);
    setToast('Pedido gerado e estoque atualizado com sucesso.');
    setPage(1);
    load();
  }

  return (
    <>
      <PageTitle
        title="Pedidos"
        subtitle="Consulte vendas e gere novos pedidos com baixa de estoque."
        action={<button className="button primary" onClick={() => setModal(true)}><Plus size={18} /> Gerar pedido</button>}
      />
      <Panel>
        <form className="order-filters" onSubmit={search}>
          <label>ID do cliente<input value={draft.clienteId} onChange={(e) => update('clienteId', e.target.value.toUpperCase())} placeholder="CLI0001" /></label>
          <label>ID do produto<input value={draft.produtoId} onChange={(e) => update('produtoId', e.target.value.toUpperCase())} placeholder="PROD001" /></label>
          <label>Status<select value={draft.status} onChange={(e) => update('status', e.target.value)}><option value="">Todos</option><option>Processando</option><option>Entregue</option></select></label>
          <label>Data inicial<input type="date" value={draft.dataInicio} onChange={(e) => update('dataInicio', e.target.value)} /></label>
          <label>Data final<input type="date" value={draft.dataFim} onChange={(e) => update('dataFim', e.target.value)} /></label>
          <div className="filter-actions"><button type="button" className="button ghost" onClick={clear}>Limpar</button><button className="button secondary"><Filter size={17} /> Filtrar</button></div>
        </form>

        {loading ? <Loading /> : error ? <ErrorState error={error} onRetry={load} /> : result?.dados.length === 0 ? <EmptyState /> : (
          <>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Pedido</th><th>Cliente</th><th>Produto</th><th>Data</th><th>Qtd.</th><th>Total</th><th>Status</th></tr></thead>
                <tbody>
                  {result.dados.map((pedido) => (
                    <tr key={pedido.id}>
                      <td><div className="entity-cell"><span className="avatar purple"><ClipboardList size={17} /></span><div><strong>{pedido.id}</strong><small>{pedido.formaPagamento}</small></div></div></td>
                      <td><strong>{pedido.clienteNome}</strong><small className="block">{pedido.clienteId} · {pedido.clienteUf}</small></td>
                      <td>{pedido.produtoNome}<small className="block">{pedido.produtoId}</small></td>
                      <td><span className="inline-icon"><CalendarRange size={15} />{dateFormat.format(new Date(`${pedido.dataPedido}T12:00:00`))}</span></td>
                      <td>{pedido.quantidade}</td>
                      <td className="strong">{money.format(Number(pedido.valorTotal))}</td>
                      <td><StatusBadge status={pedido.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination value={result.paginacao} onChange={setPage} />
          </>
        )}
      </Panel>
      {modal && <PedidoForm api={api} onClose={() => setModal(false)} onCreated={created} />}
      <Toast message={toast} onClose={() => setToast('')} />
    </>
  );
}
