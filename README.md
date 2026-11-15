# Ghost Rovers

A game for the NASA Space Apps 2026 challenge "Abandoned but not Forgotten." The laptop shows a 3D rover racing across the Moon or Mars, driven with a game controller (like a PlayStation DualSense) or the keyboard. Kids follow signal beams to the real landing sites of machines NASA left behind, wake each one up, and hear its story.

## What's in the folder

| File | What it is |
| --- | --- |
| `index.html` | The page, its layout and its colours |
| `js/data.js` | **All the stories, facts and coordinates. Edit this to rewrite the text.** |
| `js/host.js` | The 3D game on the laptop |
| `js/gamepad.js` | Game controller (DualSense) support |
| `js/prompts.js` | The on-screen button hints for the controller and keyboard |
| `js/ui.js` | Keyboard menu activation, dialog focus and accessible navigation |
| `js/progress.js` | Validated browser saves for discoveries, timers and mission checkpoints |
| `js/preferences.js` | Saved story reading-pause setting |
| `js/icons.js` | Matching hand-drawn SVG mission emblems |
| `js/discovery-fx.js` | Colour reveals, discovery rings and earned sticker animations |
| `phone.html` | Dormant phone-controller design preview, not linked from the game. It does not control the rover. |
| `tests/gamepad.test.js` | Tests for the controller code, using a fake controller. Run with `node tests/gamepad.test.js` |
| `js/models.js` | The rover and the ghost machines, built from simple shapes |
| `js/audio.js` | Music and sound effects, made by code |
| `lib/` | Libraries and the font (see Credits) |

Keep the folders together. The game needs all of them.

## Put it online

Pick one:

**GitHub Pages**
1. Make a new public repo and upload everything in this folder (`index.html`, `phone.html`, `js/`, `lib/`).
2. Settings → Pages → Source: "Deploy from a branch", branch `main`, folder `/ (root)`.
3. Wait about a minute, then open `https://<your-username>.github.io/<repo-name>/`.

**Netlify Drop**
1. Go to app.netlify.com/drop and drag this folder onto the page.
2. Open the https link it gives you.

You can also double-click `index.html` to play straight from the folder.

## Controls

Drive with a game controller or the keyboard, and switch any time just by using the other one. Button hints on screen change to match the active input.

| | 🎮 Controller (DualSense or similar) | ⌨️ Keyboard |
| --- | --- | --- |
| Start | ✕ | Enter |
| Steer | Left stick | ← → or A D (eases in smoothly) |
| Drive | R2 (press harder to go faster) | ↑ or W |
| Brake and reverse | L2 | ↓ or S |
| Next / Keep exploring | ✕ | Enter or Space |
| Back / close | ○ | Esc |
| Read aloud | △ | R |
| Sticker book | □ | B |
| Pause | Options | P |
| Mission tasks | Stick to move, hold ✕ to grab, ○ to skip | ← → to move, hold Enter to grab, Esc to skip |
| Choose a menu button | D-pad | ← → on menus |

- **Controller:** plug in by USB or pair by Bluetooth, then press any button so the browser notices it. Xbox and other controllers work too, with the same button positions. On Chrome and Edge an optional button can match a DualSense lightbar to the planet.
- Brake/reverse takes priority when both pedals are held, including during a speed boost.
- **Keyboard:** M switches between the Moon and Mars, N turns the sound on or off.
- **Rumble** (controller, where the browser supports it): a soft pulse at 2 signal bars, a double pulse when a ghost is found or a task is done, a bump on boulders and crater rims, a long low rumble in soft sand, and a tiny tick for science stars.
- **If the controller is unplugged** while you're driving with it, the game pauses and says so. Carry on with the keyboard or plug it back in.
- New story cards wait 5 seconds before continuing, so there's time to read. Turn **Reading pause** off on the title or pause screen to continue straight away. Read aloud works immediately, shows **Stop reading** while speaking, and lowers the music until narration ends.
- The pause button in the top-right works alongside P / Options. Switching away from the game clears held inputs and pauses driving or a mission task; resume when you're ready.
- Menus support Tab / Shift+Tab, arrows / D-pad, and Enter / Cross. Focus stays within the open dialog and returns to its opener when closed.

