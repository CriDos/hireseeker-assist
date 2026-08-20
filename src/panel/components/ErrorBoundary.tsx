import { Component, ErrorInfo, ReactNode } from 'react';
import { APP_VERSION } from '../../core/version';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[hireseeker-assist:panel] Uncaught render error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, copied: false });
  };

  private handleReload = () => {
    try {
      if (typeof chrome !== 'undefined' && chrome?.runtime?.reload) {
        chrome.runtime.reload();
      } else {
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  };

  private handleCopy = () => {
    const timeStr = new Date().toLocaleString('ru-RU');
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
    const text = [
      `=== HIRESEEKER ASSIST PANEL CRASH REPORT ===`,
      `Версия: v${APP_VERSION}`,
      `Время: ${timeStr}`,
      `User-Agent: ${ua}`,
      `\n--- [ERROR] ---\n${this.state.error?.name || 'Error'}: ${this.state.error?.message || String(this.state.error)}`,
      `\n--- [STACK TRACE] ---\n${this.state.error?.stack || 'No stack trace'}`,
      `\n--- [COMPONENT STACK] ---\n${this.state.errorInfo?.componentStack || 'No component stack'}`
    ].join('\n');

    navigator.clipboard?.writeText(text);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  public render() {
    if (this.state.hasError) {
      const errorName = this.state.error?.name || 'RenderError';
      const errorMessage =
        this.state.error?.message ||
        String(this.state.error || 'Непредвиденная ошибка отрисовки интерфейса');
      const stack = this.state.error?.stack;
      const componentStack = this.state.errorInfo?.componentStack;

      return (
        <div className="crash-screen" style={{ padding: '16px', color: '#f87171' }}>
          {/* Header Card */}
          <div className="crash-header" style={{ marginBottom: '12px' }}>
            <div className="crash-title-group">
              <h3 style={{ color: '#fff', fontSize: '14px', margin: 0 }}>
                Сбой рендера панели: HireSeeker Assist v{APP_VERSION}
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>
                Непредвиденная ошибка отрисовки интерфейса
              </p>
            </div>
          </div>

          {/* Error Message Box */}
          <div
            className="crash-error-box"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '10px',
              borderRadius: '6px',
              marginBottom: '12px'
            }}
          >
            <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{errorName}</div>
            <div style={{ fontSize: '11px', marginTop: '4px', wordBreak: 'break-word' }}>
              {errorMessage}
            </div>
          </div>

          {/* Toolbar Actions */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button type="button" className="hs-btn-primary hs-btn-sm" onClick={this.handleReset}>
              🔄 Повторить
            </button>
            <button
              type="button"
              className="hs-btn-secondary hs-btn-sm"
              onClick={this.handleReload}
            >
              ⚡ Перезапустить
            </button>
            <button type="button" className="hs-btn-secondary hs-btn-sm" onClick={this.handleCopy}>
              {this.state.copied ? '✓ Скопировано' : '📋 Скопировать отчёт'}
            </button>
          </div>

          {/* Stack trace */}
          {stack && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                Стек вызовов:
              </div>
              <pre
                style={{
                  background: '#080a10',
                  padding: '8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  color: '#cbd5e1',
                  maxHeight: '160px',
                  overflowY: 'auto'
                }}
              >
                {stack}
              </pre>
            </div>
          )}

          {componentStack && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                Иерархия компонентов:
              </div>
              <pre
                style={{
                  background: '#080a10',
                  padding: '8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  color: '#cbd5e1',
                  maxHeight: '140px',
                  overflowY: 'auto'
                }}
              >
                {componentStack.trim()}
              </pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
