import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "./button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./card";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <Card className="w-full max-w-md border-red-200 shadow-lg">
            <CardHeader className="bg-red-50 border-b border-red-100 pb-4">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-6 w-6" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-gray-600 mb-4">
                An unexpected error occurred while rendering this page.
              </p>
              {this.state.error && (
                <div className="bg-gray-100 p-3 rounded-md text-xs font-mono overflow-auto max-h-40 mb-4">
                  <p className="font-bold mb-1">
                    {this.state.error.name}: {this.state.error.message}
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex gap-2 justify-end border-t pt-4">
              <Button variant="outline" onClick={this.handleClearCache}>
                Clear Cache & Reset
              </Button>
              <Button onClick={this.handleReload}>Reload Page</Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
