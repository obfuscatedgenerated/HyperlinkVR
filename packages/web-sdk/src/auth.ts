import {send} from "./messenger";

export const query = () => {
    send({action: "SDK_AUTH_QUERY"});
}
