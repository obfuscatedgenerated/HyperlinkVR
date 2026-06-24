import type { WindowArgumentsStrategy } from "@viewportvr/core";
import { useMemo, createContext, useContext } from "react";

export type WindowArgumentsStrategyContextType = WindowArgumentsStrategy<unknown> | null;

const WindowArgumentsStrategyContext = createContext<WindowArgumentsStrategyContextType>(null);

export const WindowArgumentsStrategyProvider = ({
    strategy,
    children
}: {
    strategy: WindowArgumentsStrategy<unknown>;
    children: React.ReactNode;
}) => {
    return (
        <WindowArgumentsStrategyContext.Provider value={strategy}>
            {children}
        </WindowArgumentsStrategyContext.Provider>
    );
}

export const useWindowArgumentsStrategy = () => {
    const strategy = useContext(WindowArgumentsStrategyContext);
    if (!strategy) {
        throw new Error("useWindowArgumentsStrategy must be used within a WindowArgumentsStrategyProvider");
    }
    return strategy;
}

export const useWindowArgumentsWithStrategy = (strategy: WindowArgumentsStrategy<unknown>) => {
    return useMemo(() => {
        const serialised = strategy.retrieve();
        return strategy.deserialise(serialised);
    }, [strategy]);
}

export const useWindowArguments = () => {
    const strategy = useWindowArgumentsStrategy();
    return useWindowArgumentsWithStrategy(strategy);
}
