import {createContext, useContext, useLayoutEffect, useRef, useState} from "react";
import { useThree } from "@react-three/fiber";
import { Container, type ContainerProperties } from "@react-three/uikit";

interface FadeLayer {
    key: React.Key;
    node: React.ReactNode;
}

interface CrossfaderProps extends Omit<ContainerProperties, "children"> {
    content_key: React.Key;
    children: React.ReactNode;
    duration?: number;
}

const CrossfadeOpacityContext = createContext(1);

export const useCrossfadeOpacity = () => useContext(CrossfadeOpacityContext);

export const Crossfader = ({ content_key, children, duration = 300, ...container_props }: CrossfaderProps) => {
    const [fade, setFade] = useState<{ key: React.Key; previous: FadeLayer | null }>({
        key: content_key,
        previous: null,
    });

    const [progress, setProgress] = useState(1);

    const committed_ref = useRef<FadeLayer>({ key: content_key, node: children });
    const frame_ref = useRef<number | null>(null);

    const invalidate = useThree((state) => state.invalidate);

    if (content_key !== fade.key) {
        setFade({ key: content_key, previous: committed_ref.current });
        setProgress(0);
    }

    useLayoutEffect(() => {
        committed_ref.current = { key: content_key, node: children };
    });

    const previous_key = fade.previous?.key ?? null;

    useLayoutEffect(() => {
        if (previous_key == null) return;

        const started_at = performance.now();
        const total = Math.max(duration, 1);

        const step = () => {
            const elapsed = performance.now() - started_at;
            const next = Math.min(1, elapsed / total);

            setProgress(next);
            invalidate();

            if (next < 1) {
                frame_ref.current = requestAnimationFrame(step);
                return;
            }

            setFade((current_fade) =>
                current_fade.previous == null
                    ? current_fade
                    : { key: current_fade.key, previous: null },
            );
        };

        frame_ref.current = requestAnimationFrame(step);

        return () => {
            if (frame_ref.current != null) cancelAnimationFrame(frame_ref.current);
        };
    }, [previous_key, duration, invalidate]);

    return (
        <Container positionType="relative" {...container_props}>
            <CrossfadeOpacityContext.Provider value={progress}>
                <Container key={content_key} opacity={progress} flexGrow={1}>
                    {children}
                </Container>
            </CrossfadeOpacityContext.Provider>

            {fade.previous != null && (
                <CrossfadeOpacityContext.Provider value={1 - progress}>
                    <Container
                        key={fade.previous.key}
                        opacity={1 - progress}
                        positionType="absolute"
                        positionTop={0}
                        positionLeft={0}
                        pointerEvents="none"
                    >
                        {fade.previous.node}
                    </Container>
                </CrossfadeOpacityContext.Provider>
            )}
        </Container>
    );
};