## How to play

- Follow the compass needle and the glowing beams. The beeps speed up as you get closer.
- Drive up to a hologram to bring the machine back to life and open its story card.
- Collect science stars for a fun fact and a speed boost.
- Every machine you find becomes a sticker in the sticker book. Find them all on both worlds to unlock the Deep Space chapter.
- Select an earned sticker to read its story again, or select an available task to replay it. Skipped tasks can be completed later. A task earns its sticker and time bonus only once; replaying does not reset exploration or advance the story.

## Saved progress

Discoveries, science stars, task stickers, mission timers, rover position and interrupted discoveries save automatically in this browser. **Continue** names the saved planet and restores the checkpoint after a refresh or return visit. An interrupted task restarts safely; a skipped task resumes at its story, and a deep-space story resumes at the current card. Earned task rewards are retained, including the final task's time bonus. Finishing the story keeps your collection available for free exploration. Previewing a different planet on the title screen does not change the saved mission.

**New game** asks before clearing progress and keeps your colour, sound and comfort settings. Saves stay on this browser/device and web address; they do not sync to other devices. If browser storage is blocked or full, the game still runs and explains that the session could not be saved.

## Development checks

No build step or package installation is needed. With Node.js installed, run all regression checks from this folder:

```sh
node --test tests/*.test.js
```

The checks cover controllers and pedal priority, dialog focus, input loss, saved checkpoints, story/task replay and rewards, all 14 tasks with scripted controls and drawing checks, task assistance, audio preferences, resource cleanup, staged terrain/minimap updates, frame-independent particle rates, camera obstacle clearance and graphics recovery. Drawing checks validate Canvas calls and input paths; browser screenshots are still needed for visual layout. For a browser preview, run `python3 -m http.server 8000` and open `http://localhost:8000`.

If the browser interrupts 3D graphics, the game stops its timer and saves the checkpoint. When graphics recover, choose **Return to game** to resume, or **Reload game** to restore the saved mission. Startup failures offer a retry screen without clearing discoveries.

## Visual polish

The original chunky cartoon models and palette remain. Paired straight tyre-block impressions match the rover’s tread width and spacing and fade away, science stars squash and sparkle when collected, and discoveries return gently from cyan to colour with one expanding ring and a sticker flying into the book. All game effects stay fully animated; the reading-pause preference remains available.

The HUD uses matching SVG emblems, stable counter groups and a named destination beside the compass. Free exploration uses a quieter status badge. The sticker book uses planet-themed mission patches, visible task completion seals and a persistent header with section jumps and collection counts. Story actions stay visible while scrolling; a stationary rover portrait previews paint choices. Mars mesas have layered bands, pale caps and occasional top-mounted arches; distant crater-rim and arch silhouettes add variety. These decorations keep existing collision shapes and routes intact. The minimap renders terrain, labels and markers separately for crisp text and symbols, groups overlapping distant signals and marks world boundaries. A contrasting rear inset, bumper and lamps help the rover stand out.

All 14 mission tasks show the current action and interaction state. The focus task has a visible slider knob, local lock meters are distinct from mission progress, and a small cue explains assistance.

## What's in the game

- **Moon (6):** Apollo 11 descent stage, Surveyor 3, Apollo 14 science station (ALSEP), Apollo 15, 16 and 17 Moon cars.
- **Mars (8):** Viking 1, Viking 2, Sojourner, Opportunity, Spirit, Phoenix, InSight, Ingenuity.
- **Deep space (5, story cards only):** Pioneer 10 & 11, NEAR Shoemaker, Dawn, Kepler, Voyager 1.

The ALSEP in the game is the Apollo 14 one. The Apollo 12 ALSEP sits about 180 m from Surveyor 3, which is the same spot at this map's scale.

## Levels, timer and mission tasks

