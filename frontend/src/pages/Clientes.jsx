import { useCallback, useEffect, useState } from 'react';
import { MapPin, Plus, Users } from 'lucide-react';
import {
  EmptyState,
  ErrorState,
  Loading,
  Modal,
  PageTitle,
  Pagination,
  Panel,
  SearchField,
  Toast,
} from '../components/Ui';

const dateFormat = new Intl.DateTimeFormat('pt-BR');

function ClienteForm({ api, onClose, onCreated }) {
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', cidade: '', uf: '', segmento: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.clientes.create({ ...form, uf: form.uf.toUpperCase() });
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Novo cliente" onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <label className="span-2">Nome completo<input required minLength="2" maxLength="200" value={form.nome} onChange={(e) => update('nome', e.target.value)} /></label>
        <label className="span-2">E-mail<input required type="email" value={form.email} onChange={(e) => update('email', e.target.value)} /></label>
        <label>Telefone<input required minLength="5" maxLength="40" value={form.telefone} onChange={(e) => update('telefone', e.target.value)} /></label>
        <label>UF<input required minLength="2" maxLength="2" value={form.uf} onChange={(e) => update('uf', e.target.value.replace(/[^a-z]/gi, '').slice(0, 2))} /></label>
        <label>Cidade<input required minLength="2" value={form.cidade} onChange={(e) => update('cidade', e.target.value)} /></label>
        <label>Segmento<input required minLength="2" value={form.segmento} onChange={(e) => update('segmento', e.target.value)} /></label>
        {error && <div className="form-error span-2">{error}</div>}
        <div className="form-actions span-2">
          <button type="button" className="button secondary" onClick={onClose}>Cancelar</button>
          <button className="button primary" disabled={saving}>{saving ? 'Salvando...' : 'Cadastrar cliente'}</button>
        </div>
      </form>
    </Modal>
  );
}

export function Clientes({ api, createNonce, onCreateHandled }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [nome, setNome] = useState('');
  const [cidade, setCidade] = useState('');
  const [filters, setFilters] = useState({ nome: '', cidade: '' });
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await api.clientes.list({ page, limit: 20, ...filters }));
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
    setFilters({ nome, cidade });
  }

  function created() {
    setModal(false);
    setToast('Cliente cadastrado com sucesso.');
    setPage(1);
    load();
  }

  return (
    <>
      <PageTitle
        title="Clientes"
        subtitle="Consulte e cadastre clientes da sua operação."
        action={<button className="button primary" onClick={() => setModal(true)}><Plus size={18} /> Novo cliente</button>}
      />
      <Panel>
        <div className="filters-row">
          <SearchField value={nome} onChange={setNome} placeholder="Buscar por nome" onSubmit={search} />
          <div className="input-with-icon"><MapPin size={18} /><input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Filtrar por cidade" onKeyDown={(e) => e.key === 'Enter' && search()} /></div>
          <button className="button secondary" onClick={search}>Aplicar filtros</button>
        </div>

        {loading ? <Loading /> : error ? <ErrorState error={error} onRetry={load} /> : result?.dados.length === 0 ? <EmptyState /> : (
          <>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Cliente</th><th>Contato</th><th>Localização</th><th>Segmento</th><th>Cadastro</th></tr></thead>
                <tbody>
                  {result.dados.map((cliente) => (
                    <tr key={cliente.id}>
                      <td><div className="entity-cell"><span className="avatar"><Users size={17} /></span><div><strong>{cliente.nome}</strong><small>{cliente.id}</small></div></div></td>
                      <td><div>{cliente.email}</div><small>{cliente.telefone}</small></td>
                      <td>{cliente.cidade} / {cliente.uf}</td>
                      <td>{cliente.segmento}</td>
                      <td>{dateFormat.format(new Date(`${cliente.dataCadastro}T12:00:00`))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination value={result.paginacao} onChange={setPage} />
          </>
        )}
      </Panel>
      {modal && <ClienteForm api={api} onClose={() => setModal(false)} onCreated={created} />}
      <Toast message={toast} onClose={() => setToast('')} />
    </>
  );
}
