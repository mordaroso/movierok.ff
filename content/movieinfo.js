// *******************************************************************************
// * movierok.ff
// *
// * File: movieinfo.js
// * Description: reads the movieinfo (codec, resolution, etc.) from a file
// * Author : movierok team
// * Licence : see licence.txt
// *******************************************************************************

/*
 * AVI Class
 */
var AVI = function(mstream) {
	// moviefile attributes
	this.mstream = mstream;
	this.video_encoding = null;
	this.video_framerate = null;
	this.video_resolution = null;
	this.audio_encoding = null;
	this.audio_bitrate = null;
	this.audio_sample_rate = null;
	this.audio_channels = null;
	this.size = null;
	this.duration = null;

	// special final attributes
	this.RIFF_AVI = "41564920";
	this.RIFF_CDXA = "43415844";
	this.LIST = "4C495354";
	this.LIST_HDRL = "6864726C";
	this.LIST_STRL = "7374726C";
	this.CHUNK_AVIH = "61766968";
	this.CHUNK_STRH = "73747268";
	this.CHUNK_STRF = "73747266";
	this.JUNK = "4A554E4B";

    	// local vars
	this.lastType;
	this.skipped = 0;
	this.max_skipped = 100;
	this.firstListFound = false;
	this.stop = false;

};
AVI.prototype = {
	readHeader : function() {
		var stream_size = this.mstream.readLittleEndianInt(); // read
		// file size
		var stream_type = this.mstream.readHex(4); // read
		// stream type
		if (stream_type == this.RIFF_AVI) { // RIFF AVI
			this.readChunk();
		} else {
			mrLogger.debug("Stream type " + stream_type + " is unknown.")
		}
	},
	readChunk : function() {
		if(!this.stop){
		mrLogger.debug(this.mstream.tell());
		var chunk_type = this.mstream.readHex(4);
		var chunk_size = this.mstream.readLittleEndianInt();
		if (chunk_type == this.LIST){
			chunk_type = this.mstream.readHex(4);
			this.firstListFound = true;		
			mrLogger.debug("first list found");
		}
		switch (chunk_type) {
			case (this.LIST_HDRL) : {
				mrLogger.debug("HDRL");
				var start = this.mstream.tell();

				while (this.mstream.tell() - start < chunk_size && !this.stop) {
					this.readChunk();
				}
				break;
			}
			case (this.LIST_STRL) : {
				// read strl chunk
				mrLogger.debug("STRL");
				var start = this.mstream.tell();

				while (this.mstream.tell() - start < chunk_size && !this.stop) {
					this.readChunk();
				}
				break;
			}
			case (this.CHUNK_STRF) : {
				// read strf chunk
				var strf = "STRF";
				strf += "\nlastType: " + this.lastType;
				if (this.lastType == "auds") {
					var formatTag = new Array(this.mstream.readHex(1),
							this.mstream.readHex(1));
					var wFormatTag = formatTag[1] + formatTag[0];
					this.audio_encoding = MovieFile.getAudioEncoding(wFormatTag);
					var nChannels = this.mstream.readLittleEndianShort();
					this.audio_channels = nChannels;
					var nSamplesPerSec = this.mstream.readLittleEndianInt();
					this.audio_sample_rate = nSamplesPerSec;
					var nAvgBytesPerSec = this.mstream.readLittleEndianInt();
					this.audio_bitrate = nAvgBytesPerSec * 8;
					var nBlockAlign = this.mstream.readShort();
					var wBitsPerSample = this.mstream.readShort();
					var cbSize = this.mstream.readShort();

					strf += "\nwFormatTag: " + wFormatTag;
					strf += "\nnChannels: " + nChannels;
					strf += "\nnSamplesPerSec: " + nSamplesPerSec;
					strf += "\nnAvgBytesPerSec: " + nAvgBytesPerSec;
					strf += "\nnBlockAlign: " + nBlockAlign;
					strf += "\nwBitsPerSample: " + wBitsPerSample;
					strf += "\ncbSize: " + cbSize;

					this.mstream.skip(chunk_size - 18);
				} else {
					mrLogger.debug("skip " + chunk_size);
					this.mstream.skip(chunk_size);
				}
				mrLogger.debug(strf);
				break;
			}
			case (this.CHUNK_STRH) : {
				// read strh chunk
				var strh = "STRH";
				var streamType = this.mstream.readString(4);
				var encoding;
				if (streamType == "vids") {
					this.lastType = "vids";
					encoding = this.mstream.readString(4);
					this.video_encoding = encoding;
				} else {
					this.lastType = "auds";
					this.mstream.readHex(4);
				}
				var flags = this.mstream.readLittleEndianInt();
				var priority = this.mstream.readShort();
				var language = this.mstream.readShort();
				var initialFrames = this.mstream.readLittleEndianInt();
				var scale = this.mstream.readLittleEndianInt();
				var rate = this.mstream.readLittleEndianInt();
				var start = this.mstream.readLittleEndianInt();
				var length = this.mstream.readLittleEndianInt();
				var suggestedBufferSize = this.mstream.readLittleEndianInt();
				var quality = this.mstream.readLittleEndianInt();
				var sampleSize = this.mstream.readLittleEndianInt();
				var rcFrame = this.mstream.readLong();
				strh += "\nStream Type: " + streamType;
				strh += "\nEncoding: " + encoding;
				strh += "\nFlags: " + flags;
				strh += "\nPriority: " + priority;
				strh += "\nLanguage: " + language;
				strh += "\nInitialFrames: " + initialFrames;
				strh += "\nScale: " + scale;
				strh += "\nRate: " + rate;
				strh += "\nStart: " + start;
				strh += "\nLength: " + length;
				strh += "\nBufferSize: " + suggestedBufferSize;
				strh += "\nQuality: " + quality;
				strh += "\nSampleSize: " + sampleSize;
				strh += "\nRcFrame: " + rcFrame;

				if (streamType == "vids") {
					this.video_framerate = Math.floor(rate / scale);
					this.duration = Math.floor(length / (rate / scale));
				}

				mrLogger.debug(strh);
				break;
			}
			case (this.CHUNK_AVIH) : {
				// read avih chunk
				var avih = "AVIH";

				var timeBetweenFrames = this.mstream.readLittleEndianInt();
				var maximumDataRate = this.mstream.readLittleEndianInt();
				var paddingGranularity = this.mstream.readLittleEndianInt();
				var flags = this.mstream.readLittleEndianInt();
				var totalNumberOfFrames = this.mstream.readLittleEndianInt();
				var numberOfInitialFrames = this.mstream.readLittleEndianInt();
				var numberOfStreams = this.mstream.readLittleEndianInt();
				var suggestedBufferSize = this.mstream.readLittleEndianInt();
				var width = this.mstream.readLittleEndianInt();
				var height = this.mstream.readLittleEndianInt();
				var timeScale = this.mstream.readLittleEndianInt();
				var dataRate = this.mstream.readLittleEndianInt();
				var startTime = this.mstream.readLittleEndianInt();
				var dataLength = this.mstream.readLittleEndianInt();

				avih += "\ntimeBetweenFrames: " + timeBetweenFrames;
				avih += "\nmaximumDataRate: " + maximumDataRate;
				avih += "\npaddingGranularity: " + paddingGranularity;
				avih += "\nflags: " + flags;
				avih += "\ntotalNumberOfFrames: " + totalNumberOfFrames;
				avih += "\nnumberOfInitialFrames: " + numberOfInitialFrames;
				avih += "\nnumberOfStreams: " + numberOfStreams;
				avih += "\nsuggestedBufferSize: " + suggestedBufferSize;
				avih += "\nwidth: " + width;
				avih += "\nheight: " + height;
				avih += "\ntimeScale: " + timeScale;
				avih += "\ndataRate: " + dataRate;
				avih += "\nstartTime: " + startTime;
				avih += "\ndataLength: " + dataLength;

				this.video_resolution = width + "x" + height;

				mrLogger.debug(avih);
				break;
			}
			default : {
				// skip unknown chunk
				mrLogger.debug("skip chunk: " + chunk_type);
				this.mstream.skip(chunk_size);
				this.skipped++;
				if (this.skipped == this.max_skipped){
					mrLogger.debug("max skipped reached");
					this.stop = true;
				}
				if(!this.firstListFound){
					this.readChunk();
				}
				break;
			}
			}
		}
	}
};

