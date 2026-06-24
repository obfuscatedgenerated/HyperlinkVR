import type { WindowArguments, WindowArgumentsStrategy } from "@viewportvr/core";

export class BrowserWindowArgumentsStrategy implements WindowArgumentsStrategy<string> {
    retrieve(): string {
        return window.location.search.substring(1);
    }
    
    serialise(args: WindowArguments): string {
        return new URLSearchParams(args).toString();
    }
    
    deserialise(serialised: string): WindowArguments {
        const params = new URLSearchParams(serialised);
        const args: WindowArguments = {};
        params.forEach((value, key) => {
            args[key] = value;
        });
        return args;
    }
}
