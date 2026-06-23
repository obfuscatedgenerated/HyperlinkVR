import { TAB_ID } from "~util/tab_id";
import { useEffect } from "react";

export const useTabSession = () => {
    // listen for tab close
    useEffect(() => {
       const handle_message = (msg: any) => {
           if (msg.type === "VVR_TAB_CLOSED" && msg.tab === TAB_ID) {
               // just close for now as tab hopping isnt yet implemented
               window.close();
           }
       }

       chrome.runtime.onMessage.addListener(handle_message);
       return () => chrome.runtime.onMessage.removeListener(handle_message);
    });

    return null;
}
