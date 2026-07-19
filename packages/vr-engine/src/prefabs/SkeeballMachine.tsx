import {ObjectPhysics} from "../engine/ObjectPhysics";
import {Text, useGLTF} from "@react-three/drei";
import {Grabbable} from "../interaction";
import {ComponentType, RefObject, useCallback, useEffect, useImperativeHandle, useRef, useState} from "react";
import {resolve_interacted, TriggerVolume} from "../interaction/TriggerVolume";
import {create_object_refs, ObjectRefsContextType, ObjectRefsProvider} from "../contexts";
import {Group, Vector3} from "three";

const MACHINE_URL = new URL("../../assets/prefabs/skeeball/machine.glb", import.meta.url).href;
const BALL_URL = new URL("../../assets/prefabs/skeeball/ball.glb", import.meta.url).href;

interface BallHandle {
    respawn: (position_override?: [number, number, number]) => void;
}

interface BallProps {
    machine_id: string;
    machine_ref: RefObject<Group | null>;
    id: string;
    initial_position: [number, number, number];
    handle: RefObject<BallHandle>;
}

const Ball = ({machine_id, machine_ref, id, initial_position, handle}: BallProps) => {
    const {scene} = useGLTF(BALL_URL);
    const instance = scene.clone(true);

    const object_refs = useRef<ObjectRefsContextType>(create_object_refs(""));

    const respawn = useCallback(
        (position_override?: [number, number, number], world_space = false) => {
            const new_position = position_override ?? initial_position;

            const pos_vec = new Vector3(new_position[0], new_position[1], new_position[2]);

            if (!world_space) {
                if (!machine_ref.current) {
                    console.warn("respawn called before machine_ref was set, using world space instead");
                    return;
                }

                // convert to world space
                machine_ref.current.localToWorld(pos_vec);
            }

            object_refs.current.rigid_body.current?.setLinvel({x: 0, y: 0, z: 0}, false);
            object_refs.current.rigid_body.current?.setAngvel({x: 0, y: 0, z: 0}, false);
            object_refs.current.rigid_body.current?.setTranslation(pos_vec, true);
        },
        [initial_position]
    );

    useImperativeHandle(handle, () => ({
        respawn
    }), [respawn]);

    return (
        <ObjectRefsProvider value={object_refs.current}>
            <group userData={{object_id: `SKEEBALL-${id}`, tags: ["skeeball_ball", `skeeball-${machine_id}`]}}>
                <ObjectPhysics
                    physics={{
                        rigid_body: {
                            type: "dynamic",

                            collider: {
                                type: "sphere",
                                radius: 0.0381
                            },

                            restitution: 0.2,
                            friction: 0.4,
                            mass: 0.2,

                            ccd: true
                        }
                    }}
                    transform={{position: initial_position, rotation: [0, 0, 0], scale: [1, 1, 1]}}
                >
                    <Grabbable>
                        <primitive object={instance}/>
                    </Grabbable>
                </ObjectPhysics>
            </group>
        </ObjectRefsProvider>
    );
}

const SPAWN_OFFSET = [0.4, 0.325, 1.875] as [number, number, number];

export const SkeeballMachine = () => {
    const {scene} = useGLTF(MACHINE_URL);
    const instance = scene.clone(true);

    const [playing, setPlaying] = useState(false);
    const [balls_remaining, setBallsRemaining] = useState(9);
    const [score, setScore] = useState(0);

    // they have 9 balls, but we only spawn 3 at a time (just like how a real machine might recycle ball for a play session)
    const ball_handles = useRef(new Map<string, RefObject<BallHandle>>);
    const [ball_ids, setBallIDs] = useState<string[]>([]);

    // internal ref to track remaining balls instantaneously
    const balls_remaining_ref = useRef(balls_remaining);

    const machine_id = useRef(crypto.randomUUID()).current;
    const machine_ref = useRef<Group>(null);

    const spawn_ball = useCallback(
        () => {
            if (ball_handles.current.size >= 3) return;

            const new_ball_id = crypto.randomUUID();
            const new_ball_handle: RefObject<BallHandle> = {current: null as any};

            ball_handles.current.set(new_ball_id, new_ball_handle);
            setBallIDs(prev => [...prev, new_ball_id]);
        },
        []
    );

    const respawn_ball = useCallback(
        (id: string) => {
            if (balls_remaining_ref.current <= 3) return;

            const ball_handle = ball_handles.current.get(id)?.current;
            if (!ball_handle) return;

            ball_handle.respawn();
        },
        []
    );

    const cleanup = useCallback(
        () => {
            ball_handles.current.clear();
            setBallIDs([]);
        },
        []
    );

    const ball_scored = useCallback(
        (id: string, points: number) => {
            if (points !== 0) {
                setScore(prev => prev + points);
            }

            setBallsRemaining(prev => prev - 1);
            balls_remaining_ref.current -= 1;

            if (balls_remaining_ref.current <= 0) {
                // game over
                setPlaying(false);
            } else if (balls_remaining_ref.current > 3) {
                respawn_ball(id);
            } else {
                // remove the ball from the machine
                ball_handles.current.delete(id);
                setBallIDs(prev => prev.filter(ball_id => ball_id !== id));
            }
        },
        [respawn_ball]
    );

    // when the game starts, spawn 3 balls with a slight stagger to allow them to roll naturally
    useEffect(() => {
        if (!playing) return;

        cleanup();
        setBallsRemaining(9);
        balls_remaining_ref.current = 9;
        setScore(0);

        spawn_ball();
        const spawn_interval = setInterval(() => {
            if (ball_handles.current.size >= 3) {
                clearInterval(spawn_interval);
                return;
            }

            spawn_ball();
        }, 1000);

        return () => {
            clearInterval(spawn_interval);
        };
    }, [playing, spawn_ball]);

    return (
        <group ref={machine_ref}>
            {/* clickable start text TODO improve this */}
            {!playing && (
                <Text
                    position={[0, 1.5, 1.5]}
                    fontSize={0.4}
                    color={"white"}
                    onPointerDown={() => {
                        setPlaying(true);
                    }}
                >
                    Start
                </Text>
            )}

            {/* machine body */}
            <ObjectPhysics physics={{
                rigid_body: {
                    type: "fixed",

                    collider: {
                        type: "auto",
                        approximation: "trimesh"
                    },

                    restitution: 0.1,
                    friction: 0.7,
                }
            }}>
                <primitive object={instance}/>
            </ObjectPhysics>

            {/* spawn stored balls */}
            {ball_ids.map((id) => (
                <Ball
                    key={id}
                    machine_id={machine_id}
                    machine_ref={machine_ref}
                    id={id}
                    initial_position={SPAWN_OFFSET}
                    handle={ball_handles.current.get(id)!}
                />
            ))}

            {/* trigger volume to find balls that go out of bounds on exit */}
            <TriggerVolume
                collider={{
                    type: "box",
                    size: [2, 3, 6],
                    offset: [0, 1.5, 1.5]
                }}

                on_exit={(payload) => {
                    // check if a ball from our machine was what exited
                    const interacted = resolve_interacted(payload, {
                        ignore_torso: true,
                        ignore_head: true,
                        ignore_hands: true,
                        objects: {
                            include: true,
                            tag_filter: [`skeeball-${machine_id}`]
                        }
                    });

                    if (!interacted || interacted.type !== "object") return;

                    // respawn the ball that exited for free
                    respawn_ball(interacted.object_id.replace("SKEEBALL-", ""));
                }}
            />

            {/* TODO: trigger volumes for the actual scoring */}
        </group>
    );
}
