import { createContext, useContext } from "react";
import { Storage } from "@plasmohq/storage";
import { useStorage } from "@plasmohq/storage/hook";
import type { AuthSession } from "~lib/auth";

const AuthSessionContext = createContext<AuthSession | null>(null);

export const AuthSessionProvider = ({ children }: { children: React.ReactNode; }) => {
    const [auth_session, setAuthSession] = useStorage<AuthSession | null>({
        key: "auth_session",
        instance: new Storage({ area: "local" }),
    }, null);

    return (
        <AuthSessionContext.Provider value={auth_session}>
            {children}
        </AuthSessionContext.Provider>
    );
}

export const useAuthSession = () => {
    const auth_session = useContext(AuthSessionContext);
    if (auth_session === undefined) {
        throw new Error("useAuthSession must be used within an AuthSessionProvider");
    }
    return auth_session;
}