- **Moon = Level 1 · Easy.** Gentle hills and a few small rocks. Nothing blocks the rover.
- **Mars = Level 2 · Harder.** Real Mars hazards: boulders to steer around, soft sand that slows you right down (the hazard that trapped Spirit in 2009), craters with steep rims that push you back, and dust devils that nudge you sideways. Every ghost and star is kept clear, and a test checks that each one can be reached.
- **Mission timer:** 3:00 on the Moon and 5:00 on Mars. It pauses during story cards, mission tasks, the sticker book and the countdown. Science stars and finished tasks each add 10 seconds. Under 30 seconds it turns orange with a soft tick. If time runs out, a friendly Mission Report offers "Keep exploring" (no timer) or "Try again". The timer can be turned off on the title screen. Change the times with `timeLimit` in `js/data.js`.
- **Mission tasks:** when a ghost wakes up, a short hands-on job based on what that machine really did comes before its story. Steer to move the hand and hold DRIVE (or Enter, Cross, or the mouse) to grab. Tasks can't be failed: after about 30 seconds the targets get bigger, and the bar fills by itself if needed. There is always a Skip button. Finishing gives a bonus star (+10s) and a task sticker.
- Each task is its own file in `js/minigames/`. To add one, copy a task file, change the id to a machine's id from `js/data.js`, and add the file name to the `tasks` list in `index.html`. `js/minigames/core.js` explains the helpers.

## What's real and what's cartoon

Real:
- Every ghost sits at its real landing-site latitude and longitude. The HUD shows your real coordinates and real distances in km.
- Place names (Sea of Tranquility, Olympus Mons and so on) float above their real positions.
- Gravity in the game is weaker on the Moon than on Mars in the real proportion, so jumps last longer on the Moon.
- Moon dust flies in arcs and drops straight down (no air). Mars dust hangs and drifts (thin air), and Mars has dust devils.
- Earth hangs in the real compass direction for wherever you are on the Moon, and stays put.

Cartoon:
- The map is shrunk a lot. The rover would be many kilometres long at this scale.
- Hills, craters, rocks and mesas are made up by code. They are not the real terrain.
- Earth is drawn bigger and lower in the sky than it really is, so you can see it while driving.
- The machines are simplified models built from blocks, with no logos, flags or mission markings.
- You wouldn't hear a rover on the Moon.

## Real maps (optional)

To tint the ground with real NASA imagery, put a full-globe equirectangular image (longitude -180 to 180, centred on 0) next to `index.html` named `moon.jpg` or `mars.jpg`. For example, the colour map from NASA's CGI Moon Kit, or a Mars global mosaic. The game picks them up automatically. Ground tinting only works when the game is served from a web address, not when opened as a file.

## Editing the stories

All text and coordinates live in `js/data.js`. Each machine has `wow` (the one-line fun fact), `story`, `found`, `now` and `eng`. Science-star facts are in each world's `stars` list as `[latitude, longitude, "fact"]`.

**Check every fact against a NASA source before judging.** The Voyager 1 one-light-day date (November 18, 2026) was checked against news reports of the mission team's figure in November 2026. The other facts were reviewed from memory by the AI assistant and none were changed, but they have not been checked line by line against NASA pages.

## Credits and licences

- [three.js](https://threejs.org) r149, MIT licence (3D graphics)
- [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) 1.4.4 by Kazuhiko Arase, MIT licence (bundled legacy library; not loaded by the game)
- [Fredoka](https://fonts.google.com/specimen/Fredoka) font, SIL Open Font Licence 1.1
- Music, sound effects, 3D models, the Earth picture and all textures are generated by the code in this folder. There are no downloaded audio, image or model files.
- The look is inspired by bright kart-racing games in general. No characters, logos or assets from any game are used, and no NASA logos or insignia.

## AI disclosure

Code, 3D models, music and first-draft story text were written with help from Claude (Anthropic). No AI-generated images are used; everything on screen is drawn live by code. Note this on the project page as the Space Apps rules require.
