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

const EventEmitter = require( "events" );

const Data = require( "./data" );
const Types = require( "./types" );
const Decoders = require( "./decode" );
const Generate = require( "./generate" );

/**
 * Manages single IPP message, which is either a request message or a response
 * message.
 *
 */
class IPPMessage extends EventEmitter {
	/**
	 * @param {Buffer} rawBuffer raw binary encoded IPP message
	 */
	constructor( rawBuffer ) {
		super();

		this.version = "1.1";

		this.code = null;
		this.id = null;

		this.attributes = {
			operation: {},
			printer: {},
			job: {},
			unsupported: {}
		};

		if ( rawBuffer && rawBuffer.length > 0 ) {
			this._parse( rawBuffer );
		}
	}

	/**
	 * Populates current instance's properties with information parsed from provided
	 * IPP message.
	 *
	 * @param {Buffer} data raw binary encoded IPP message
	 * @returns {void}
	 * @private
	 */
	_parse( data ) {
		if ( data.length < 8 ) {
			throw new TypeError( "encoded message too small" );
		}

		let pos = 0;

		this.version = data.readInt8( pos++ ) + "." + data.readInt8( pos++ );

		this.code = data.readInt16BE( pos );
		pos += 2;

		this.id = data.readInt32BE( pos );
		pos += 4;

		this._parseAttributeGroup( data, pos );
	}

	/**
	 * Parses provided IPP message for groups of attributes.
	 *
	 * @param {Buffer} data raw binary encoded IPP message
	 * @param {int} pos index of next octet in IPP message to process on parsing
	 * @returns {int} index of first octet in `data` that hasn't been processed
	 * @private
	 */
	_parseAttributeGroup( data, pos ) {
		let _pos = pos;
		const length = data.length;

		while ( _pos < length ) {
			const type = data.readUInt8( _pos++ );
			const name = Data.ATTRIBUTE_GROUP[type];

			if ( name === null ) {
				return this._parseContent( data, _pos );
			} else if ( name ) {
				_pos = this._parseAttributes( data, _pos, this.attributes[name] );
			} else {
				throw new Error( "unsupported attribute group type" );
			}
		}

		throw new Error( "unexpected EOM" );
	}

	/**
	 * Parses provided IPP message for attributes.
	 *
	 * @param {Buffer} data raw binary encoded IPP message
	 * @param {int} pos index of next octet in IPP message to process
	 * @param {object} pool reference on section of property this.attributes to store parsed attributes
	 * @returns {int} index of first octet in `data` that hasn't been processed
	 * @protected
	 */
	_parseAttributes( data, pos, pool ) {
		let _pos = pos;
		const length = data.length;
		let name, valueLength, value, decoder;

		while ( _pos < length ) {
			let type = data.readInt8( _pos );
			if ( type < 0 ) {
				throw new Error( "invalid type of attribute" );
			}

			if ( type < 0x10 ) {
				// met end of current attribute group by reading start of next group now
				// -> stop parsing attributes here for parsing another attribute group
				return _pos;
			}

			_pos++;

			// --- read length of attribute's name
			if ( _pos + 2 > length ) {
				throw new Error( "met EOM while reading length of attribute' name" );
			}

			const nameLength = data.readInt16BE( _pos );
			if ( nameLength < 0 ) {
				throw new Error( "invalid length of attribute's name" );
			}

			_pos += 2;

			// --- read attribute's name
			if ( nameLength > 0 ) {
				if ( _pos + nameLength > length ) {
					throw new Error( "met EOM while reading attribute's name " );
				}

				name = data.toString( "ascii", _pos, _pos + nameLength );
				_pos += nameLength;
			} else if ( !name ) {
				throw new Error( "unexpected additional value" );
			}

			// --- read length of attribute's value
			if ( _pos + 2 > length ) {
				throw new Error( "met EOM while reading length of attribute's value: " + name );
			}

			valueLength = data.readInt16BE( _pos );
			_pos += 2;

			// --- read attribute's value
			if ( valueLength > 0 && _pos + valueLength > length ) {
				throw new Error( "met EOM while reading value of attribute: " + name );
			}

			if ( type === 0x7f ) {
				// RFC 2910, 3.5.2: support for extended value types
				if ( valueLength < 4 ) {
					throw new Error( "met EOM while reading extended value tag of attribute: " + name );
				}

				// read extended value type from first four bytes of value
				type = data.readInt32BE( _pos );
				_pos += 4;
				valueLength -= 4;
			}

			decoder = Decoders[type];
			if ( typeof decoder !== "function" ) {
				throw new Error( "unsupported type of attribute's value: " + name );
			}

			try {
				value = decoder.call( this, data, _pos, valueLength, type );
				_pos += valueLength;
			} catch ( e ) {
				throw new Error( "on converting value of attribute " + name + ": " + e );
			}

			if ( name in pool ) {
				pool[name].push( value );
			} else {
				pool[name] = [value];
			}
		}

		throw new Error( "met EOM while reading attribute type" );
	}

