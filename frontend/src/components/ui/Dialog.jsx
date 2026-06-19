import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * App-wide replacement for the native window.alert / window.confirm / window.prompt.
 *
 * Usage:
 *   const dialog = useDialog();
 *   await dialog.alert('Guardado con éxito');                       // info modal
 *   const ok = await dialog.confirm('¿Seguro?', { danger: true });  // returns boolean
 *   const value = await dialog.prompt('Nuevo nombre', { defaultValue: 'x' });
 *   dialog.toast('Mensaje enviado');                                // transient toast
 *
 * Every call returns a Promise so it drops in where async/await is already used.
 */

const DialogContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within <DialogProvider>');
  return ctx;
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
  zIndex: 5000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
};

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null); // { type, title, message, options, resolve }
  const [inputValue, setInputValue] = useState('');
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  const close = useCallback((result) => {
    setDialog((d) => {
      if (d?.resolve) d.resolve(result);
      return null;
    });
  }, []);

  const open = useCallback((type, message, options = {}) => {
    return new Promise((resolve) => {
      setInputValue(options.defaultValue || '');
      setDialog({ type, message, options, resolve });
    });
  }, []);

  const api = useRef({});
  // eslint-disable-next-line react-hooks/refs
  api.current.alert = (message, options) => open('alert', message, options);
  // eslint-disable-next-line react-hooks/refs
  api.current.confirm = (message, options) => open('confirm', message, options);
  // eslint-disable-next-line react-hooks/refs
  api.current.prompt = (message, options) => open('prompt', message, options);
  // eslint-disable-next-line react-hooks/refs
  api.current.toast = (message, options = {}) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, message, variant: options.variant || 'info' }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), options.duration || 3000);
  };

  const accent = dialog?.options?.danger ? '#ff4500' : 'var(--accent-primary)';

  return (
    // eslint-disable-next-line react-hooks/refs
    <DialogContext.Provider value={api.current}>
      {children}

      {dialog && createPortal(
        <div className="fade-in" style={overlayStyle} onClick={() => dialog.type !== 'prompt' && close(dialog.type === 'confirm' ? false : undefined)}>
          <div
            className="glass-panel"
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '420px', padding: '28px', borderTop: `4px solid ${accent}`, background: 'rgba(20,20,24,0.98)' }}
          >
            {dialog.options?.title && (
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '12px', color: accent }}>
                {dialog.options.title}
              </h3>
            )}
            <p style={{ color: 'var(--text-main)', fontSize: '0.98rem', lineHeight: 1.5, whiteSpace: 'pre-line', marginBottom: '20px' }}>
              {dialog.message}
            </p>

            {dialog.type === 'prompt' && (
              <input
                autoFocus
                type={dialog.options?.inputType || 'text'}
                value={inputValue}
                placeholder={dialog.options?.placeholder || ''}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && close(inputValue)}
                className="input-field"
                style={{ width: '100%', marginBottom: '20px' }}
              />
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              {dialog.type !== 'alert' && (
                <button
                  onClick={() => close(dialog.type === 'confirm' ? false : undefined)}
                  style={{ padding: '10px 18px', background: 'transparent', border: '1px solid var(--border-light)', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
                >
                  {dialog.options?.cancelText || 'Cancelar'}
                </button>
              )}
              <button
                onClick={() => close(dialog.type === 'confirm' ? true : dialog.type === 'prompt' ? inputValue : true)}
                style={{ padding: '10px 18px', background: accent, color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 800 }}
              >
                {dialog.options?.confirmText || 'Aceptar'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {toasts.length > 0 && createPortal(
        <div style={{ position: 'fixed', bottom: '90px', left: '50%', transform: 'translateX(-50%)', zIndex: 6000, display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', pointerEvents: 'none' }}>
          {toasts.map((t) => (
            <div key={t.id} className="fade-in" style={{
              background: 'rgba(20,20,24,0.98)', color: '#fff', padding: '12px 20px', borderRadius: '30px',
              border: `1px solid ${t.variant === 'error' ? '#ff4500' : t.variant === 'success' ? '#00e676' : 'var(--accent-primary)'}`,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)', fontSize: '0.9rem', fontWeight: 600, maxWidth: '90vw'
            }}>
              {t.message}
            </div>
          ))}
        </div>,
        document.body
      )}
    </DialogContext.Provider>
  );
}
