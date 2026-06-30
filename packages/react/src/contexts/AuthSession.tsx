import { createContext, useContext } from "react";

import { useStorage } from "../hooks";

import type { AuthSession } from "@hyperlinkvr/auth";

const AuthSessionContext = createContext<AuthSession | null>(null);

// TODO: offer a function to sign data (and not the key itself ideally, but then again it could be accessed, need to limit what games see at some point)

export const AuthSessionProvider = ({
    children
}: {
    children: React.ReactNode;
}) => {
    const [auth_session] = useStorage<AuthSession | null>(
        "local",
        "auth_session",
        null
    );

    return (
        <AuthSessionContext.Provider value={auth_session}>
            {children}
        </AuthSessionContext.Provider>
    );
};

export const useAuthSession = () => {
    const auth_session = useContext(AuthSessionContext);
    if (auth_session === undefined) {
        throw new Error(
            "useAuthSession must be used within an AuthSessionProvider"
        );
    }
    return auth_session;
};
