import BumblebeeNode from 'bumblebee-hotword-node';
import VAD from 'node-vad';
import { wait } from '../../util/util.js';

/**
 * Listens to audio, and waits for the wake word.
 * Sends the voice data after the wake word to the callback.
 *
 * @param audioInputStream {Stream} audio data from microphone
 * @param maxCommandLength {int} in seconds. How long to listen
 *   after the wake word before calling endCommandCallback().
 * @param newCommandCallback {Function()} Will be called
 *   when the wake word was heard and audio data is available.
 *   To be passed to voice recognition.
 *   It is not the complete command, but just the first few ms.
 * @param audioCallback {Function(Buffer)}
 *   More audio for an ongoing command, after `newCommandCallback`.
 * @param endCommandCallback {Function()} Will be called
 *   after newCommandCallback and continuedCallback() and
 *   there is silence.
 *   NOTE: If the user listens to music while giving a command,
 *   this will not be called (there is no general voice detection),
 *   but `continuedCallback()` will be called many times,
 *   until `maxCommandLength`.
 */
export async function waitForWakeWord(audioInputStream, maxCommandLength,
  newCommandCallback, audioCallback, endCommandCallback) {
  const kMaxSilence = 1.5; // seconds
  const kSampleRate = audioInputStream.audio.rate;

  let detector = new BumblebeeNode();
  detector.addHotword('grasshopper');
  detector.addHotword('hey_edison');
  //detector.addHotword('bumblebee');
  detector.setSensitivity(0.6);

  detector.start(audioInputStream, kSampleRate);

  let vad = new VAD(VAD.Mode.VERY_AGGRESSIVE);

  // Whether this is an active command
  let commandStartTime = null;
  let lastVoiceTime = null;

  // Cache the last few audio chunks before the wake word triggers
  let startBuffer = [];
  const kBufferFrames = 0;

  function endCommand() {
    commandStartTime = null;
    lastVoiceTime = null;
    try {
      endCommandCallback();
    } catch (ex) {
      console.error(ex);
    }
  }

  detector.on('hotword', (wakeword) => {
    console.info('Wakeword', wakeword);
    try {
      if (commandStartTime) {
        endCommand();
      }

      commandStartTime = new Date();
      newCommandCallback();

      for (let previousBuffer of startBuffer) {
        audioCallback(previousBuffer);
      }
      startBuffer.length = 0;
    } catch (ex) {
      console.error(ex);
    }
  });

  detector.on('data', async (buffer) => {
    // <buffer> contains the last chunk of the audio that triggers the "sound"
    // event. It could be written to a wav stream.
    if (commandStartTime) {
      let commandStartTimeOriginal = commandStartTime;
      try {
        audioCallback(buffer);

        // Use silence detection to know when the command finished
        let voice = await vad.processAudio(buffer, kSampleRate);
        if (commandStartTimeOriginal != commandStartTime) {
          // The command was aborted during silence detection in a parallel run.
          // Fixes reentrancy race condition.
          return;
        }
        if (voice == VAD.Event.VOICE) {
          lastVoiceTime = Date.now();
          process.stdout.write('##########\r');
        } else { // ERROR, NOISE or SILENCE
          process.stdout.write('***       \r');
          if (lastVoiceTime && Date.now() - lastVoiceTime > kMaxSilence * 1000) {
            console.info("Command finished due to silence");
            endCommand();
            return;
          }
          // Wakeword cuts the start of the command.
          // Workaround: Buffer last 3 frames.
          startBuffer.push(buffer);
          if (startBuffer.length >= kBufferFrames) {
            startBuffer.shift();
          }
        }
        // maximum command time, in case there's background noise
        if (new Date() - commandStartTime > maxCommandLength * 1000) {
          console.info("Command finished due to timeout");
          endCommand();
        }
      } catch (ex) {
        console.error(ex);
      }
    } else {
      process.stdout.write('...       \r');
    }
  });

  detector.on('error', ex => {
    console.error(ex);
    this.destroy(ex);
  });

  detector.on('destroy', () => {
    detector.stop();
  });
  console.info('Listening to your command...');
  await wait(64^5); // 34 years TODO
}


export async function load() {
}

export async function unload() {
}
