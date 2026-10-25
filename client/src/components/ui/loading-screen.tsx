import { Loader2 } from "lucide-react";

interface LoadingScreenProps {
  text?: string;
}

export function LoadingScreen({ text = "Loading..." }: LoadingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <div className="flex flex-col items-center gap-4 p-8 rounded-lg">
        <Loader2 className="h-12 w-12 animate-spin text-brand" />
        <p className="text-brand text-lg font-medium animate-pulse">
          {text}
        </p>
      </div>
    </div>
  );
}
