// Speech recognition
import * as deepSpeech from './recognition/deepSpeech.js';
import * as mozillaTTS from './tts/mozillaTTS.js';
// TTS
import * as maryTTS from './tts/maryTTS.js';
// Wake word
import * as bumblebee from './wakeword/bumblebee.js';
//import * as snowboy from './wakeword/snowboy.js';
import * as vad from './wakeword/vad.js';
// Other
import { getConfig } from '../util/config.js';

// These are the symbols that the client imports to access the selected engine
export var speechToText = null;
export var textToSpeech = null;
export var wakeword = null;

export async function load(lang) {
  let config = getConfig().speechEngine;

  if (config.tts == "mary") {
    textToSpeech = maryTTS;
  } else if (config.tts == "mozilla") {
    textToSpeech = mozillaTTS;
  } else {
    throw new Error("Unknown config value for the TTS engine in config.speechEngine.tts: " + config.tts);
  }

  if (config.speechRecognition == "deepSpeech") {
    speechToText = deepSpeech;
  } else {
    throw new Error("Unknown config value for the speech recognition engine in config.speechEngine.speechRecognition: " + config.speechRecognition);
  }

  if (config.wake == "bumblebee") {
    wakeword = bumblebee;
  //} else if (config.wake == "snowboy") {
  //  wakeword = snowboy;
  } else if (config.wake == "vad") {
    wakeword = vad;
  } else {
    throw new Error("Unknown config value for the wake word engine in config.speechEngine.wake: " + config.wake);
  }

  await speechToText.load(lang);
  await textToSpeech.load(lang);
  await wakeword.load(lang);

  return { speechToText, textToSpeech, wakeword };
}