/*
 * MPEG4 Class
 */
var MP4 = function(mstream) {
	// moviefile attributes
	this.mstream = mstream;
	this.video_encoding = null;
	this.video_framerate = null;
	this.video_resolution = null;
	this.audio_encoding = null;
	this.audio_bitrate = null;
	this.audio_sample_rate = null;
	this.audio_channels = null;
	this.size = null;
	this.duration = null;

	// special final attributes
	this.MOOV = "moov";
	this.CMOV = "cmov";
	this.MVHD = "mvhd";
	this.MDIA = "mdia";
	this.HDLR = "hdlr";
	this.MINF = "minf";
	this.STBL = "stbl";
	this.TRAK = "trak";
	this.STSD = "stsd";
	this.STTS = "stts"
	this.FTYP = "ftyp"
	this.MDAT = "mdat"

    // local vars
	this.lastType = "";

};

MP4.prototype = {
	readHeader : function() {
		this.seekMOOV();
		this.duration = Math.floor(this.duration);
	},
	seekMOOV : function() {
		// goto beginning of file
		this.mstream.seek(0);
		var chunk_type = "";
		while (chunk_type != this.MOOV
				&& this.mstream.tell() < this.mstream.available()) {
			var chunk_size = this.mstream.readInt();
			chunk_type = this.mstream.readString(4);
			if (chunk_type != this.MOOV) {
				this.mstream.skip(chunk_size - 8);
				mrLogger.debug("skip " + chunk_type);
			}
		}
		if (this.mstream.tell() < this.mstream.available()) {
			this.mstream.skip(-8);
			this.readChunk();
		} else {
			mrLogger.debug("no moov chunk found");
		}
	},
	readChunk : function() {
		var chunk_size = this.mstream.readInt();
		var chunk_type = this.mstream.readString(4);
		switch (chunk_type) {
			case (this.MOOV) : {
				mrLogger.debug("moov");
				var start = this.mstream.tell();
				while (this.mstream.tell() - start < chunk_size - 8) {
					this.readChunk();
				}
				mrLogger.debug("end moov");
				break;
			}
			case (this.TRAK) : {
				mrLogger.debug("trak");
				var start = this.mstream.tell();
				while (this.mstream.tell() - start < chunk_size - 8) {
					this.readChunk();
				}
				mrLogger.debug("end trak");
				break;
			}
			case (this.MDIA) : {
				mrLogger.debug("mdia");
				var start = this.mstream.tell();
				while (this.mstream.tell() - start < chunk_size - 8) {
					this.readChunk();
				}
				this.lastType = "";
				mrLogger.debug("end mdia");
				break;
			}
			case (this.MINF) : {
				mrLogger.debug("minf");
				var start = this.mstream.tell();
				while (this.mstream.tell() - start < chunk_size - 8) {
					this.readChunk();
				}
				mrLogger.debug("end minf");
				break;
			}
			case (this.STBL) : {
				mrLogger.debug("stbl");
				var start = this.mstream.tell();
				while (this.mstream.tell() - start < chunk_size - 8) {
					this.readChunk();
				}
				mrLogger.debug("end stbl");
				break;
			}
			case (this.CMOV) : {
				this.readCMOV(chunk_size);
				break;
			}
			case (this.MVHD) : {
				this.readMVHD(chunk_size);
				break;
			}
			case (this.HDLR) : {
				this.readHDLR(chunk_size);
				break;
			}
			case (this.STSD) : {
				this.readSTSD(chunk_size);
				break;
			}
			case (this.STTS) : {
				this.readSTTS(chunk_size);
				break;
			}
			default : {
				// skip unknown chunk
				mrLogger.debug("skip chunk: " + chunk_type);
				this.mstream.skip(chunk_size - 8);
				break;
			}
		}
	},
	readCMOV : function(chunk_size) {
		this.mstream.skip(4)
		var compression = this.mstream.readString(8);
		if (compression == "dcomzlib") {
			mrLogger.debug("header is compressed");
			throw ("decompression not implemented yet");
		} else {
			mrLogger.debug("header compression " + compression + " is unknown");
			throw ("header compression " + compression + " is unknown");
		}
	},
	readMVHD : function(chunk_size) {
		// read mvhd chunk
		var mvhd = "mvhd";
		this.mstream.skip(12);
		var timeScale = this.mstream.readInt();
		var duration = this.mstream.readInt();
		this.mstream.skip(chunk_size - 28);
		mvhd += "\ntimeScale: " + timeScale;
		mvhd += "\nduration: " + duration;

		this.duration = duration / timeScale;

		mrLogger.debug(mvhd);
	},
	readHDLR : function(chunk_size) {
		var hdlr = "hdlr";
		this.mstream.skip(8);
		var lastType = this.mstream.readString(4);
		if (this.lastType == "") {
			this.lastType = lastType;
			hdlr += "\nset: true";
		}
		hdlr += "\ntype: " + lastType;
		this.mstream.skip(chunk_size - 20);
		mrLogger.debug(hdlr);
	},
	readSTSD : function(chunk_size) {
		mrLogger.debug("stsd");
		this.mstream.skip(4);
		var count_entries = this.mstream.readInt();

		for (var i = 0; i < count_entries; i++) {
			var entry_size = this.mstream.readInt();
			var encoding = this.mstream.readString(4);
			this.mstream.skip(6);
			if (this.lastType == "soun") {
				this.audio_encoding = encoding;
				this.readAudioEntry(entry_size - 14);
			} else if (this.lastType == "vide") {
				this.video_encoding = encoding;
				this.readVideoEntry(entry_size - 14);
			}
		}
	},
	readVideoEntry : function(entry_size) {
		var video = "video entry ";
		this.mstream.skip(18);
		var width = this.mstream.readShort();
		var height = this.mstream.readShort();
		this.video_resolution = width + "x" + height;
		video += "\nresolution: " + this.video_resolution;
		this.mstream.skip(entry_size - 22);
		mrLogger.debug(video);
	},
	readAudioEntry : function(entry_size) {
		var audio = "audio entry";
		this.mstream.skip(10);

		var channels = this.mstream.readShort();
		var bits_per_sample = this.mstream.readShort();
		this.mstream.skip(4);
		var sample_rate = this.mstream.readShort();
		audio += "\nchanels: " + channels;
		audio += "\nbits per sample: " + bits_per_sample;
		audio += "\nsample rate: " + sample_rate;

		this.audio_channels = channels;
		this.audio_sample_rate = sample_rate;

		this.mstream.skip(entry_size - 20);
		mrLogger.debug(audio);
	},
	readSTTS : function(chunk_size) {
		var stts = "stts";
		this.mstream.skip(4);
		var count_entries = this.mstream.readInt();

		if (count_entries == 1) {
			var num_samples = this.mstream.readInt();
			stts += "\nnum_samples: " + num_samples;
			this.video_framerate = Math.floor(num_samples / this.duration);
			this.mstream.skip(chunk_size - 20);
		} else {
			this.mstream.skip(chunk_size - 16);

		}
		mrLogger.debug(stts);
	}
};

