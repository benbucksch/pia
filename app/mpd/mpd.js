//import { MPC } from 'mpc-js';
import * as mpcjs from 'mpc-js';
const MPC = mpcjs.default.MPC;
import { JSONApp } from '../../baseapp/JSONApp.js';
import { getConfig } from '../../util/config.js';


/**
 * API doc:
 * <https://www.npmjs.com/package/mpc-js>
 * <https://hbenl.github.io/mpc-js-core/typedoc/classes/_mpccore_.mpccore.html>
 */
export default class MPD extends JSONApp {
  constructor() {
    super("mpd", "app/mpd/");
  }

  async load(lang) {
    await super.load(lang);
    this.kArtistSeparator = " by "; // TODO localize
    await this.loadSongs();
  }

  async loadSongs() {
    let songType = this.dataTypes.SongTitle;
    let artistType = this.dataTypes.Artist;
    let songAndArtistType = this.dataTypes.SongAndArtist;
    let startTime = new Date();
    let mpc = await this.connect();
    //
    let artistSongs = await mpc.database.list('Title', [], [ 'Artist' ]);
    for (let artistEntry of artistSongs.entries()) {
      let artist = artistEntry[0][0];
      let songs = artistEntry[1];
      if (artist) {
        artistType.addValue(artist);
      }
      for (let title of songs) {
        if (title) {
          songType.addValue(title);
        }
        if (title && artist) {
          songAndArtistType.addValue(title + this.kArtistSeparator + artist);
        }
      }
    }
    console.info('Read %d songs in %dms', songAndArtistType.valueIDs.length, new Date() - startTime);
  }

  /**
   * @returns { MPC }
   */
  async connect() {
    if (this._mpc) {
      // TODO check whether the connection is still alive
      return this._mpc;
    }
    let mpc = new MPC();
    let config = getConfig().mpd;
    console.info("Loading from MPD at " + config.server);
    await mpc.connectTCP(config.server, config.port || 6600);
    this._mpc = mpc;
    return mpc;
  }

  /**
   * Command
   * @param args {object}
   *    SongAndArtist {string}
   * @param client {ClientAPI}
   */
  async playSongAndArtist(args, client) {
    let split = args.SongAndArtist.split(this.kArtistSeparator);
    if (split.length != 2) {
      throw new Error("I found no such song");
    }
    let song = split[0];
    let artist = split[1];

    let mpc = await this.connect();
    await mpc.currentPlaylist.clear();
    mpc.database.findAdd([['Title', song], ['Artist', artist]]);
    mpc.playback.play();
    await this.debugShowPlaying();
  }

  /**
   * Command
   * @param args {object}
   *    Song {string}
   * @param client {ClientAPI}
   */
  async playSongTitle(args, client) {
    let song = args.Song;
    if (!song) {
      throw new Error("I found no such song");
    }

    let mpc = await this.connect();
    await mpc.currentPlaylist.clear();
    mpc.database.findAdd([['Title', song]]);
    mpc.playback.play();
    await this.debugShowPlaying();
  }

  /**
   * Command
   * @param args {object}
   *    Artist {string}
   * @param client {ClientAPI}
   */
  async playArtist(args, client) {
    let artist = args.Artist;
    if (!artist) {
      throw new Error("I found no such artist");
    }

    let mpc = await this.connect();
    await mpc.currentPlaylist.clear();
    mpc.database.findAdd([['Artist', artist]]);
    mpc.playback.play();
    await this.debugShowPlaying();
  }

  async debugShowPlaying() {
    let mpc = await this.connect();
    //let songs = await mpc.database.find([['Title', searchText]]);
    //console.log(songs.map(song => ({ title: song.title, artist: song.artist, file: song.path })));
    let songObj = (await mpc.currentPlaylist.playlistInfo(0))[0];
    if (songObj) {
      console.log("\nPlaying: " + songObj.title + " by " + songObj.artist + "\n");
    } else {
      console.error("No such song found");
    }
  }

  /**
   * Command
   * @param args {null}
   * @param client {ClientAPI}
   */
  async stop(args, client) {
    let mpc = await this.connect();
    await mpc.playback.stop();
  }

  /**
   * Command
   * @param args {null}
   * @param client {ClientAPI}
   */
  async next(args, client) {
    let mpc = await this.connect();
    await mpc.playback.next();
  }

  /**
   * Command
   * @param args {null}
   * @param client {ClientAPI}
   */
  async previous(args, client) {
    let mpc = await this.connect();
    await mpc.playback.previous();
  }

  /**
   * Command
   * @param args {object}
   *    Volume {Number} 0..100
   * @param client {ClientAPI}
   */
  async volume(args, client) {
    let volume = args.Volume;
    if (typeof(volume) != "number") {
      throw new Error("Need new volume as number");
    }
    // Range 0..100
    if (volume < 0 || volume > 100) {
      throw new Error("Volume number too high or too low");
    }

    let mpc = await this.connect();
    await mpc.playbackOptions.setVolume(volume);
  }

  /**
   * Command
   * @param args {object}
   *    RelativeVolume {Number}  -100..100
   * @param client {ClientAPI}
   */
  async relativeVolume(args, client) {
    let relativeVolume = args.RelativeVolume;
    if (typeof(relativeVolume) != "number") {
      throw new Error("Need relative volume");
    }
    if (relativeVolume < -100 || relativeVolume > 100) {
      throw new Error("Volume number too high or too low");
    }

    let mpc = await this.connect();
    let status = await mpc.status.status();
    await mpc.playbackOptions.setVolume(status.volume + relativeVolume);
  }
}
