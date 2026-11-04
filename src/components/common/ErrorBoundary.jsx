import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            fontFamily: 'var(--font-family-base, sans-serif)',
            background: 'var(--bg-canvas, #0e0e11)',
            color: 'var(--text-primary, #ffffff)'
          }}
        >
          <div
            style={{
              maxWidth: '480px',
              width: '100%',
              padding: '2.5rem',
              borderRadius: '16px',
              background: 'var(--bg-surface, #18181f)',
              border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                margin: '0 auto 1.25rem',
                borderRadius: '50%',
                background: 'rgba(184, 154, 116, 0.15)',
                color: '#B89A74',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: '700'
              }}
            >
              !
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-primary, #fff)' }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary, #9ca3af)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              An unexpected error occurred while rendering this view. Please refresh the page to continue.
            </p>
            <button
              onClick={this.handleReload}
              style={{
                padding: '0.625rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                background: '#B89A74',
                color: '#0e0e11',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'opacity 0.2s'
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

