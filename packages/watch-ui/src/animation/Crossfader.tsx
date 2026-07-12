import { createContext, useContext, useLayoutEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { Container, type ContainerProperties } from "@react-three/uikit";
const CrossfadeOpacityContext = createContext(1);

export const useCrossfadeOpacity = () => useContext(CrossfadeOpacityContext);

interface FadeLayer {
    key: React.Key;
    node: React.ReactNode;
}

interface CrossfaderProps extends Omit<ContainerProperties, "children" | "fill"> {
    content_key: React.Key;
    children: React.ReactNode;
    duration?: number;
    fill?: boolean;
}

export const Crossfader = ({ content_key, children, fill, duration = 300, ...container_props }: CrossfaderProps) => {
    const {
        flexDirection,
        alignItems,
        justifyContent,
        gap,
        padding,
        paddingX,
        paddingY,
        paddingTop,
        paddingBottom,
        paddingLeft,
        paddingRight,
        ...root_props
    } = container_props;

    const layer_layout = {
        flexDirection,
        alignItems,
        justifyContent,
        gap,
        padding,
        paddingX,
        paddingY,
        paddingTop,
        paddingBottom,
        paddingLeft,
        paddingRight,
    };

    const should_fill = fill ?? (root_props.width != null && root_props.height != null);

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

    const live_box = should_fill ? { width: "100%" as const, height: "100%" as const } : {};

    const ghost_box = should_fill
        ? { positionTop: 0, positionLeft: 0, positionRight: 0, positionBottom: 0 }
        : { positionTop: 0, positionLeft: 0 };

    const ghost_opacity = 1 - progress;

    return (
        <Container positionType="relative" {...root_props}>
            <CrossfadeOpacityContext.Provider value={progress}>
                <Container
                    key={content_key}
                    opacity={progress}
                    flexGrow={1}
                    {...live_box}
                    {...layer_layout}
                >
                    {children}
                </Container>
            </CrossfadeOpacityContext.Provider>

            {fade.previous != null && (
                <CrossfadeOpacityContext.Provider value={ghost_opacity}>
                    <Container
                        key={fade.previous.key}
                        opacity={ghost_opacity}
                        positionType="absolute"
                        pointerEvents="none"
                        {...ghost_box}
                        {...layer_layout}
                    >
                        {fade.previous.node}
                    </Container>
                </CrossfadeOpacityContext.Provider>
            )}
        </Container>
    );
};

// TODO: re-export uikit-default components except they respect useCrossfadeOpacity automatically
// TODO: render spam. is it avoidable? does uikit already provide a way to fade out without using loads of state? maybe can memoise if not?
