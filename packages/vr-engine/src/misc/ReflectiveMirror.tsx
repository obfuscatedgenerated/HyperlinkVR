import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { PlaneGeometry, Vector3 } from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector";



import { compute_layer_mask, Layer } from "../render";

const RENDER_RES_WIDTH = 2048;
const RENDER_RES_HEIGHT = 2048;

export const ReflectiveMirror = ({
    width,
    height,
    tint_color = 0xffffff,
    position,
    rotation
}: {
    width: number;
    height: number;
    tint_color?: number;
    position: Vector3 | [number, number, number];
    rotation: Vector3 | [number, number, number];
}) => {
    const reflector = useMemo(() => {
        const geo = new PlaneGeometry(width, height);
        return new Reflector(geo, {
            textureWidth: RENDER_RES_WIDTH,
            textureHeight: RENDER_RES_HEIGHT,
            color: tint_color
        });
    }, [width, height, tint_color]);

    // dispose GPU resources when the reflector is replaced or unmounted
    useEffect(() => () => reflector.dispose(), [reflector]);

    const layer_mask = useMemo(
        () =>
            compute_layer_mask([
                Layer.Default,
                Layer.PlayerModel_Head,
                Layer.PlayerModel_TorsoAndHands
            ]),
        []
    );

    useFrame(({ camera, gl }) => {
        const cameras = gl.xr.isPresenting
            ? gl.xr.getCamera().cameras
            : [camera];
        for (const cam of cameras) {
            reflector.getReflectionCamera(cam).layers.mask = layer_mask;
        }
    });

    return (
        <primitive object={reflector} position={position} rotation={rotation} />
    );
};