/*
 * MPEG Class
 */
var MPEG = function(mstream) {
	// moviefile attributes
	this.mstream = mstream;
	this.video_encoding = "MPEG";
	this.video_framerate = null;
	this.video_resolution = null;
	this.audio_encoding = "MPEG";
	this.audio_bitrate = null;
	this.audio_sample_rate = null;
	this.audio_channels = null;
	this.size = null;
	this.duration = null;

	// special final attributes
	this.PACK_HEADER = "000001BA"
	this.SEQUENCE_START = "000001B3";
	this.GROUP_START = "000001B8";
	this.SYSTEM_HEADER = "000001BB";
	this.VIDEO_HEADER = "000001E0";
	this.AUDIO_HEADER = "000001C0";
	this.FRAME_START = "00000100";
	// Bitrate
	this.MPEG1_LAYER1 = new Array(0, 32, 64, 96, 128, 160, 192, 224, 256, 288,
			320, 352, 384, 416, 448, 0);
	this.MPEG1_LAYER2 = new Array(0, 32, 48, 56, 64, 80, 96, 112, 128, 160,
			192, 224, 256, 320, 384, 0);
	this.MPEG1_LAYER3 = new Array(0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160,
			192, 224, 256, 320, 0);
	this.MPEG2_LAYER1 = new Array(0, 32, 48, 56, 64, 80, 96, 112, 128, 144,
			160, 176, 192, 224, 256, 0);
	this.MPEG2_LAYER2 = new Array(0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96,
			112, 128, 144, 160, 0);
	this.MPEG2_LAYER3 = new Array(0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96,
			112, 128, 144, 160, 0);
	this.RESERVED = new Array(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
	// Samplerate
	this.MPEG2_SAMPLE = new Array(22050, 24000, 16000, 0);
	this.MPEG1_SAMPLE = new Array(44100, 48000, 32000, 0);
};

MPEG.prototype = {
	readHeader : function() {
		this.mstream.seek(0);
		this.readChunk();
	},
	readChunk : function() {
		var chunk_type = this.mstream.readHex(4);
		switch (chunk_type) {
			case (this.PACK_HEADER) : {
				this.readPackHeader();
				this.readChunk();
				break;
			}
			case (this.SYSTEM_HEADER) : {
				this.readSystemHeader();
				this.readChunk();
				break;
			}
			case (this.VIDEO_HEADER) : {
				var size = this.mstream.readShort();
				var start = this.mstream.tell();
				this.readVideoAudioHeader();
				this.readChunk();
				this.mstream.skip(size - (this.mstream.tell() - start));
				this.readChunk();
				break;
			}
			case (this.AUDIO_HEADER) : {
				var size = this.mstream.readShort();
				var start = this.mstream.tell();
				this.readVideoAudioHeader();
				this.readAudioHeader();
				this.mstream.skip(size - (this.mstream.tell() - start));
				break;
			}
			case (this.SEQUENCE_START) : {
				this.readSequence();
				this.readChunk();
				break;
			}
			case (this.FRAME_START) : {
				break;
			}
			default : {
				if (chunk_type.substr(0, 6) == "000001") {
					var size = this.mstream.readShort();
					this.mstream.skip(size);
					if (this.mstream.tell() < this.mstream.available())
						this.readChunk();
				}
				break;
			}
		}
	},
	readPackHeader : function() {
		var type = this.mstream.readByte();
		if ((type & 0xF0) == 0x10)
			this.video_encoding = "MPEG2";
		else if ((type & 0xF0) == 0x20)
			this.video_encoding = "MPEG1";
		this.mstream.skip(7);
	},
	readSystemHeader : function() {
		var size = this.mstream.readShort();
		this.mstream.skip(size);
	},
	readVideoAudioHeader : function() {
		var next_byte;
		// skip fillbytes
		while ((next_byte = this.mstream.readByte()) == 0xFF) {
		}
		if ((next_byte & 0xC0) == 0x40) {
			this.mstream.skip(1);
			next_byte = this.mstream.readByte();
		}
		if ((next_byte & 0x20) == 0x20) {
			this.mstream.skip(4);
		}
		if ((next_byte & 0x10) == 0x10) {
			this.mstream.skip(5);
		}
	},
	readSequence : function() {
		var sequence = this.mstream.readBytes(7);
		var width = (sequence[0] << 4) + ((sequence[1] >> 4) & 0x0f);
		var height = sequence[2] + ((sequence[1] & 0x0f) << 8);
		this.video_resolution = width + "x" + height;
		switch (sequence[3] & 0x0f) {
			case (0) : {
				mrLogger("mpeg is corrupted")
			}
			case (1) : {
				this.video_framerate = "23.976";
				break;
			}
			case (2) : {
				this.video_framerate = "24.000";
				break;
			}
			case (3) : {
				this.video_framerate = "25.000";
				break;
			}
			case (4) : {
				this.video_framerate = "29.97";
				break;
			}
			case (5) : {
				this.video_framerate = "30.000";
				break;
			}
			case (6) : {
				this.video_framerate = "50.000";
				break;
			}
			case (7) : {
				this.video_framerate = "59.94";
				break;
			}
			case (8) : {
				this.video_framerate = "60.000";
				break;
			}
		}
		// skip intra matrix if not standard
		var loadIM = this.mstream.readByte();
		if ((loadIM & 0x02) == 0x00) {
			this.mstream.skip(63);
			var loadIM2 = this.mstream.readByte();
			if ((loadIM & 0x01) == 0x00) {
				this.mstream.skip(63);
			}
		}
	},
	readAudioHeader : function() {
		var audioHeader = this.mstream.readInt();
		var mpegId = (audioHeader >> 19) & 0x01;
		var layer = (audioHeader >> 17) & 0x03;
		var bitrateIdx = (audioHeader >> 12) & 0x0F;
		var sampleRate = (audioHeader >> 10) & 0x03;
		var mode = (audioHeader >> 5) & 0x03;
		if (mpegId == 1) {
			this.audio_encoding = "MPEG 1";
			this.audio_sample_rate = this.MPEG1_SAMPLE[sampleRate];
		} else {
			this.audio_encoding = "MPEG 2";
			this.audio_sample_rate = this.MPEG2_SAMPLE[sampleRate];
		}
		switch (layer) {
			case (1) : {
				this.audio_encoding += ", Layer 3";
				break;
			}
			case (2) : {
				this.audio_encoding += ", Layer 2";
				break;
			}
			case (3) : {
				this.audio_encoding += ", Layer 1";
				break;
			}
		}
		var array;
		if (mpegId == 1 && layer == 3) {
			array = this.MPEG1_LAYER1;
		} else if (mpegId == 1 && layer == 2) {
			array = this.MPEG1_LAYER2;
		} else if (mpegId == 1 && layer == 1) {
			array = this.MPEG1_LAYER3;
		} else if (mpegId == 0 && layer == 3) {
			array = this.MPEG2_LAYER1;
		} else if (mpegId == 0 && layer == 2) {
			array = this.MPEG2_LAYER2;
		} else if (mpegId == 0 && layer == 1) {
			array = this.MPEG2_LAYER3;
		} else {
			array = this.RESERVED;
		}
		this.audio_bitrate = array[bitrateIdx];
		if (mode == 3) {
			this.audio_channels = "1";
		} else {
			this.audio_channels = "2";
		}

	}
}

/*
 * MKV Class
 */
var MKV = function(mstream) {
	// moviefile attributes
	this.mstream = mstream;
	this.video_encoding = null;
	this.video_framerate = null;
	this.video_resolution = null;
	this.audio_encoding = null;
	this.audio_bitrate = null;
	this.audio_sample_rate = null;
	this.audio_channels = null;
	this.size = null;
	this.duration = null;

	this.estream = new EBMLFileStream(mstream);


	// special final attributes
	// ELEMENT-IDs
	this.DOCTYPE = "4282";
	this.SEGMENT = "18538067";
    this.SEGMENT_INFO = "1549A966";
    this.TIMECODE_SCALE = "";
    this.DURATION = "";
    this.TRACK_ENTRY = "AE";
    this.TRACKS = "1654AE6B";
    this.TRACK_TYPE = "83";
    this.CODEC_ID = "86";
    this.VIDEO = "E0";
    this.AUDIO = "E1";
    this.PIXEL_WIDTH = "B0";
    this.PIXEL_HEIGHT = "BA";
    this.CHANNELS = "9F";
    this.SAMPLING_FREQUENCY = "B5";
    this.BIT_DEPTH = "6264";

    // local vars
    this.timecode_scale;
    this.track_type;
    this.stop_subs = false;
    this.width = 0;
    this.height = 0;

}

MKV.prototype = {
	readHeader : function() {
		this.readEBMLHeader();
		this.getElement();
	},
	readEBMLHeader : function() {
		var size = this.estream.getVInt();
		var start = this.mstream.tell();
		while (this.mstream.tell() - start < size) {
			this.getElement();
		}
	},
	getElement : function() {
		var id = this.estream.getVHex();
		var size = this.estream.getVInt();
        switch(id){
            case(this.Doctype):{
                var type = this.mstream.readString(size);
		        if (type != "matroska") {
			        throw ("This is not a matroska file: type '"+type+"' unknown");
		        }
                break;            
            }        
            case(this.SEGMENT):{
                mrLogger.debug("Segment: \nsize = " + size);
                this.readSubElements(size);
                break;            
            } 
            case(this.SEGMENT_INFO):{
                mrLogger.debug("SegmentInfo: \nsize = " + size);
                this.readSubElements(size);
                break;            
            } 
            case(this.TRACKS):{
                mrLogger.debug("Tracks: \nsize = " + size);
                this.readSubElements(size);
                this.stop_subs = true;
                break;            
            } 
            case(this.TRACK_ENTRY):{
                mrLogger.debug("TrackEntry: \nsize = " + size);
                this.readSubElements(size);
                break;            
            }  
            case(this.TRACK_TYPE):{
                this.track_type = this.mstream.readHex(size);
                mrLogger.debug("TrackType: "+ this.track_type);
  		        if (this.track_type != "01" && this.track_type != "02" && this.track_type != "03")
                this.stop_subs = true;              
                break;
            }
            case(this.CODEC_ID):{
                var codec = this.mstream.readString(size);
                mrLogger.debug("Codec: "+ codec);
  		        if (this.track_type == "01" || this.track_type == "03") {
		        	//this.video_encoding = codec;
		        }
                if (this.track_type == "03" || this.track_type == "03"){
                    this.audio_encoding = codec;
                }               
                break;
            }
            case(this.VIDEO):{
                mrLogger.debug("Video: \nsize = " + size);
                this.readSubElements(size);   
                if(this.width != 0 && this.height != 0)
                    this.video_resolution = this.width + "x" + this.height;            
                break;
            }
            case(this.AUDIO):{
                mrLogger.debug("Audio: \nsize = " + size);
                this.readSubElements(size);                
                break;
            }
            case(this.PIXEL_WIDTH):{
                this.width = this.estream.getNumber(size);
                mrLogger.debug("Width: "+ this.width);                
                break;
            }
            case(this.PIXEL_HEIGHT):{
                this.height = this.estream.getNumber(size);
                mrLogger.debug("Height: "+ this.height);                
                break;
            }
            case(this.CHANNELS):{
                this.audio_channels = this.estream.getNumber(size);
                mrLogger.debug("Chanels: "+ this.audio_channels);                
                break;
            }
            case(this.SAMPLING_FREQUENCY):{
                this.audio_sample_rate = this.estream.getNumber(size);
                mrLogger.debug("SampleRate: "+ this.audio_sample_rate);                
                break;
            }
            case(this.BIT_DEPTH):{
                this.audio_bitrate = this.estream.getNumber(size);
                mrLogger.debug("BitRate: "+ this.audio_bitrate);                
                break;
            }
            default:{
                this.mstream.skip(size);
			    mrLogger.debug("skipped: \n" + id + "\nsize = " + size);
                break;            
            } 
        }
	},
	readSubElements : function(size) {
        var start = this.mstream.tell();
		while (this.mstream.tell() - start < size && !this.stop_subs) {
			this.getElement();
		}
        if(this.stop_subs){
            mrLogger.debug("Sub stopped");
            this.mstream.skip(size - (this.mstream.tell() - start));
            this.stop_subs = false;  
        }
	}
}

/*
 * MovieFile
 */
var MovieFile = {
	getObjectByFile : function(file) {
		var mstream = new ExtendedFileStream(file);
		var magicNumber = mstream.readHex(4);
		var ending = file.path.split(".");
		ending = ending[ending.length - 1];
		var format_number = movie_format_number.getItem(magicNumber);
		var format_ending = movie_format_ending.getItem(ending);
		var format_file;
		if (format_number != null) {
			// check magic number
			format_file = new format_number(mstream);

		} else if (format_ending != null) {
			// check ending
			format_file = new format_ending(mstream);

		} else {
			mrLogger.debug("unknown movie file: MagicNumber[" + magicNumber
					+ "] ending[" + ending + "]");
			throw ("unknown movie type")
		}
		format_file.size = file.fileSize;
		format_file.readHeader();
		mstream.close();
		return format_file;
	},
	getAudioEncoding : function(encodingId){		
		if(audio_encoding.hasItem(encodingId)){
			return audio_encoding.getItem(encodingId);
		}else{
			mrLogger.debug("Audio Encoding '"+ encodingId +"' is unknown");		
			return null;
		}
	},
	testFile : function(file) {
		var format_file = this.getObjectByFile(file);
		for (var param in format_file) {
			mrLogger.debug(param + ": " + format_file[param]);
		}
		alert("finished");
	}

}

var movie_format_number = new Hash( // magic number
		"000001B3", MPEG,// MPEG (video)
		"000001BA", MPEG, // MPEG (video)
		"52494646", AVI, // RIFF (WAV / audioAVI / video)
		"1A45DFA3", MKV, // Matroska mkv
		"4F676753", null, // Ogg media ogm
		"00000018", MP4, // MP4 media ogm mov
		"3026B275", null // WMV media wmv asf
);

var movie_format_ending = new Hash( // file ending
		"mov", MP4,// MP4 media ogm mov
		"mp4", MP4,// MP4 media ogm mov
		"mpeg", MPEG,// MPEG (video)
		"mpg", MPEG,// MPEG (video)
		"avi", AVI, // RIFF (WAV / audioAVI / video)
		"mkv", MKV // Matroska mkv
);

var audio_encoding = new Hash(//
		"0000", "Unknown", //
		"0001", "PCM",//
		"0002", "ADPCM",//
		"0003", "FLOAT",//
		"0004", "VSELP", //
		"0005", "CVSD",//
		"0006", "A-Law",//
		"0007", "U-Law",//
		"0008", "DTS",//
		"000C", "MPEG2 5.1",//
		"0010", "ADPCM",//
		"0011", "ADPCM",//
		"0012", "ADPCM",//
		"0013", "ADPCM",//
		"0014", "ADPCM",//
		"0015", "STD",//
		"0016", "FIX",//
		"0017", "ADPCM",//
		"0018", "ADPCM",//
		"0019", "CU",//
		"0020", "ADPCM",//
		"0021", "SONARC",//
		"0022", "Truespeech",//
		"0023", "SC1",//
		"0024", "AF36",//
		"0025", "APTX",//
		"0026", "AF10",//
		"0027", "Prosody 1612",//
		"0028", "LRC",//
		"0030", "AC2",//
		"0031", "GSM 6.10",//
		"0032", "MSAUDIO",//
		"0033", "ADPCM",//
		"0034", "VQLPC",//
		"0035", "REAL",//
		"0036", "ADPCM",//
		"0037", "CR10",//
		"0038", "ADPCM",//
		"0039", "ADPCM",//
		"003A", "SC3",//
		"003B", "ADPCM",//
		"003C", "DigiTalk",//
		"003D", "Xebec",//
		"0040", "ADPCM",//
		"0041", "CELP",//
		"0042", "G.723.1",//
		"0045", "G.626",//
		"0050", "MPEG1/2 L1",//
		"0051", "MPEG1/2 L2",//
		"0052", "RT24",//
		"0053", "PAC",//
		"0055", "MPEG1/2 L3",//
		"0059", "G723",//
		"0060", "Cirrus",//
		"0061", "PCM",//
		"0062", "Voxware",//
		"0063", "ATRAC",//
		"0064", "ADPCM",//
		"0065", "ADPCM",//
		"0066", "DSAT",//
		"0067", "DSAT Display",//
		"0069", "BYTE_ALIGNED",//
		"0070", "AC8",//
		"0071", "AC10",//
		"0072", "AC16",//
		"0073", "AC20",//
		"0074", "RT24",//
		"0075", "RT29",//
		"0076", "RT29HW",//
		"0077", "VR12",//
		"0078", "VR18",//
		"0079", "TQ40",//
		"0080", "Softsound",//
		"0081", "TQ60",//
		"0082", "MSRT24",//
		"0083", "G729A",//
		"0084", "MVI_MVI2",//
		"0085", "G726",//
		"0086", "GSM6.10",//
		"0088", "ISI AUDIO",//
		"0089", "Onlive",//
		"0091", "SBC24",//
		"0092", "AC3 SPDIF",//
		"0093", "G723",//
		"0094", "Prosody 8KBPS",//
		"0097", "ADPCM",//
		"0098", "LPCBB",//
		"0099", "Packed",//
		"00A0", "PHONYTALK",//
		"0100", "ADPCM",//
		"0101", "IRAT",//
		"0111", "G723",//
		"0112", "SIREN",//
		"0123", "G723",//
		"0125", "ADPCM",//
		"0130", "ACEPL",//
		"0131", "ACELP4800",//
		"0132", "ACELP8V3",//
		"0133", "G729",//
		"0134", "G729",//
		"0135", "KELVIN",//
		"0140", "G726",//
		"0150", "PureVoice",//
		"0151", "HalfRate",//
		"0155", "TUBGSM",//
		"0160", "MS-Audio1",//
		"0161", "MS-Audio2",//
		"0200", "ADPCM",//
		"0202", "FastSpeech8",//
		"0203", "FastSpeech10",//
		"0210", "ADPCM",//
		"0220", "QuaterDeck",//
		"0230", "VC",//
		"0240", "RAW_SPORT",//
		"0250", "HSX",//
		"0251", "RPELP",//
		"0260", "CS2",//
		"0270", "SCX",//
		"0300", "FM_TOWNS_SND",//
		"0400", "BTV_DIGITAL",//
		"0401", "Music Coder",//
		"0402", "IAC2",//
		"0450", "QDESIGN_MUSIC",//
		"0680", "VMPCM",//
		"0681", "TPC",//
		"1000", "GSM",//
		"1001", "ADPCM",//
		"1002", "CELP",//
		"1003", "SBC",//
		"1004", "OPR",//
		"1100", "LH_CODEC",//
		"1101", "CELP",//
		"1102", "SBC",//
		"1103", "SBC",//
		"1104", "SBC",//
		"1400", "NORRIS",//
		"1401", "ISIAUDIO",//
		"1500", "MUSICOMPRESS",//
		"2000", "AC3",//
		"674F", "Vorbis1",//
		"6750", "Vorbis2",//
		"6751", "Vorbis3",//
		"676F", "Vorbis1+",//
		"6770", "Vorbis2+",//
		"6771", "Vorbis3+",//
		"7A21", "GSM",//
		"7A22", "GSM",//
		"A_MPEG/L1", "MPEG1/2 L1",//
		"A_MPEG/L2", "MPEG1/2 L2",//
		"A_MPEG/L3", "MPEG1/2 L3",//
		"A_PCM/INT/BIG", "PCM",//
		"A_PCM/INT/LIT", "PCM",//
		"A_PCM/FLOAT/IEEE", "FLOAT",//
		"A_AC3", "AC3",//
		"A_AC3/BSID9", "AC3",//
		"A_AC3/BSID10", "AC3",//
		"A_DTS", "DTS",//
		"A_VORBIS", "Vorbis",//
		"A_REAL/14_4", "Real 1",//
		"A_REAL/28_8", "Real 2",//
		"A_REAL/COOK", "Real Cook",//
		"A_REAL/SIPR", "Real Sipro",//
		"A_REAL/RALF", "Real 1",//
		"A_REAL/ATRC", "Real 1",//
		"A_AAC/MPEG2/MAIN", "MPEG2 MP",//
		"A_AAC/MPEG2/LC", "MPEG2 LC",//
		"A_AAC/MPEG2/SSR", "MPEG2 SSR",//
		"A_AAC/MPEG4/MAIN", "MPEG4 MP",//
		"A_AAC/MPEG4/LC", "MPEG4 LC",//
		"A_AAC/MPEG4/SSR", "MPEG4 MP",//
		"A_AAC/MPEG4/LTP", "MPEG4 LTP",//
		"A_AAC/MPEG4/SBR", "MPEG4 SBR",//
		"Vorbis", "Vorbis"//
);

EBMLFileStream = function(efilestream) {
	this.efs = efilestream;
}

EBMLFileStream.prototype = {
	getVInt : function() {
		var vInt;
		var firstByte = this.efs.readByte();
		var size = this.getVSize(firstByte);
		vInt = firstByte << (24 + size) >>> (24 + size);
		for (var i = 0; i < (size - 1); i++) {
			vInt = vInt << 8;
			var add = this.efs.readByte();
			vInt += add;
		}
		//mrLogger.debug("\n" + firstByte + "\nsize = " + size + "\nvint = " + vInt);
		return vInt;
	},
    getVHex : function() {
		var vHex;
		var firstByte = this.efs.readByte();
		var size = this.getVSize(firstByte);
        vHex = this.efs.toHexString(firstByte);
		for (var i = 0; i < (size - 1); i++) {
			vHex += this.efs.toHexString(this.efs.readByte());
		}
		//mrLogger.debug("\n" + firstByte + "\nsize = " + size + "\nvint = " + vInt);
		return vHex;
	},
    getNumber : function(size) {
		var number = 0;
		for (var i = 0; i < size; i++) {
			number = (number << 8) + this.efs.readByte();
		}
		//mrLogger.debug("\n" + firstByte + "\nsize = " + size + "\nvint = " + vInt);
		return number;
	},
	getVSize : function(firstByte) {
		var size;
		if (firstByte & 0x80) {
			return 1;
		} else if (firstByte & 0x40) {
			return 2;
		} else if (firstByte & 0x20) {
			return 3;
		} else if (firstByte & 0x10) {
			return 4;
		} else if (firstByte & 0x08) {
			return 5;
		} else if (firstByte & 0x04) {
			return 6;
		} else if (firstByte & 0x02) {
			return 7;
		} else if (firstByte & 0x01) {
			return 8;
		} else {
			return null;
		}
	}
}

ExtendedFileStream = function(file) {
	this.file = file;
	this.fstream = this.getFileInputStream(file);
	this.bstream = this.getBinaryInputStream(this.fstream);
}

ExtendedFileStream.prototype = {
	getFileInputStream : function(file) {
		var istream = Components.classes["@mozilla.org/network/file-input-stream;1"]
				.createInstance(Components.interfaces.nsIFileInputStream);
		istream.QueryInterface(Components.interfaces.nsISeekableStream);
		istream.init(file, -1, -1, false);
		return istream;
	},
	getBinaryInputStream : function(fstream) {
		var bstream = Components.classes["@mozilla.org/binaryinputstream;1"]
				.createInstance(Components.interfaces.nsIBinaryInputStream);
		bstream.setInputStream(fstream);
		return bstream;
	},
	close : function(){
		this.bstream.close();
		this.fstream.close();
	},
	toHexString : function(charCode) {
		return ("0" + charCode.toString(16)).slice(-2).toUpperCase();
	},
	readHex : function(number_of_bytes) {
		var hex = "";
		for (var i = 0; i < number_of_bytes; i++) {
			hex += this.toHexString(this.bstream.read8());
		}
		return hex;
	},
	readString : function(number_of_bytes) {
		var hex = "";
		for (var i = 0; i < number_of_bytes; i++) {
			hex += this.asciitostring(this.bstream.read8());
		}
		return hex;
	},
	skip : function(number_of_bytes) {
		this.fstream.seek(Components.interfaces.nsISeekableStream.NS_SEEK_CUR,
				number_of_bytes);
	},
	asciitostring : function(nbr) {
		var rstr = String.fromCharCode(nbr);
		return rstr;
	},
	readShort : function() {
		return this.bstream.read16();
	},
	readBytes : function(number_of_bytes) {
		var byteArray = new Array();
		for (var i = 0; i < number_of_bytes; i++) {
			byteArray.push(this.bstream.read8());
		}
		return byteArray;
	},
	readByte : function() {
		return this.bstream.read8();
	},

	readInt : function() {
		return this.bstream.read32();
	},
	readLittleEndianShort : function() {
		var hex = "";
		for (var i = 0; i < 2; i++) {
			hex = this.toHexString(this.bstream.read8()) + hex;
		}

		return parseInt("0x" + hex);
	},
	readLittleEndianInt : function() {
		var hex = "";
		for (var i = 0; i < 4; i++) {
			hex = this.toHexString(this.bstream.read8()) + hex;
		}

		return parseInt("0x" + hex);
	},

	readLong : function() {
		return this.bstream.read64();
	},
	seek : function(position) {
		this.fstream.seek(Components.interfaces.nsISeekableStream.NS_SEEK_SET,
				position);
	},
	tell : function() {
		return this.fstream.tell();
	},
	available : function() {
		return this.file.fileSize;
	}
}
