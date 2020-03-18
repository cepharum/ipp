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

"use strict";

const { Duplex } = require( "stream" );

const Message = require( "./message" );
const Data = require( "./data" );

/**
 * Implements stream extracting IPP message information from provided input
 * passing any additional data to its output.
 */
class IPPMessageStreamParser extends Duplex {
	/**
	 * @param {object=} options objects basically passed to WritableStream (reverting decodeString and objectMode to defaults)
	 */
	constructor( options ) {
		if ( options ) {
			options.decodeStrings = true;
			options.objectMode = false;
		}

		super( options || {} );

		this._collector = null;
		this._message = null;
		this._error = null;
		this._metEof = false;

		this.on( "finish", () => {
			if ( this._message ) {
				this._metEof = true;

				this.push( null );
			} else {
				this.emit( "error", new Error( "premature end of IPP message" ) );
			}
		} );

		this.on( "error", error => {
			this._error = error;
		} );
	}

	/**
	 * Processes chunk written into stream.
	 *
	 * @param {Buffer|String} chunk chunk of data to process
	 * @param {?String} encoding optional encoding if chunk of data is provided as string
	 * @param {Function} onDone callback to be invoked on finished writing chunk
	 * @returns {void}
	 * @private
	 */
	_write( chunk, encoding, onDone ) {
		if ( !this._error ) {
			let _chunk = chunk;

			// ensure chunk is a Buffer
			if ( !Buffer.isBuffer( _chunk ) ) {
				_chunk = Buffer.from( _chunk, encoding );
			}

			// still waiting for end of IPP header?
			if ( !this._message ) {
				// yes

				// -> collect successively incoming chunks
				if ( this._collector ) {
					this._collector = Buffer.concat( [ this._collector, _chunk ] );
				} else {
					this._collector = _chunk;
				}

				// check if whole IPP header is contained in collected chunks now
				const EOHindex = _getEndOfHeaderIndex( this._collector );
				if ( EOHindex >= 0 ) {
					// yes it is
					try {
						// parse IPP message header
						this._message = new Message.IPPMessage( this._collector.slice( 0, EOHindex ) );

						// tell any consumers about IPP header being available now
						this.emit( "message", this._message );

						// reduce collected data to part succeeding message header
						// parsed before
						_chunk = this._collector.slice( EOHindex );

						// release collector for it isn't used anymore now
						this._collector = null;
					} catch ( error ) {
						this.emit( "error", error );
					}
				}
			}

			if ( this._message && _chunk.length > 0 ) {
				// met end of header before
				// -> always push received data into queue of Readable part
				this.push( _chunk );
			}
		}

		onDone( null );
	}

	/**
	 * Requests to try reading another chunk from source.
	 *
	 * @param {int} size maximum size of chunk to be read if possible
	 * @returns {void}
	 * @private
	 */
	_read( size ) { // eslint-disable-line no-unused-vars
		// _read() doesn't need to do anything for Readable data is pushed into
		// queue on receiving data in Writable part automatically
	}
}

module.exports = IPPMessageStreamParser;



/**
 * Loosely checks given buffer for containing complete IPP message header (excl.
 * any attached data) returning index of byte in buffer attached data is
 * beginning at.
 *
 * @note This method might be considered wasting time in favour of saving memory
 *       for not keeping track of previous search for end of header but starting
 *       to search from the beginning on each invocation.
 *
 * @param {Buffer} buffer buffer to be inspected
 * @returns {number} index of first byte past header any data is starting at, -1 on missing end of header
 * @private
 */
function _getEndOfHeaderIndex( buffer ) {
	let pos = 8, readGroup = true;

	if ( !buffer ) {
		return -1;
	}

	const len = buffer.length;

	while ( pos < len ) {
		if ( readGroup ) {
			// expecting begin of attribute group
			const ch = buffer.readInt8( pos++ );

			if ( Data.AttributeGroup[ch] === null ) {
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
			const ch = buffer.readInt8( pos++ );

			if ( Data.AttributeGroup[ch] !== undefined ) {
				// met end of current attribute group
				// -> switch to mode processing attribute group tags
				readGroup = true;
				pos--;  // read current tag byte in next iteration again
			} else if ( pos + 1 < len ) {
				// met another attribute
				// read length of attribute's name and skip it
				let length = buffer.readInt16BE( pos );
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
