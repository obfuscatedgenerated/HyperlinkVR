import { ExtensionStorage } from "@viewportvr/platform-extension";
import { StorageEnginesProvider } from "@viewportvr/react";
import { useMemo } from "react";

const LoginUI = () => {
    const local_storage = useMemo(() => new ExtensionStorage("local"), []);

    return (
        <StorageEnginesProvider engines={{ local: local_storage }}>
            <LoginUI />
        </StorageEnginesProvider>
    );
};
