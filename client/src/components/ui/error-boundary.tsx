import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "./button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./card";
import { recoverPageLoad } from '@/lib/page-recovery';

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
    recoverPageLoad(error);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleHome = () => {
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
                <CardTitle>Хуудас ачаалж чадсангүй</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-gray-600 mb-4">
                Хуудас ачаалахад алдаа гарлаа. Интернэт холболтоо шалгаад дахин оролдоно уу.
              </p>
              <p className="text-sm text-gray-500">Таны сагс болон нэвтрэх мэдээллийг устгахгүй.</p>
            </CardContent>
            <CardFooter className="flex gap-2 justify-end border-t pt-4">
              <Button variant="outline" onClick={this.handleHome}>
                Нүүр хуудас
              </Button>
              <Button onClick={this.handleReload}>Дахин ачаалах</Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
