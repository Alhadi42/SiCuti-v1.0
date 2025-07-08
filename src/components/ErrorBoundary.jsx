import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });

    // You can also log the error to an error reporting service here
    if (import.meta.env.PROD) {
      // Log to external service in production
      console.error("Production error:", {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-slate-800/80 border-slate-700/70 shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <CardTitle className="text-white text-xl">
                Oops! Terjadi Kesalahan
              </CardTitle>
              <p className="text-slate-400 text-sm">
                Aplikasi mengalami error yang tidak terduga. Silakan coba lagi.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {import.meta.env.DEV && this.state.error && (
                <div className="bg-red-900/30 border border-red-600/30 rounded-lg p-3">
                  <h4 className="text-red-300 font-medium mb-2">
                    Error Details (Development)
                  </h4>
                  <p className="text-red-200 text-sm mb-2">
                    {this.state.error.message}
                  </p>
                  <details className="text-xs text-red-200">
                    <summary className="cursor-pointer">Stack Trace</summary>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
                      {this.state.error.stack}
                    </pre>
                  </details>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={this.handleRetry}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Coba Lagi
                </Button>
                <Button
                  onClick={this.handleReload}
                  variant="outline"
                  className="flex-1 border-slate-600 text-slate-300 hover:text-white"
                >
                  Muat Ulang
                </Button>
              </div>

              <div className="text-center">
                <p className="text-slate-500 text-xs">
                  Jika masalah terus berlanjut, hubungi administrator sistem.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
