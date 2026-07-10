import {createContext, useContext} from "react";
import {AudioListener} from "three";

const AudioListenerContext = createContext<AudioListener | null>(null);
export const AudioListenerProvider = ({ listener, children }: { listener?: AudioListener; children: React.ReactNode }) => {
    listener = listener ?? new AudioListener();
    return (
        <AudioListenerContext.Provider value={listener}>
            {children}
        </AudioListenerContext.Provider>
    );
}

export const useAudioListener = () => {
    const listener = useContext(AudioListenerContext);
    if (!listener) {
        throw new Error("useAudioListener must be used within an AudioListenerProvider");
    }
    return listener;
}