	/**
	 * Extracts content of IPP message (any actually passed data, e.g. print job).
	 *
	 * @param {Buffer} data raw binary encoded IPP message
	 * @param {int} pos index of first octet of data contained in IPP message
	 * @returns {int} index of first octet in `data` that hasn't been processed
	 * @protected
	 */
	_parseContent( data, pos ) {
		this.data = data.slice( pos );

		return data.length;
	}

	/**
	 * Compiles wrapped IPP message into its raw binary encoded format.
	 *
	 * @returns {Buffer} raw binary encoded IPP message
	 */
	toBuffer() {
		const chunks = { buffers: [], size: 0 };

		this._compileHeader( chunks );
		this._compileAttributeGroups( chunks );
		this._compileData( chunks );

		return Buffer.concat( chunks.buffers, chunks.size );
	}

	/**
	 * Appends binary-encoded header of IPP message to provided set of chunks.
	 *
	 * @param {ChunkSet} chunks collection of chunks used to create encoded IPP message eventually
	 * @returns {void}
	 * @protected
	 */
	_compileHeader( chunks ) {
		if ( isNaN( this.code ) ) {
			throw new Error( "missing operation-id or status-code" );
		}

		if ( isNaN( this.id ) || !this.id ) {
			throw new Error( "missing request-id" );
		}

		const version = String( this.version ).split( "." );
		const major = parseInt( version[0] );
		const minor = parseInt( version[1] );

		if ( version.length !== 2 || isNaN( major ) || isNaN( minor ) || ( major < 1 ) || ( major > 255 ) || ( minor < 0 ) || ( minor > 255 ) ) {
			throw new Error( "invalid version" );
		}

		const header = Buffer.alloc( 8 );

		header.writeInt8( major, 0 );
		header.writeInt8( minor, 1 );
		header.writeInt16BE( parseInt( this.code ), 2 );
		header.writeInt32BE( parseInt( this.id ), 4 );

		chunks.buffers.push( header );
		chunks.size += 8;
	}

