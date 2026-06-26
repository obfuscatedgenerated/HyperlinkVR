import { LoaderCircle } from "lucide-react";

export const LoadingSpinner = ({className = ""}: {className?: string}) => (
    <LoaderCircle className={`animate-spin ${className}`} />
);

export const CenteredLoadingSpinner = ({className = ""}: {className?: string}) => (
    <div className="flex items-center justify-center w-full h-full">
        <LoadingSpinner className={className} />
    </div>
);
