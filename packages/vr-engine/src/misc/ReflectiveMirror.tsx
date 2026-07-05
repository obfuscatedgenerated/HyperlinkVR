import { useFrame } from "@react-three/fiber";
import { ComponentProps, useEffect, useMemo } from "react";
import { Camera, PlaneGeometry, Vector3 } from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector";



import { compute_layer_mask, Layer } from "../render";

const RENDER_RES_WIDTH = 2048;
const RENDER_RES_HEIGHT = 2048;

interface ReflectiveMirrorProps extends Omit<ComponentProps<"primitive">, "object"> {
    width: number;
    height: number;
    tint_color?: number;
}

export const ReflectiveMirror = ({
    width,
    height,
    tint_color = 0xcccccc,
    ...rest
}: ReflectiveMirrorProps) => {
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

    useFrame(({ camera, gl, scene }) => {
        // set both xr cameras to have the right layers masked (i.e. show head even though they cant see it through the headset)
        const cameras = gl.xr.isPresenting
            ? gl.xr.getCamera().cameras
            : [camera];
        for (const cam of cameras) {
            reflector.getReflectionCamera(cam).layers.mask = layer_mask;
        }

        // iterate remaining scene cameras for spectator cameras and do the same (TODO: handle MR exclusions)
        // TODO: how performant are these passes? should we only do this when the scene changes or when a new camera is added? (if so how?)
        // TODO: also this totally contains the arraycamera already, so the logic before is a touch redundant
        const scene_cameras = scene.getObjectsByProperty("isCamera", true);
        for (const cam of scene_cameras) {
            if (cam.userData.is_spectator_camera) {
                reflector.getReflectionCamera(cam as Camera).layers.mask = layer_mask;
            }
        }
    });

    return (
        <primitive object={reflector} {...rest} />
    );
};
