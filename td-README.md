# TapeDeck 1.3 web installer

Sample-free custom firmware for M-VAVE FM-1. Identity FM-1_915. Includes matching source, GPL notices, browser sampler/uploader, and an eight-page workflow PDF.

Serve this directory over HTTPS or localhost. Open index.html in a browser supporting Web MIDI SysEx (desktop Chrome/Edge), connect one device, and explicitly press Install. Reload older tabs first: Install rechecks the manifest to reject stale releases. No public site has been deployed by this packaging step.

Before installing, SAVE or back up RAM recordings. Restart loses unsaved audio, patterns and settings. The two saved tape slots are preserved; legacy Tape III remains untouched but is not exposed. This is independent firmware, not an official M-VAVE release.

## 1.3 performance controls

Upper printed keys: OP1/2/3 repeat the last chop at 1/8, 1/16, 1/32. OP4/5 shift the targeted deck down/up one octave immediately. OP6/PIT/GLO throw the combined mix into dotted-eighth/eighth/1/32 delay. MONO/POLY low-pass/high-pass the targeted deck. All are hold-to-activate; release restores the base state. Last chosen delay time remains for tails. Highest held chop/delay rate wins. The first upper key captures the selected tape until all are released. Controls do not write pattern events. HOME wins over held repeats until release.

SEL (internally SCL, beside FX) is strictly hold-only: K1 monitor dB, K2 recording dB, K3 rhythmic rate, K4 gate. A tap never changes pages. SELECT rotary still changes BPM. SEL+OCT- reverse repeats; SEL+OCT+ ratchets. Unshifted OCT- random hold and OCT+ latch remain.

FX tap: delay, drive, reverb, flanger amounts. FX hold + lower keys 1-16: Granulize, Scatter, Tremolo, Reverse, Ring mod, Auto pan, Tape stop, Freeze, Wow/flutter, Wavefold, Flanger, Phaser, Reverb throw, Dropout, Distortion, Crush. Granulize is a two-micrograin live effect using 2 KiB history, not a long-buffer granular sampler. Effects process the combined tape mix; USB monitoring is mixed afterwards. The older buffered FX share a buffer; last pressed wins. New upper keys pressed under FX are ignored until release.

## Workflow

PRESETS chooses Tape I/II. PLAY toggles whole-tape loop. Lower keys play chops. SEQ+REC quantizes live entry; switch tapes to overdub the other lane. EDIT: step/slice/velocity/gate; REC clears step; EDIT+REC clears lane. ENV cycles playback/envelope/tone pages. GLOBAL cycles library/sample/device pages; library K1 chooses tape, PLAY previews, REC twice within 3 seconds deletes. SAVE writes captured audio to Tape II, replacing its saved sample; it does not save patterns.

Two fixed 80 KiB slots. Import: about 7.38 seconds per tape, 22.05 kHz mono IMA ADPCM. Capture: about 5.85 seconds, 11.025 kHz mono IMA ADPCM, 32 KiB RAM. No stock recordings. Deletion does not pool slot capacity. Browser storage is separate from device storage.

USB monitoring defaults to -24 dB, recording to 0 dB; independent attenuation only, -60 means mute. Negative samples use signed master-gain arithmetic (critical 1.2 fix). Host input is excluded from USB return. A cable alone is not an active audio stream. The browser has its own MONITOR INPUT permission flow.

## Validation and limits

Nine release suites exercise actual firmware WASM audio and controls plus the installer protocol: public, final, fx, release11, control-audit, device, shift-input, performance, installer. Hardware compiler checks pass: image 336792 B; data/BSS 64740/73728 B; pool 359968/368640 B, leaving the required 8 KiB headroom. Version 1.3 was installed and restart-verified on the development FM-1 (FM-1_915, CDC v1.3-tapedeck; idle CPU 14%). No external listening test, loaded-DSP hardware benchmark or indefinite stability claim is implied by these results.

Source build instructions are in source.zip/README.md. Credits: https://github.com/hugelton/Felucca and accompanying LICENSE/LICENSING.md. Firmware recovery uses the existing updater protocol; use the official M-VAVE updater and official firmware to return to stock.
