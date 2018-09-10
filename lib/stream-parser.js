/**
 * (c) 2018 cepharum GmbH, Berlin, http://cepharum.de
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2018 cepharum GmbH
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * @author: Thomas Urban
 */


var UTIL    = require( "util" );
var STREAM  = require( "stream" );

var MESSAGE = require( "./message" );
var IPP     = require( "./data" );




/**
 * Loosely checks given buffer for containing complete IPP message header (excl.
 * any attached data) returning index of byte in buffer attached data is
 * beginning at.
 *
 * @note This method might be considered wasting time in favour of saving memory
 *       for not keeping track of previous search for end of header but starting
 *       to search from the beginning on each invocation.
 *
 * @param {Buffer} buffer
 * @returns {number} index of byte data is starting at, -1 on missing end of header
 * @private
 */

function _getEndOfHeaderIndex( buffer ) {
	"use strict";

	var pos = 8, readGroup = true,
	    ch, len;

	if ( !buffer ) {
		return -1;
	}

	len = buffer.length;

	while ( pos < len ) {
		if ( readGroup ) {
			// expecting begin of attribute group
			ch = buffer.readInt8( pos++ );

			if ( IPP.ATTRIBUTE_GROUP[ch] === null ) {
				// not starting any further attribute group here
				// -> met end of IPP message at current position
				return pos;
			}

			// met beginning of another attribute group ...
			// -> start skipping attributes on next iteration
			readGroup = false;
		} else {
			// expecting attribute
			// -> get type of attribute
			ch = buffer.readInt8( pos++ );

			if ( IPP.ATTRIBUTE_GROUP[ch] !== undefined ) {
				// met end of current attribute group
				// -> switch to mode processing attribute group tags
				readGroup = true;
				pos--;  // read current tag byte in next iteration again
			} else if ( pos + 1 < len ) {
				// met another attribute
				// read length of attribute's name and skip it
				var length = buffer.readInt16BE( pos );
				if ( length < 0 ) {
					return -1;  // stop on strange case ... length mustn't be <0
				}

				pos += 2 + length;
				if ( pos + 1 < len ) {
					// read length of attribute's value and value
					length = buffer.readInt16BE( pos );
					if ( length < 0 ) {
						return -1;  // stop on strange case ... length mustn't be <0
					}

					pos += 2 + length;
				}
			}
		}
	}

	// met end of buffer before meeting end of IPP message
	return -1;
}



/*
 * --- helper class for creating single message by writing into stream ---
 */

/**
 * Extends WritableStream for parsing IPP message from an incoming stream by
 * piping.
 *
 * The IPP message is loaded into buffer first, then parsed. This stream emits
 * event "message" providing parsed message as argument.
 *
 * @param options {{}=} objects basically passed to WritableStream (reverting decodeString and objectMode to defaults)
 * @constructor
 */

function IPPMessageStreamParser( options ) {
	"use strict";

	var that = this;

	if ( options ) {
		options.decodeStrings = true;
		options.objectMode = false;
	}

	STREAM.Duplex.call( this, options || {} );

	this._collector = null;
	this._message   = null;
	this._error     = null;
	this._metEof    = false;

	this.on( "finish", function() {
		"use strict";

		if ( !that._message ) {
			that.emit( "error", new Error( "premature end of IPP message" ) );
		} else {
			that._metEof = true;

			that.push( null );
		}
	} );

	this.on( "error", function( error ) {
		"use strict";

		that._error = error;
	} );
}

UTIL.inherits( IPPMessageStreamParser, STREAM.Duplex );



/**
 * Processes chunk written into stream.
 *
 * @param chunk {Buffer|String}
 * @param [encoding] {String}
 * @param onDone {Function} callback to be invoked on finished writing chunk
 * @private
 */

IPPMessageStreamParser.prototype._write = function( chunk, encoding, onDone ) {
	"use strict";

	if ( !this._error ) {
		// ensure chunk is a Buffer
		if ( !Buffer.isBuffer( chunk ) ) {
			chunk = new Buffer( chunk, encoding );
		}

		// still waiting for end of IPP header?
		if ( !this._message ) {
			// yes

			// -> collect successively incoming chunks
			if ( !this._collector ) {
				this._collector = chunk;
			} else {
				this._collector = Buffer.concat( [ this._collector, chunk ] );
			}

			// check if whole IPP header is contained in collected chunks now
			var EOHindex = _getEndOfHeaderIndex( this._collector );
			if ( EOHindex >= 0 ) {
				// yes it is
				try {
					// parse IPP message header
					this._message = new MESSAGE.IPPMessage( this._collector.slice( 0, EOHindex ) );

					// tell any consumers about IPP header being available now
					this.emit( "message", this._message );

					// reduce collected data to part succeeding message header
					// parsed before
					chunk = this._collector.slice( EOHindex );

					// release collector for it isn't used anymore now
					this._collector = null;
				} catch ( error ) {
					this.emit( "error", error );
				}
			}
		}

		if ( this._message && chunk.length > 0 ) {
			// met end of header before
			// -> always push received data into queue of Readable part
			this.push( chunk );
		}
	}

	onDone( null );
};

/**
 * Requests to try reading another chunk from source.
 *
 * @param size {int} maximum size of chunk to be read if possible
 * @private
 */

IPPMessageStreamParser.prototype._read = function( size ) {
	"use strict";

	// _read() doesn't need to do anything for Readable data is pushed into
	// queue on receiving data in Writable part automatically
};



// --- public API ---

module.exports.IPPMessageStreamParser = IPPMessageStreamParser;
