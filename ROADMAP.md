# Roadmap

### Phase 1
- [x] Disable locomotion while watch UI is open (for flat)
- [ ] Comfort options:
  - [x] vignette/masking on move and turn
  - [ ] snap/smooth turn toggle
  - [ ] option for teleport locomotion
- [ ] Match flat locomotion speed to VR speed
- [ ] Split SDK builders into per-domain files (physics, interactions, prefabs, monitors, modification), barrel-export from one `index.ts` so consumer imports don't change

### Phase 2
- [ ] Player gravity
- [ ] Sprint, jump, fly (and crouch for flat)
- [ ] Light prefabs: point, spot, directional
- [ ] Positional audio interaction/prefab (with option for 2D audio for consistency even though they could do it via their own DOM if they wished)
- [ ] Camera interaction/prefab: activating one moves the player POV there (race games etc, altho those could use a forced sit interaction instead added later. figure out what difference there could be)
- [ ] Expand ControllerButtonInteraction to also read flat input, and axes like movement. Provide option to use consolidated input, or to use raw input per control scheme to customise it
- [ ] Billboard positioning interaction
- [ ] Prefab for links between worlds (a door? a portal? a big link logo? or as an interaction to allow customisation? perhaps both with some prefabbed links)
- [ ] Implement monitors in engine
- [ ] Anchored option on kinematic-pos rigid body builder
- [ ] Decide if/how to deal with duplicate interactions
- [ ] Environment props via SDK (sky, fog, maybe even gravity!)
- [ ] Expression input
- [ ] Player stuff via SDK (freeze player, set max speed, change other locomotion restrictions, change if flat allowed via meta, force avatar items, teleport player, force spectator camera mode/pos, player pos monitors, force expressions, force non-teleport locomotion)
- [ ] `wait_for_ready()` and `is_ready` on SDK as alternative to DOM event

### Phase 3
- [ ] VR keyboard for DOM and watch input
- [ ] Object parenting via SDK (needs transform resolution against parent, and think about what happens when a parent has a rigid body)
- [ ] Finish grabbable options: sticky vs non-sticky, snap-to-hand default, grab offset, translation/rotation constraints, scale unlock and constriants
- [ ] Define consistent error message interface for SDK and check for it in builders
- [ ] DOMMirror input: right/middle click, hold-and-drag, thumbstick scroll, click ripple
- [ ] DOMMirror prefab
- [ ] Physics reporting: `usePhysicsReporting`, collision reports
- [ ] Rigid body extras: angular velocity, friction, damping; ignore-player-collisions option
- [ ] Avatar walk animation
- [ ] Avatar clothing, more hair options
- [ ] Avatar slots
- [ ] Fix auth bugs (only allow lowercase username, improve UX, add JWT/passkey somehow)
- [ ] Favourite and recent worlds carousel (withouth thumbnails or description page for now)
- [ ] Sit interaction (player initiated or forced) and chair prefabs
- [ ] SDK audio effects (for all audio, or for specific audio sources)
- [ ] SDK visual effects (b&w, sepia, bloom, anything else possible within vr context, beware react-three/postprocessing limitations with xr! might have to resort to vignette layer shaders)

### Phase 4
- [ ] Internal docstrings across engine + SDK, then public-facing SDK docs
- [ ] Thumbnail and description acquisition
- [ ] Signing rooms with private key and associating with room for verified author
- [ ] Improve OOBE
- [ ] Create hub world with links to other worlds at project homepage, fixed links for now
- [ ] Create other official worlds and games (i.e. our version of the Rec Center, some games that show off features, etc)
- [ ] Free hand movement on flat with keypress
- [ ] Flat gestures
- [ ] SDK can set time scale changes (if possible)
- [ ] Implement raw input via debugger perm in sidecar extension for least privilege (if not, then disable the option for now)
- [ ] Single-node P2P multiplayer, making sure to define the discovery and transport interfaces abstractly so the later relay idea is a drop-in swap
- [ ] If multiplayer has voice chat, extend audio effects to be able to abe applied to player voices too
- [ ] SDK-hosted XR session handoff: investigate feasibility first (can we host on their behalf so they don't need a permission prompt?) and implement in a multiplayer friendly way or drop the idea entirely
- [ ] Arrange informal testing with friends
- [ ] Prepare for first release

### Backlog (from code TODOs, no urgency)
- [ ] Subscription-based routing rather than naming tab ID to support other platforms later
- [ ] Detached mode that runs in an iframe to allow embedding a demo of a fixed world (useful for the homepage!)
- [ ] Replace `SmartSlider` workaround once pmndrs/uikit#247 is fixed
- [ ] Some form of formal test suite :P
- [ ] Tab hopping
- [ ] World editor tool that generates builders
- [ ] Ability to customise the default space for non-immersive pages
- [ ] "3DOM" builder that allows websites to half dip into immersive by being able to make existing DOM elements pop out (or try to do it automatically based on Z-index?!)
- [ ] World discovery (crawling? explicit lists? via world links but then how is that declared in advance? needs research)
- [ ] Sidecar extension for OSC via native messaging? Or ASIO audio input? I suppose depends how and what is implemented in multiplayer first. Not at all necessary