	/**
	 * Appends binary-encoded set of attribute groups of current IPP message to
	 * provided set of chunks.
	 *
	 * @param {ChunkSet} chunks collection of chunks used to create encoded IPP message eventually
	 * @returns {void}
	 * @protected
	 */
	_compileAttributeGroups( chunks ) {
		if ( !this.attributes ) {
			throw new Error( "missing attributes" );
		}

		if ( typeof this.attributes !== "object" ) {
			throw new Error( "invalid attributes" );
		}

		// iterate over all attribute groups in proper order
		const groups = [ 0x01, 0x04, 0x02, 0x05 ];
		const numGroups = groups.length;

		for ( let i = 0; i < numGroups; i++ ) {
			const groupId = groups[i];
			const groupName = Data.AttributeGroup[groupId];

			if ( groupName ) {
				const attributes = this.attributes[groupName];

				if ( attributes ) {
					const names = Object.keys( attributes );
					const numNames = names.length;

					if ( numNames > 0 ) {
						// include binary tag selecting attribute group
						chunks.buffers.push( Buffer.from( [groupId] ) );
						chunks.size++;

						for ( let nameIndex = 0; nameIndex < numNames; nameIndex++ ) {
							const name = names[nameIndex];
							let values = attributes[name];

							if ( values instanceof Types.Type ) {
								values = [values];
							} else if ( !Array.isArray( values ) ) {
								throw new TypeError( "invalid set of attribute values" );
							}

							const numValues = values.length;

							for ( let valueIndex = 0; valueIndex < numValues; valueIndex++ ) {
								const value = values[valueIndex];

								this._compileAttribute( chunks, valueIndex ? "" : name, value );
							}
						}
					}
				}
			}
		}

		// include end-of-attribute-groups marker
		chunks.buffers.push( Buffer.from( [0x03] ) );
		chunks.size++;
	}

	/**
	 * Appends binary-encoded attribute to provided set of chunks.
	 *
	 * @param {ChunkSet} chunks collection of chunks used to create encoded IPP message eventually
	 * @param {string} name name of attribute
	 * @param {Type} value value of attribute
	 * @returns {void}
	 * @protected
	 */
	_compileAttribute( chunks, name, value ) {
		if ( value instanceof Types.Type ) {
			// write type and name of attribute into one buffer
			const nameBuffer = Buffer.alloc( 1 + 2 + name.length );

			nameBuffer.writeInt8( value.type, 0 );
			nameBuffer.writeInt16BE( name.length, 1 );
			nameBuffer.write( name, 3, name.length, "ascii" );

			chunks.buffers.push( nameBuffer );
			chunks.size += nameBuffer.length;

			const valueBuffer = value.toBuffer();

			chunks.buffers.push( valueBuffer );
			chunks.size += valueBuffer.length;
		} else {
			throw new TypeError( "invalid type of value: " + name );
		}
	}

	/**
	 * Appends current message's data to set of chunks.
	 *
	 * @param {ChunkSet} chunks collection of chunks used to create encoded IPP message eventually
	 * @returns {void}
	 * @protected
	 */
	_compileData( chunks ) {
		const { data } = this;

		if ( data ) {
			chunks.buffers.push( data );
			chunks.size += data.length;
		}
	}

	/**
	 * Retrieves name of current message's operation.
	 *
	 * @returns {?string} name of current message's operation, null if name is unknown
	 */
	getOperationName() {
		const map = Data.Operation;
		const code = this.code;
		const keys = Object.keys( map );

		for ( let i = 0, l = keys.length; i < l; i++ ) {
			const key = keys[i];

			if ( code === map[key] ) {
				return key;
			}
		}

		return null;
	}

	/**
	 * Creates response for current IPP request message.
	 *
	 * @param {int} statusCode status code of response message
	 * @returns {IPPMessage} derived response message
	 */
	deriveResponse( statusCode = Data.Status.successfulOk ) {
		if ( isNaN( statusCode ) ) {
			throw new Error( "invalid IPP status code" );
		}

		const response = new IPPMessage();

		// ensure response is using same version as request (for client might use
		// older version than supported by server and thus rejecting response)
		response.version = this.version;

		// set provided status code on response
		response.code = statusCode;

		// make response using same ID for referring to current request message
		response.id = this.id;

		// always provide operation attributes regarding charset and language of attributes
		response.attributes.operation["attributes-charset"] = Generate.generateCharset( "utf-8" );
		response.attributes.operation["attributes-natural-language"] = Generate.generateNaturalLanguage( "en-us" );

		return response;
	}
}

module.exports = IPPMessage;

/**
 * @typedef {object} ChunkSet
 * @property {Buffer[]} buffers list of chunks
 * @property {int} size total number of bytes of listed chunks
 */
