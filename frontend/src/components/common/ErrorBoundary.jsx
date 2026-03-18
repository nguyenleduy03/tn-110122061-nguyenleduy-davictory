import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div style={{ 
          padding: '20px', 
          border: '1px solid #ff6b6b', 
          borderRadius: '8px', 
          backgroundColor: '#ffe0e0',
          margin: '20px'
        }}>
          <h2 style={{ color: '#d63031', marginBottom: '10px' }}>
            Đã xảy ra lỗi trong ứng dụng
          </h2>
          <details style={{ whiteSpace: 'pre-wrap', fontSize: '14px', color: '#636e72' }}>
            <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>
              Chi tiết lỗi (nhấn để xem)
            </summary>
            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <strong>Error:</strong> {this.state.error && this.state.error.toString()}
              <br />
              <strong>Stack trace:</strong>
              <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                {this.state.errorInfo?.componentStack || 'Không có stack trace chi tiết'}
              </pre>
            </div>
          </details>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              marginTop: '15px',
              padding: '8px 16px',
              backgroundColor: '#0984e3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Tải lại trang
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
