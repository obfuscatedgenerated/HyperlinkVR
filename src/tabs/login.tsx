import { useCallback, useEffect, useMemo, useState } from "react";

import { Storage } from "@plasmohq/storage";

import { useDebounce } from "~hooks/useDebounce";

const LandingPage = ({
    username,
    setUsername,
    actionable_methods,
    on_path_selected,
    method,
    error
}: {
    username: string;
    setUsername: (username: string) => void;
    actionable_methods: ActionableMethods;
    method: LoginMethod | null;
    on_path_selected: (method: LoginMethod, action: LoginAction) => void;
    error: string | null;
}) => {
    // if a method is already selected, only show the actions for that method
    const filtered_methods = useMemo(() => {
        if (method) {
            return {
                [method]: actionable_methods[method]
            };
        }

        return actionable_methods;
    }, [actionable_methods, method]);

    return (
        <>
            <h1>Login Window</h1>
            <input
                type="text"
                placeholder="user@host.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
            />
            {error && <p style={{ color: "red" }}>{error}</p>}
            <div>
                {Object.entries(filtered_methods).map(([method, actions]) => (
                    <div key={method}>
                        <h2>{method}</h2>
                        {actions.map((action) => (
                            <button
                                key={action}
                                onClick={() => on_path_selected(method as LoginMethod, action as LoginAction)}
                            >
                                {action}
                            </button>
                        ))}
                    </div>
                ))}
            </div>
        </>
    );
}

// TODO: type static record once determined. probably will learn zod for this, basing off JWK standard

interface FormProps {
    username: string;
    stored_key?: StoredKey | null;
    stored_static_record?: any | null;
}

const LoginFormStatic = ({ username }: FormProps) => {
    return <p>test</p>;
};

const LoginFormJWT = ({ username }: FormProps) => {
    return <p>Not implemented yet!</p>;
};

const SignupFormStaticManual = ({ username }: FormProps) => {
    return <p>test</p>;
};

const SignupFormStatic = ({ username }: FormProps) => {
    return <SignupFormStaticManual username={username} />;
};

const SignupFormJWT = ({ username }: FormProps) => {
    return <LoginFormJWT username={username} />;
};

const AUTH_METHODS = ["static", "jwt"] as const;
type LoginMethod = (typeof AUTH_METHODS)[number];

type LoginAction = "login" | "signup";

type FormGroup = Record<LoginMethod, React.FC<FormProps>>;

type Forms = Record<LoginAction, FormGroup>;

const FORMS: Forms = {
    login: {
        static: LoginFormStatic,
        jwt: LoginFormJWT
    },
    signup: {
        static: SignupFormStatic,
        jwt: SignupFormJWT
    }
};

interface StoredKey {
    method: LoginMethod;
    key: string;
}

interface Identity {
    name: string;
    host: string;
}

type ActionableMethods = Partial<Record<LoginMethod, LoginAction[]>>;

interface IdentityResolution {
    resolved: boolean;
    allowed: ActionableMethods;
}

// TODO: move auth stuff to common lib

