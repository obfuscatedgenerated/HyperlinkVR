import { useFrame } from "@react-three/fiber";
import {
    PointerCursorModel,
    PointerRayModel,
    useRayPointer
} from "@react-three/xr";
import {
    createContext,
    useContext,
    useRef,
    type ReactNode,
    type RefObject
} from "react";
import type { Object3D } from "three";

export interface ButtonState {
    pressed: boolean;
    just_pressed: boolean;
    just_released: boolean;
}

export const make_button_state = (): ButtonState => ({
    pressed: false,
    just_pressed: false,
    just_released: false
});

export const update_button_state = (b: ButtonState, pressed: boolean) => {
    b.just_pressed = pressed && !b.pressed;
    b.just_released = !pressed && b.pressed;
    b.pressed = pressed;
};

export type HandPose =
    | { kind: "curl"; amount: number }
    | { kind: "gesture"; name: string };

export interface Hand {
    readonly handedness: "left" | "right";
    readonly grip: RefObject<Object3D | null>;
    readonly ray: RefObject<Object3D | null>;
    readonly grab: ButtonState;
    readonly trigger: ButtonState;
    readonly pose: RefObject<HandPose>;
}

const HandsContext = createContext<RefObject<Hand[]> | null>(null);

export const HandsProvider = ({ children }: { children: ReactNode }) => {
    const hands_ref = useRef<Hand[]>([]);
    return (
        <HandsContext.Provider value={hands_ref}>
            {children}
        </HandsContext.Provider>
    );
};

// we use publishing to context as there is a unique issue:
// hands in xr are added by the store to the <XR> component, yet we need to be in the <XR> component to use the XR hooks
// therefore this defers the setting of the context while still wrapping it all
export const usePublishHands = (): RefObject<Hand[]> => {
    const ref = useContext(HandsContext);
    if (ref === null)
        throw new Error("usePublishHands must be used within a HandsProvider");
    return ref;
};

export const useHands = (): Hand[] => {
    const ref = useContext(HandsContext);
    if (ref === null)
        throw new Error("useHands must be used within a HandsProvider");
    return ref.current;
};

export const HandPointer = ({ hand, state }: { hand: Hand; state: any }) => {
    const pointer = useRayPointer(hand.ray, state);
    useFrame(() => {
        if (hand.trigger.just_pressed) {
            pointer.down({ timeStamp: performance.now(), button: 0 });
        } else if (hand.trigger.just_released) {
            pointer.up({ timeStamp: performance.now(), button: 0 });
        }
    });
    return (
        <>
            <PointerRayModel pointer={pointer} />
            <PointerCursorModel pointer={pointer} />
        </>
    );
};

