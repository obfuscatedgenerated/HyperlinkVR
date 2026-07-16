import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

export const CanvasResizer = ({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) => {
    const { gl } = useThree();

    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;

            // need to temporarily disable xr if enabled
            const was_xr_enabled = gl.xr.enabled;
            gl.xr.enabled = false;

            gl.setSize(width, height);
            gl.domElement.style.width = `${width}px`;
            gl.domElement.style.height = `${height}px`;

            gl.xr.enabled = was_xr_enabled;
        });

        observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, [gl, containerRef]);

    return null;
};