const LoginWindow = () => {
    const [action, setAction] = useState<LoginAction | null>(null);
    const [method, setMethod] = useState<LoginMethod>(null);
    const [actionable_methods, setActionableMethods] =
        useState<ActionableMethods>({});

    const [username, setUsername] = useState("");
    const debounced_username = useDebounce(username, 500);

    const [stored_key, setStoredKey] = useState<StoredKey | null>(null);
    const [stored_static_record, setStoredStaticRecord] = useState<any | null>(
        null
    );

    const [error, setError] = useState<string | null>(null);

    const storage = useMemo(() => new Storage({ area: "local" }), []);

    const resolve_static_record = useCallback(
        async (identity: Identity): Promise<any | undefined | null> => {
            const static_record_response = await fetch(
                `https://${identity.host}/.well-known/vvr/auth/${identity.name}.json`
            );

            if (!static_record_response.ok) {
                if (static_record_response.status === 404) {
                    return undefined;
                } else {
                    setError(
                        `Failed to fetch static auth record: ${static_record_response.statusText}`
                    );
                    return null;
                }
            }

            // TODO: safe parse
            return await static_record_response.json();
        },
        []
    );

    const resolve_identity = useCallback(
        async (identity: Identity): Promise<IdentityResolution> => {
            setStoredKey(null);
            setStoredStaticRecord(null);

            // first, check if a local key already exists, which can be logged in immediately
            const stored_key = await storage.get<StoredKey>(
                `keystore:${identity.name}@${identity.host}`
            );

            if (stored_key) {
                setStoredKey(stored_key);

                return {
                    resolved: true,
                    allowed: {
                        [stored_key.method]: ["login"]
                    }
                };
            }

            // now reach out to the host to see what auth methods they support
            // TODO: handle host more safely
            const methods_response = await fetch(
                `https://${identity.host}/.well-known/vvr/auth-methods.json`
            );
            if (!methods_response.ok) {
                setError(
                    `Failed to fetch auth methods from host: ${methods_response.statusText}`
                );
                return {
                    resolved: false,
                    allowed: {}
                };
            }

            const methods_data = await methods_response.json();
            const methods = methods_data.methods as LoginMethod[];
            if (
                !methods ||
                !Array.isArray(methods) ||
                methods.length === 0 ||
                !methods.some((m) => AUTH_METHODS.includes(m))
            ) {
                setError(
                    `No supported auth methods found for host: ${identity.host}`
                );
                return {
                    resolved: false,
                    allowed: {}
                };
            }

            // if only one method is supported, select it automatically
            if (methods.length === 1) {
                // if the method is static, check for a static record first
                if (methods[0] === "static") {
                    const static_record = await resolve_static_record(identity);

                    if (static_record) {
                        setStoredStaticRecord(static_record);
                        return {
                            resolved: true,
                            allowed: {
                                static: ["login"]
                            }
                        };
                    } else if (static_record === null) {
                        // error fetching static record
                        return {
                            resolved: false,
                            allowed: {}
                        };
                    } else if (static_record === undefined) {
                        // doesnt exist so only offer signup
                        return {
                            resolved: true,
                            allowed: {
                                static: ["signup"]
                            }
                        };
                    }
                } else if (methods[0] === "jwt") {
                    // jwt doesnt distinguish login and signup
                    return {
                        resolved: true,
                        allowed: {
                            jwt: ["login"]
                        }
                    };
                }
            } else {
                // determine auth method by checking for a static record for the user
                const static_record = await resolve_static_record(identity);
                if (static_record) {
                    setStoredStaticRecord(static_record);

                    return {
                        resolved: true,
                        allowed: {
                            static: ["login"]
                        }
                    };
                } else if (static_record === null) {
                    // error fetching static record
                    return {
                        resolved: false,
                        allowed: {}
                    };
                } else if (static_record === undefined) {
                    // doesnt exist, offer static signup or jwt login/signup (same thing)
                    return {
                        resolved: true,
                        allowed: {
                            static: ["signup"],
                            jwt: ["login"]
                        }
                    };
                }
            }
        },
        [storage]
    );

    const parse_identity = useCallback((username: string): Identity | null => {
        // parse username into identity
        const parts = username.split("@");
        if (parts.length !== 2) {
            setError("Invalid username format. Use name@host.com");
            return null;
        }

        const [name, host] = parts;
        if (!name || !host) {
            setError("Invalid username format. Use name@host.com");
            return null;
        }

        return { name, host };
    }, []);

    // when debounced username changes, resolve identity and present actions
    useEffect(() => {
        if (!debounced_username) {
            setActionableMethods({});
            setAction(null);
            setMethod(null);
            return;
        }

        const identity = parse_identity(debounced_username);
        if (!identity) {
            setActionableMethods({});
            setAction(null);
            setMethod(null);
            return;
        }

        resolve_identity(identity).then((result) => {
            if (!result.resolved) {
                setActionableMethods({});
                setAction(null);
                setMethod(null);
                return;
            }

            setActionableMethods(result.allowed);

            // if only one method is allowed, autoselect it
            const allowed_methods = Object.keys(
                result.allowed
            ) as LoginMethod[];
            let local_method: LoginMethod | null = null;
            if (allowed_methods.length === 1) {
                local_method = allowed_methods[0];
            } else {
                local_method = null;
            }
            setMethod(local_method);

            // // if only one action is allowed for the selected method, autoselect it
            // if (local_method) {
            //     const allowed_actions = result.allowed[local_method];
            //     if (allowed_actions.length === 1) {
            //         setAction(allowed_actions[0]);
            //     } else {
            //         setAction(null);
            //     }
            // } else {
            //     setAction(null);
            // }
        });
    }, [debounced_username, parse_identity, resolve_identity]);

    const FormComponent = useMemo(() => {
        if (!action || !method) {
            return null;
        }

        return FORMS[action][method];
    }, [action, method]);

    const on_path_selected = useCallback(
        (selected_method: LoginMethod, selected_action: LoginAction) => {
            setMethod(selected_method);
            setAction(selected_action);
        },
        []
    );

    return (
        <div>
            {FormComponent ? (
                <FormComponent username={username} stored_key={stored_key} stored_static_record={stored_static_record} />
            ) : (
                <LandingPage
                    username={username}
                    setUsername={setUsername}
                    actionable_methods={actionable_methods}
                    method={method}
                    on_path_selected={on_path_selected}
                    error={error}
                />
            )}
        </div>
    );
};

export default LoginWindow;
