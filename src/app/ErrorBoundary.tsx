import { Component, type ErrorInfo, type ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

interface State {
  error: Error | null;
}

/**
 * Последний рубеж: если какой-то экран упал, пользователь видит сообщение
 * и кнопку перезагрузки, а не белый экран.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className={styles.root} role="alert">
        <h1 className={styles.title}>Что-то пошло не так</h1>
        <p className={styles.text}>Something went wrong. Ваши данные сохранены на устройстве.</p>
        <button type="button" className={styles.button} onClick={() => window.location.reload()}>
          Перезагрузить
        </button>
        {import.meta.env.DEV && <pre className={styles.details}>{this.state.error.message}</pre>}
      </div>
    );
  }
}
