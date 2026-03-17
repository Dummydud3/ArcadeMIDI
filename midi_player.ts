// Add your code here
/**
 * Simple MIDI song player for MakeCode Arcade.
 * Uses event format: [[t_ms, freq_hz, duration_ms, velocity], ...]
 * Generate events with: python tools/midi_to_song.py your.mid -o song.ts
 */

namespace midiPlayer {
    //% shim=music::queuePlayInstructions
    function queuePlayInstructions(timeDelta: number, buf: Buffer): void { }

    const BUFFER_SIZE = 12;

    function addNote(buf: Buffer, ptr: number, ms: number, beg: number, end: number,
        wave: number, hz: number, vol: number, endHz: number): number {
        if (ms > 0) {
            buf.setNumber(NumberFormat.UInt8LE, ptr, wave);
            buf.setNumber(NumberFormat.UInt8LE, ptr + 1, 0);
            buf.setNumber(NumberFormat.UInt16LE, ptr + 2, Math.round(hz));
            buf.setNumber(NumberFormat.UInt16LE, ptr + 4, ms);
            const volScaled = (beg * vol) >> 6;
            buf.setNumber(NumberFormat.UInt16LE, ptr + 6, volScaled);
            buf.setNumber(NumberFormat.UInt16LE, ptr + 8, (end * vol) >> 6);
            buf.setNumber(NumberFormat.UInt16LE, ptr + 10, Math.round(endHz));
            ptr += BUFFER_SIZE;
        }
        buf.setNumber(NumberFormat.UInt8LE, ptr, 0);
        return ptr;
    }

    /**
     * Play a song from event array. Each event is [t_ms, freq_hz, duration_ms, velocity].
     * This call blocks until the song finishes.
     */
    //% blockId=midi_player_play_song block="play MIDI song %events"
    //% blockNamespace=music
    //% weight=80
    export function playSong(events: number[][]): void {
        if (!events || events.length === 0) return;

        let maxEnd = 0;
        for (const e of events) {
            if (e.length >= 4) {
                const t = e[0] | 0;
                const ms = Math.max(1, e[2] | 0);
                if (t + ms > maxEnd) maxEnd = t + ms;
            }
        }

        for (const e of events) {
            if (e.length < 4) continue;
            const t = e[0] | 0;
            const hz = e[1];
            const ms = Math.max(1, e[2] | 0);
            let vel = Math.min(255, Math.max(0, e[3] | 0));
            if (hz <= 0 || ms <= 0) continue;

            // Bass boost: human hearing is less sensitive to low frequencies (Fletcher-Munson)
            const boost = Math.max(1, Math.min(3, Math.sqrt(440 / hz)));
            vel = Math.min(255, Math.round(vel * boost));

            const buf = control.createBuffer(BUFFER_SIZE);
            // beg=255, end=0: decay envelope; vel scales volume per velocity
            addNote(buf, 0, ms, 255, 0, 1, hz, vel, hz);
            queuePlayInstructions(t, buf);
        }

        pause(maxEnd);
    }

    /**
     * Play a song in the background (non-blocking).
     */
    //% blockId=midi_player_play_song_background block="play MIDI song %events in background"
    //% blockNamespace=music
    //% weight=79
    export function playSongInBackground(events: number[][]): void {
        control.runInParallel(() => playSong(events));
    }
}
