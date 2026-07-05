import { useEffect, useState } from "react";

export const useDebounce = <T = any>(value: T, delay: number) => {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebounced(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debounced;
};
