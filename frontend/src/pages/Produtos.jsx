import { useCallback, useEffect, useState } from 'react';
import { Boxes, Layers3, Plus } from 'lucide-react';
import {
  EmptyState,
  ErrorState,
  Loading,
  Modal,
  PageTitle,
  Pagination,
  Panel,
  SearchField,
  StatusBadge,
  Toast,
} from '../components/Ui';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function ProdutoForm({ api, onClose, onCreated }) {
  const [form, setForm] = useState({ nome: '', categoria: '', precoUnitario: '', estoque: '', status: 'Ativo' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.produtos.create({
        ...form,
        precoUnitario: Number(String(form.precoUnitario).replace(',', '.')),
        estoque: Number(form.estoque),
      });
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Novo produto" onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <label className="span-2">Nome do produto<input required minLength="2" value={form.nome} onChange={(e) => update('nome', e.target.value)} /></label>
        <label className="span-2">Categoria<input required minLength="2" value={form.categoria} onChange={(e) => update('categoria', e.target.value)} /></label>
        <label>Preço unitário (R$)<input required type="number" min="0" step="0.01" value={form.precoUnitario} onChange={(e) => update('precoUnitario', e.target.value)} /></label>
        <label>Estoque inicial<input required type="number" min="0" step="1" value={form.estoque} onChange={(e) => update('estoque', e.target.value)} /></label>
        <label className="span-2">Status<select value={form.status} onChange={(e) => update('status', e.target.value)}><option>Ativo</option><option>Inativo</option></select></label>
        {error && <div className="form-error span-2">{error}</div>}
        <div className="form-actions span-2">
          <button type="button" className="button secondary" onClick={onClose}>Cancelar</button>
          <button className="button primary" disabled={saving}>{saving ? 'Salvando...' : 'Cadastrar produto'}</button>
        </div>
      </form>
    </Modal>
  );
}

export function Produtos({ api, createNonce, onCreateHandled }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('');
  const [filters, setFilters] = useState({ nome: '', categoria: '' });
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await api.produtos.list({ page, limit: 20, ...filters }));
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

  function search() {
    setPage(1);
    setFilters({ nome, categoria });
  }

  function created() {
    setModal(false);
    setToast('Produto cadastrado com sucesso.');
    setPage(1);
    load();
  }

  return (
    <>
      <PageTitle
        title="Produtos"
        subtitle="Acompanhe preços, categorias e estoque."
        action={<button className="button primary" onClick={() => setModal(true)}><Plus size={18} /> Novo produto</button>}
      />
      <Panel>
        <div className="filters-row">
          <SearchField value={nome} onChange={setNome} placeholder="Buscar por produto" onSubmit={search} />
          <div className="input-with-icon"><Layers3 size={18} /><input value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Filtrar por categoria" onKeyDown={(e) => e.key === 'Enter' && search()} /></div>
          <button className="button secondary" onClick={search}>Aplicar filtros</button>
        </div>

        {loading ? <Loading /> : error ? <ErrorState error={error} onRetry={load} /> : result?.dados.length === 0 ? <EmptyState /> : (
          <>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Produto</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Status</th></tr></thead>
                <tbody>
                  {result.dados.map((produto) => (
                    <tr key={produto.id}>
                      <td><div className="entity-cell"><span className="avatar blue"><Boxes size={17} /></span><div><strong>{produto.nome}</strong><small>{produto.id}</small></div></div></td>
                      <td>{produto.categoria}</td>
                      <td className="strong">{money.format(Number(produto.precoUnitario))}</td>
                      <td><span className={produto.estoque <= 5 ? 'low-stock' : ''}>{produto.estoque} un.</span></td>
                      <td><StatusBadge status={produto.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination value={result.paginacao} onChange={setPage} />
          </>
        )}
      </Panel>
      {modal && <ProdutoForm api={api} onClose={() => setModal(false)} onCreated={created} />}
      <Toast message={toast} onClose={() => setToast('')} />
    </>
  );
}
