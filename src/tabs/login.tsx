import { useCallback, useEffect, useMemo, useState } from "react";

import { Storage } from "@plasmohq/storage";

import { useDebounce } from "~hooks/useDebounce";
import {
    parse_identity,
    resolve_identity,
    type ActionableMethods,
    type Identity,
    type LoginAction,
    type LoginMethod,
    type StoredKey
} from "~lib/auth";

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
                                onClick={() =>
                                    on_path_selected(
                                        method as LoginMethod,
                                        action as LoginAction
                                    )
                                }>
                                {action}
                            </button>
                        ))}
                    </div>
                ))}
            </div>
        </>
    );
};

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

    const do_resolve_identity = useCallback(
        (identity: Identity) => {
            return resolve_identity(identity, storage);
        },
        [storage]
    );

    // when debounced username changes, resolve identity and present actions
    useEffect(() => {
        if (!debounced_username) {
            setActionableMethods({});
            setAction(null);
            setMethod(null);
            return;
        }

        const identity_parse = parse_identity(debounced_username);
        if (identity_parse.success === false) {
            setError(identity_parse.error);
            setActionableMethods({});
            setAction(null);
            setMethod(null);
            return;
        }

        do_resolve_identity(identity_parse.identity).then((result) => {
            if (result.resolved === false) {
                setError(result.error || "Failed to resolve identity");
                setActionableMethods({});
                setAction(null);
                setMethod(null);
                return;
            }

            setActionableMethods(result.allowed);
            setStoredKey(result.stored_key || null);
            setStoredStaticRecord(result.static_record || null);
            setError(null);

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
    }, [debounced_username, parse_identity, do_resolve_identity]);

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
                <FormComponent
                    username={username}
                    stored_key={stored_key}
                    stored_static_record={stored_static_record}
                />
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
