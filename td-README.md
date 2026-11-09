# TapeDeck 1.1 — sample-free web installer

Upload this entire directory to an HTTPS static host. Open index.html in a browser with Web MIDI SysEx support. There is no build step, backend, or external CDN. For a local preview: `python3 -m http.server 8768 --bind 127.0.0.1`, then visit http://127.0.0.1:8768/ (do not open index.html as a file).

Connect one FM-1 by USB, click Connect, grant MIDI access, and click Install. The installer checks the downloaded package's SHA-256 and identity, writes via the existing Felucca USB-MIDI updater, and verifies the identity after restart. It supports resuming an interrupted loader write. A successful package download is not shown as a successful installation.

This version contains no bundled sample recordings. Two user tape slots are available; import your own audio through sampler/index.html or record USB audio. Saved tapes I/II are preserved when updating. Legacy tape III remains in flash but is not selectable; back it up before upgrading. Unsaved audio and patterns are lost on restart. Patterns and sample properties remain session-only. The sample-free release does not erase arbitrary owners' saved audio.

## Files

- `td-tapedeck-1.1.fwsc`: firmware, identity FM-1_913.
- `td-manifest.json`: exact size and SHA-256 for integrity checking.
- `td-source.zip`: matching firmware and installer source, generated headers and dependency sources, with build instructions.
- `sampler/`: sample-free browser emulator, audio import and device upload interface.
- `td-LICENSE`, `LICENSES/`, `td-LICENSING.md`: attribution and license texts.

No private samples, older firmware packages, device backups, or private recording files are included. The firmware UI uses the OFL Inter Tight raster in this release. The page's serif styling uses the viewer's system fonts and ships no proprietary font.

The firmware is GPL-3.0-only with the third-party components documented in LICENSING.md. Keep the matching source download and license files available when redistributing the binary. Custom firmware is independent of M-VAVE.

Web MIDI requires user permission: https://developer.chrome.com/blog/web-midi-permission-prompt

## Final controls

- GLOBAL cycles library / sample settings / device settings. Library K1 selects a tape; PLAY previews; REC twice within three seconds deletes it and stops playback. RAM labels mean unsaved recording; SAVE stores it in tape II. Deletion removes that slot's flash audio and its current pattern lane. It does not enlarge the fixed 80 KiB slots or the separate 32 KiB recording buffer.
- GLOBAL sample knobs: pitch, level, playback mode, reverse. ENV exposes the full envelope/tone panels.
- GLOBAL device knobs: BPM, rhythmic rate, swing, and key bank (1–16 / 17–32).
- Hold OCT− for random chops at the current rate/gate/swing. Let go to stop retriggering; the last chop can finish. Random targets the tape selected when you start holding it.
- OCT+ toggles latch for the selected tape. The last manually played chop repeats at the current rate/gate/swing; play another key to change it. Each populated tape can latch independently. Random temporarily overrides that tape's latch; release returns to latch. STOP/HOME clears all latches.
- Pattern clocks continue during random/latch performance, with the performance effect taking priority on its own tape. Automatic repeats do not write into the pattern.

The final release was tested with the real firmware compiled to WebAssembly: imports, overlapping tapes, live pattern recording, physical octave buttons, deletion confirmation/timeouts/reboot, and preserving other slots. Installer tests cover package hashes, explicit connect/install, multiple-device rejection and failure recovery. Hardware build memory checks pass. No device data is bundled in the release ZIP.

## TapeDeck 1.1

The boot screen and USB device identify TapeDeck. USB audio sent to TapeDeck FM-1 is automatically monitored through its local outputs before and during REC, at the master volume. A USB IN lamp confirms an active stream; a cable alone is not an audio stream. The host input is excluded from the USB return to prevent a direct feedback loop. Monitoring remains available after STOP; stop the host stream to end monitoring. The browser has a separate MONITOR INPUT button that requests audio permission.

The three lamps below the VU meter appear only on ENV and GLOBAL and indicate the current subpage. Two 80 KiB tape slots retain the previous audio quality and length: imports up to 7.38 seconds at 22.05 kHz mono ADPCM; capture up to 5.85 seconds at 11.025 kHz mono ADPCM. SAVE replaces Tape II; it does not save patterns. Removing the third deck does not automatically enlarge the two slots.

Additional release tests: pre-record monitoring/disconnect, mixed-output limiting, page-indicator pixels, removed-slot rejection, save/reboot, and reverse/FX/monitor stress. Hardware transport testing is recorded separately from listening validation.

Release-device verification: FM-1_913 restart and TapeDeck v1.1-tapedeck console confirmed. A 15-second USB tone test activated monitoring without recording, with zero USB input underruns and no increase in late-audio count. This is a bounded test, not a guarantee of indefinite stability or an analog-output listening test.

## Installer audit

Install rechecks the current manifest before any device write and refuses a package cached from a different release. Reload an old installer tab before use. Historical .fwsc files have been moved out of the served installer directory. The sample uploader accepts both TapeDeck FM-1 and legacy Felucca USB names. On-device deletion: GLOBAL library (first page), K1 to select, REC, then REC again within three seconds. OCT− must be held; OCT+ toggles latch for the selected tape. Empty tapes cannot produce chops, and live USB monitoring is not stored sample material.
