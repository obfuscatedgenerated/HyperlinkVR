import {useLayoutEffect, useRef} from "react"
import {useFrame} from "@react-three/fiber"

import {useSetting} from "@hyperlinkvr/react";
import {usePlayerOrigin} from "../contexts";
import {Color, MathUtils, Mesh, Quaternion, ShaderMaterial, Vector3} from "three";
import {Layer} from "../render";

const COLOR = 0x000000;

const OPEN_RADIUS = 1.3;
const MIN_RADIUS = 0.2;

// detection of snap turns
const TURN_PULSE_INTENSITY = 0.8;
const TURN_PULSE_THRESHOLD = 0.05;
const TURN_PULSE_DECAY = 0.6;

const VERTEX_SHADER = `
varying vec2 view_tan;
void main() {
  vec2 ndc = position.xy * 2.0;

  view_tan = vec2(
    (ndc.x + projectionMatrix[2][0]) / projectionMatrix[0][0],
    (ndc.y + projectionMatrix[2][1]) / projectionMatrix[1][1]
  );

  gl_Position = vec4(ndc, 0.0, 1.0);
}
`

const FRAGMENT_SHADER = `
uniform float intensity;
uniform float clear_radius;
uniform vec3 vignette_color;
varying vec2 view_tan;
void main() {
  float dist = length(view_tan);
  float alpha = smoothstep(clear_radius, clear_radius + 0.2, dist);
  gl_FragColor = vec4(vignette_color, alpha * intensity);
}
`

export const ComfortVignette = ({
    max_linear_speed = 3.0,
    max_angular_speed = 1.5,
}) => {
    const origin_ref = usePlayerOrigin();

    const [vignette_intensity] = useSetting("vignette_intensity");
    const vignette_enabled = vignette_intensity > 0;

    const material_ref = useRef<ShaderMaterial | null>(null);

    const current_position = useRef(new Vector3());
    const current_quat = useRef(new Quaternion());

    const last_position = useRef(new Vector3());
    const last_quat = useRef(new Quaternion());
    const turn_pulse = useRef(0);

    const initialised = useRef(false);

    const last_intensity = useRef(vignette_intensity);
    const preview_timer = useRef(0);
    const intensity_settled = useRef(false);

    useFrame((_, delta) => {
        const material = material_ref.current;
        const origin = origin_ref.current;

        if (!material || !origin) return;

        const current_pos = current_position.current;
        const current_qua = current_quat.current;

        origin.getWorldPosition(current_pos);
        origin.getWorldQuaternion(current_qua);

        if (!initialised.current) {
            last_position.current.copy(current_pos);
            last_quat.current.copy(current_qua);
            initialised.current = true;
            return;
        }

        const dt = Math.max(delta, 1e-4);

        const distance_moved = current_pos.distanceTo(last_position.current);
        const linear_speed = distance_moved / dt;
        const normalised_linear = MathUtils.clamp(linear_speed / max_linear_speed, 0.0, 1.0);

        const angle_rotated = current_qua.angleTo(last_quat.current);
        const angular_speed = angle_rotated / dt;
        const normalised_angular = MathUtils.clamp(angular_speed / max_angular_speed, 0.0, 1.0);

        if (angle_rotated > TURN_PULSE_THRESHOLD) {
            turn_pulse.current = TURN_PULSE_INTENSITY;
        } else {
            turn_pulse.current = Math.max(0, turn_pulse.current - delta / TURN_PULSE_DECAY);
        }

        last_position.current.copy(current_pos);
        last_quat.current.copy(current_qua);

        const intensity_changed = Math.abs(last_intensity.current - vignette_intensity) > 0.5;
        if (intensity_changed) {
            last_intensity.current = vignette_intensity;

            if (intensity_settled.current) {
                preview_timer.current = 0.5;
            } else {
                intensity_settled.current = true;
            }
        } else {
            preview_timer.current = Math.max(0, preview_timer.current - delta);
        }

        const preview_active = preview_timer.current > 0;

        const max_closed = MathUtils.lerp(1.1, MIN_RADIUS, vignette_intensity / 100);

        // force radius and opacity until preview timer nearly over
        if (preview_timer.current > 0.1) {
            const target_radius = vignette_enabled
                ? MathUtils.lerp(OPEN_RADIUS, max_closed, 1.0)
                : OPEN_RADIUS;
            material.uniforms.clear_radius.value = target_radius;

            const target_opacity = (vignette_enabled && 1.0 > 0.05) ? 1.0 : 0.0;
            material.uniforms.intensity.value = target_opacity;
            return;
        }

        const movement_factor = Math.max(normalised_linear, normalised_angular, turn_pulse.current);
        const effective_movement_factor = preview_active ? 1.0 : movement_factor;

        const target_radius = vignette_enabled
            ? MathUtils.lerp(OPEN_RADIUS, max_closed, effective_movement_factor)
            : OPEN_RADIUS;

        // smoothly animate the radius
        material.uniforms.clear_radius.value = MathUtils.lerp(
            material.uniforms.clear_radius.value,
            target_radius,
            1 - Math.exp(-12 * delta),
        );

        // fade opacity out if not moving or if completely disabled in settings
        const opacity_smoothing = preview_active ? 8 : 15;
        const target_opacity = (vignette_enabled && effective_movement_factor > 0.05) ? 1.0 : 0.0;
        material.uniforms.intensity.value = MathUtils.lerp(
            material.uniforms.intensity.value,
            target_opacity,
            1 - Math.exp(-opacity_smoothing * delta),
        );
    });

    const mesh_ref = useRef<Mesh | null>(null);

    useLayoutEffect(() => {
        if (mesh_ref.current) {
            mesh_ref.current.layers.set(Layer.Vignette);
        }
    }, []);

    return (
        <mesh frustumCulled={false} renderOrder={999} ref={mesh_ref}>
            <planeGeometry args={[1, 1]} />
            <shaderMaterial
                ref={material_ref}
                transparent
                depthTest={false}
                depthWrite={false}
                uniforms={{
                    intensity: { value: 0 },
                    clear_radius: { value: OPEN_RADIUS },
                    vignette_color: { value: new Color(COLOR) },
                }}
                vertexShader={VERTEX_SHADER}
                fragmentShader={FRAGMENT_SHADER}
            />
        </mesh>
    );
}
