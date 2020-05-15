import Speaker from 'speaker'; // for output -- naudiodon output doesn't work for me
import sox from 'sox-stream'; // for transform. Requires sox to be installed
import { textToSpeech } from '../../speech/speech.js'; // sample rate
import { getConfig } from '../../util/config.js';

/**
 * Play sound at the loudspeakers.
 *
 * @param waveStream {ReadableStream} audio
 *    WAV format, outputSampleRate(), 1 channel, 16 bit unsigned
 */
export default function audioOutput(waveStream) {
  let device = getConfig().audio.outputDevice; // e.g. "hw(0,0)", null = default
  device = device ? device.replace("(", ":").replace(")", "") : null; // expects "hw:0,0" instead of "hw(0,0)"
  // TODO Gives "Failed to open output device" for me for "hw:0,0", despite matching the docs.
  let ao = new Speaker({
    channels: 1,
    bitDepth: 16,
    sampleRate: textToSpeech.sampleRate(),
    device: device,
  });
  let waveToRaw = sox({
    input: {
        type: "wav",
    },
    output: {
        bits: 16,
        channels: 1,
        rate: textToSpeech.sampleRate(),
        type: "raw",
    },
  });
  waveStream.pipe(waveToRaw).pipe(ao);
  return new Promise((resolve, reject) => {
    waveStream.on('finish', resolve);
  });
}
