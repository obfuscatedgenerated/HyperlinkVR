import { useSetting } from "@hyperlinkvr/react";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import {
    BoxHelper,
    CanvasTexture,
    Color,
    Group,
    PointLight,
    PointLightHelper,
    Sprite,
    SpriteMaterial,
    Vector3
} from "three";

const PointLightHelpers = () => {
    const scene = useThree((s) => s.scene);
    const helpers = useRef(new Map<PointLight, PointLightHelper>());

    useFrame(() => {
        const seen = new Set<PointLight>();

        scene.traverse((obj) => {
            if ((obj as PointLight).isPointLight) {
                const light = obj as PointLight;
                seen.add(light);
                let helper = helpers.current.get(light);
                if (!helper) {
                    helper = new PointLightHelper(light, 0.25, 0xffff00);
                    scene.add(helper);
                    helpers.current.set(light, helper);
                }
                helper.update();
            }
        });

        // remove helpers for lights that vanished
        for (const [light, helper] of helpers.current) {
            if (!seen.has(light)) {
                scene.remove(helper);
                helper.dispose();
                helpers.current.delete(light);
            }
        }
    });

    useEffect(() => {
        const map = helpers.current;
        return () => {
            for (const [, helper] of map) {
                helper.parent?.remove(helper);
                helper.dispose();
            }
            map.clear();
        };
    }, []);

    return null;
};


const LABEL_SCALE = 0.00025;
const LABEL_OPACITY = 0.4;
const make_label = (text: string): Sprite => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    const font_size = 48;
    const padding = 16;
    ctx.font = `${font_size}px sans-serif`;

    const text_width = ctx.measureText(text).width;
    canvas.width = text_width + padding * 2;
    canvas.height = font_size + padding * 2;

    // re-apply after resize (resizing clears the context)
    ctx.font = `${font_size}px sans-serif`;
    ctx.textBaseline = "middle";

    ctx.fillStyle = `rgba(0, 0, 0, ${LABEL_OPACITY})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#00ffff";
    ctx.fillText(text, padding, canvas.height / 2);

    const texture = new CanvasTexture(canvas);
    const material = new SpriteMaterial({
        map: texture,
        depthTest: false, // draw on top so it's readable through geometry
        transparent: true
    });

    const sprite = new Sprite(material);
    sprite.scale.set(canvas.width * LABEL_SCALE, canvas.height * LABEL_SCALE, 1);
    sprite.renderOrder = 999;
    return sprite;
};

type GroupDebug = { box: BoxHelper; label: Sprite };

const GroupHelpers = () => {
    const scene = useThree((s) => s.scene);
    const helpers = useRef(new Map<Group, GroupDebug>());
    const world_pos = useRef(new Vector3());

    useFrame(() => {
        const seen = new Set<Group>();

        scene.traverse((obj) => {
            if ((obj as Group).isGroup && !(obj as any).__debugHelper) {
                const group = obj as Group;
                seen.add(group);

                let entry = helpers.current.get(group);
                if (!entry) {
                    const box = new BoxHelper(group, new Color(0x00ffff));
                    (box as any).__debugHelper = true;

                    const label = make_label(group.name || "(unnamed group)");
                    (label as any).__debugHelper = true;

                    scene.add(box);
                    scene.add(label);
                    entry = { box, label };
                    helpers.current.set(group, entry);
                }

                entry.box.update();
                // park the label at the group's world position
                group.getWorldPosition(world_pos.current);
                entry.label.position.copy(world_pos.current);
            }
        });

        for (const [group, entry] of helpers.current) {
            if (!seen.has(group)) {
                scene.remove(entry.box);
                scene.remove(entry.label);
                entry.box.dispose();
                entry.label.material.map?.dispose();
                entry.label.material.dispose();
                helpers.current.delete(group);
            }
        }
    });

    useEffect(() => {
        const map = helpers.current;
        return () => {
            for (const [, entry] of map) {
                entry.box.parent?.remove(entry.box);
                entry.label.parent?.remove(entry.label);
                entry.box.dispose();
                entry.label.material.map?.dispose();
                entry.label.material.dispose();
            }
            map.clear();
        };
    }, []);

    return null;
};

export const SceneDebug = () => {
    const [show_lights] = useSetting("debug_lights");
    const [show_groups] = useSetting("debug_groups");

    return (
        <>
            {show_lights && <PointLightHelpers />}
            {show_groups && <GroupHelpers />}
        </>
    );
};
