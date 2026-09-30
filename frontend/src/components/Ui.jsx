import { AlertCircle, ChevronLeft, ChevronRight, LoaderCircle, Search, X } from 'lucide-react';

export function PageTitle({ title, subtitle, action }) {
  return (
    <div className="page-title-row">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ children, className = '' }) {
  return <section className={`panel ${className}`}>{children}</section>;
}

export function Loading({ label = 'Carregando dados...' }) {
  return (
    <div className="state-box">
      <LoaderCircle className="spin" size={28} />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="state-box error-state">
      <AlertCircle size={30} />
      <strong>Não foi possível carregar</strong>
      <span>{error?.message || 'Erro desconhecido'}</span>
      {onRetry && <button className="button secondary" onClick={onRetry}>Tentar novamente</button>}
    </div>
  );
}

export function EmptyState({ children = 'Nenhum registro encontrado.' }) {
  return <div className="state-box muted">{children}</div>;
}

export function SearchField({ value, onChange, placeholder, onSubmit }) {
  return (
    <form className="search-field" onSubmit={(event) => { event.preventDefault(); onSubmit?.(); }}>
      <Search size={18} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      {value && <button type="button" aria-label="Limpar" onClick={() => onChange('')}><X size={16} /></button>}
    </form>
  );
}

export function Pagination({ value, onChange }) {
  if (!value || value.totalPages <= 1) return null;
  return (
    <div className="pagination">
      <span>{value.total} registros</span>
      <div>
        <button disabled={value.page <= 1} onClick={() => onChange(value.page - 1)} aria-label="Página anterior">
          <ChevronLeft size={18} />
        </button>
        <span>Página {value.page} de {value.totalPages}</span>
        <button disabled={value.page >= value.totalPages} onClick={() => onChange(value.page + 1)} aria-label="Próxima página">
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

export function StatusBadge({ status }) {
  const normalized = status.toLowerCase();
  const tone = normalized.includes('entreg') || normalized === 'ativo'
    ? 'success'
    : normalized.includes('process')
      ? 'warning'
      : normalized.includes('trânsito')
        ? 'info'
        : 'neutral';
  return <span className={`status ${tone}`}>{status}</span>;
}

export function Modal({ title, children, onClose, size = 'medium' }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className={`modal ${size}`} role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        </header>
        {children}
      </div>
    </div>
  );
}

export function Toast({ message, type = 'success', onClose }) {
  if (!message) return null;
  return (
    <div className={`toast ${type}`}>
      <span>{message}</span>
      <button onClick={onClose} aria-label="Fechar"><X size={16} /></button>
    </div>
  );
}
