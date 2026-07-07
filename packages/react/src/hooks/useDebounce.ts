import { useEffect, useState, useRef } from "react";

export const useDebounce = <T = any>(value: T, delay: number, leading_edge = false) => {
    const [debounced, setDebounced] = useState(value);

    const cooldown = useRef(false);

    useEffect(() => {
        if (leading_edge && !cooldown.current) {
            setDebounced(value);
        }

        cooldown.current = true;

        const timeout = setTimeout(() => {
            cooldown.current = false;
            setDebounced(value);
        }, delay);

        return () => {
            clearTimeout(timeout);
        };
    }, [value, delay, leading_edge]);

    return debounced;
};
