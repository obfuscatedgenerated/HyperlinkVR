export type WindowIntent =
    "LOGIN" |
    "DEVTOOLS" |
    "DEVTOOLS_FORM" |
    "DEVTOOLS_WATCH_UI";
// TODO: finish

// TODO: type per intent
export type WindowArguments = Record<string, any>;

export interface WindowArgumentsStrategy<S> {
    retrieve(): S;

    serialise(args: WindowArguments): S;
    deserialise(serialised: S): WindowArguments;
}
