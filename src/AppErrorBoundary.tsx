// src/AppErrorBoundary.tsx
import React from "react";  

export class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message?: string }
> {
  state = { hasError: false, message: undefined };
  static getDerivedStateFromError(err: Error) {
    return { hasError: true, message: err.message };
  }
  render() {
    if (this.state.hasError) {
      return <div style={{ padding: 32 }}>
        <h2>💥 画面描画で例外</h2>
        <pre>{this.state.message}</pre>
      </div>;
    }
    return this.props.children;
  }
}
