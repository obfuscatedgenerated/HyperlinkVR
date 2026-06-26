import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

export const CanvasResizer = ({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) => {
    // We only need 'gl' to force the canvas pixel dimensions
    const { gl } = useThree();

    console.log("ManualResizer mounted, containerRef:", containerRef);
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;

            gl.setSize(width, height);
            gl.domElement.style.width = `${width}px`;
            gl.domElement.style.height = `${height}px`;
        });

        observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, [gl, containerRef]);

    return null;
};
