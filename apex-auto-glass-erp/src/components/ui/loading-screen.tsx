import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
    message?: string;
    fullScreen?: boolean;
    maxDuration?: number; // Duração máxima em ms antes de mostrar aviso
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
    message = "Carregando informações...",
    fullScreen = true,
    maxDuration = 10000 // 10 segundos
}) => {
    const [showWarning, setShowWarning] = useState(false);
    
    useEffect(() => {
        // Mostrar aviso se loading demorar muito
        const warningTimeout = setTimeout(() => {
            setShowWarning(true);
        }, maxDuration);
        
        return () => clearTimeout(warningTimeout);
    }, [maxDuration]);
    
    const containerClasses = fullScreen
        ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm transition-all duration-300"
        : "flex flex-col items-center justify-center p-8 w-full h-full min-h-[200px]";

    return (
        <div className={containerClasses}>
            <div className="flex flex-col items-center justify-center gap-4 animate-in fade-in zoom-in duration-300">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                    <Loader2 className="h-12 w-12 animate-spin text-primary relative z-10" />
                </div>
                <p className="text-muted-foreground text-sm font-medium animate-pulse">
                    {message}
                </p>
                {showWarning && (
                    <p className="text-destructive text-xs mt-2 animate-pulse">
                        Carregamento demorado. Se persistir, recarregue a página.
                    </p>
                )}
            </div>
        </div>
    );
};
