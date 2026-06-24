import { LoaderCircle } from "lucide-react";

export const LoadingSpinner = ({className = ""}: {className?: string}) => (
    <LoaderCircle className={`animate-spin ${className}`} />
);
