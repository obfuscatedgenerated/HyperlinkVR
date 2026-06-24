export const ContextProviders = ({ children, providers }: { children: React.ReactNode; providers: React.ComponentType<{children: React.ReactNode}>[] }) => {
    return providers.reduceRight((acc, Provider) => {
        return <Provider>{acc}</Provider>;
    }, children);
};
