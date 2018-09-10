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

const UTIL = require( "util" );
const EVENTS = require( "events" );

const DATA = require( "./data" );
const TYPE = require( "./type" );
const DECODE = require( "./decode" );
const GENERATE = require( "./generate" );



/*
 * --- model of single message  ---
 */

/**
 * Wraps provided IPP message.
 *
 * @param {Buffer} rawBuffer raw binary encoded IPP message
 * @constructor
 */
function IPPMessage( rawBuffer ) {
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

UTIL.inherits( IPPMessage, EVENTS.EventEmitter );

IPPMessage.OPERATION = DATA.OPERATION;
IPPMessage.ATTRIBUTE_GROUP = DATA.ATTRIBUTE_GROUP;
IPPMessage.ATTRIBUTE_TYPE = DATA.ATTRIBUTE_TYPE;

IPPMessage.prototype._valueDecoders = DECODE.processors;

/**
 * Populates current instance's properties with information parsed from provided
 * IPP message.
 *
 * @param {Buffer} data raw binary encoded IPP message
 * @returns {void}
 * @private
 */
IPPMessage.prototype._parse = function( data ) {
	if ( data.length < 8 ) {
		throw new Error( "missing required information in message" );
	}


	let pos = 0;

	this.version = data.readInt8( pos++ ) + "." + data.readInt8( pos++ );

	this.code = data.readInt16BE( pos );
	pos += 2;

	this.id = data.readInt32BE( pos );
	pos += 4;

	this._parseAttributeGroup( data, pos );
};

/**
 * Parses provided IPP message for groups of attributes.
 *
 * @param {Buffer} data raw binary encoded IPP message
 * @param {int} pos index of next octet in IPP message to process on parsing
 * @returns {int} index of first octet in `data` that hasn't been processed
 * @private
 */
IPPMessage.prototype._parseAttributeGroup = function( data, pos ) {
	const length = data.length;

	while ( pos < length ) {
		const type = data.readUInt8( pos++ );
		const name = DATA.ATTRIBUTE_GROUP[type];

		if ( name === null ) {
			return this._parseContent( data, pos );
		} else if ( name ) {
			pos = this._parseAttributes( data, pos, this.attributes[name] );
		} else {
			throw new Error( "unsupported attribute group type" );
		}
	}

	throw new Error( "unexpected EOM" );
};

/**
 * Parses provided IPP message for attributes.
 *
 * @param {Buffer} data raw binary encoded IPP message
 * @param {int} pos index of next octet in IPP message to process
 * @param {object} pool reference on section of property this.attributes to store parsed attributes
 * @returns {int} index of first octet in `data` that hasn't been processed
 * @protected
 */
IPPMessage.prototype._parseAttributes = function( data, pos, pool ) {
	let _pos = pos;
	const length = data.length;
	let name, valueLength, value, converter;

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

		converter = this._valueDecoders[type];
		if ( typeof converter !== "function" ) {
			throw new Error( "unsupported type of attribute's value: " + name );
		}

		try {
			value = converter.call( this, data, _pos, valueLength, type );
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
};

/**
 * Extracts content of IPP message (any actually passed data, e.g. print job).
 *
 * @param {Buffer} data raw binary encoded IPP message
 * @param {int} pos index of first octet of data contained in IPP message
 * @returns {int} index of first octet in `data` that hasn't been processed
 * @protected
 */
IPPMessage.prototype._parseContent = function( data, pos ) {
	this.data = data.slice( pos );

	return data.length;
};

/**
 * Compiles wrapped IPP message into its raw binary encoded format.
 *
 * @returns {Buffer} raw binary encoded IPP message
 */
IPPMessage.prototype.toBuffer = function() {
	const buffers = [0];

	this._compileHeader( buffers );
	this._compileAttributeGroups( buffers );
	this._compileData( buffers );

	const totalLength = buffers.shift();

	const compiled = Buffer.concat( buffers, totalLength );

	require( "fs" ).writeFile( require( "path" ).join( require.main.filename, "../compiled.ipp" ), compiled );

	return compiled;
};

IPPMessage.prototype._compileHeader = function( buffers ) {
	const header = new Buffer( 8 );

	const version = String( this.version ).split( "." );

	const major = parseInt( version[0] );
	const minor = parseInt( version[1] );

	if ( version.length !== 2 || isNaN( major ) || isNaN( minor ) || ( major < 1 ) || ( major > 255 ) || ( minor < 0 ) || ( minor > 255 ) ) {
		throw new Error( "invalid version" );
	}

	header.writeInt8( major, 0 );
	header.writeInt8( minor, 1 );

	if ( isNaN( this.code ) ) {
		throw new Error( "missing operation-id/status-code" );
	}

	header.writeInt16BE( parseInt( this.code ), 2 );

	if ( isNaN( this.id ) || !this.id ) {
		throw new Error( "missing request-id" );
	}

	header.writeInt32BE( parseInt( this.id ), 4 );


	// append local buffer to set of buffers used to compile whole message finally
	buffers.push( header );
	buffers[0] += 8;    // first element in set is used to track resulting total length of message
};

/**
 * @param {string[]} sortedGroupNames sorted list of groups' names
 * @return {string[]}
 */
function getProperlySortedGroups( sortedGroupNames ) {
	const map = DATA.ATTRIBUTE_GROUP;
	const nums = Object.keys( map );
	const flip = {};

	// get map of names in provided list into their positional indexes in that list
	sortedGroupNames.forEach( function( name, index ) {
		if ( isNaN( flip[name] ) ) {
			flip[name] = index;
		}
	} );

	// sort numeric values of attribute groups (preferring provided names in
	// given order and ensuring ending group delimiter is put last)
	return nums.sort( function( l, r ) {
		// get every numeric values' related name of attribute group
		l = map[l];
		r = map[r];

		// get positional index of either name in provided set or some fixed position
		l = l in flip ? flip[l] : l === null ? 999999 : 99999;
		r = r in flip ? flip[r] : r === null ? 999999 : 99999;

		// compare either positional index
		return l - r;
	} );
}

IPPMessage.prototype._compileAttributeGroups = function( buffers ) {
	if ( !this.attributes ) {
		throw new Error( "missing attributes" );
	}

	if ( typeof this.attributes !== "object" ) {
		throw new Error( "invalid attributes" );
	}

	// iterate over all attribute groups (IN PROPER ORDER!)
	const that = this;

	getProperlySortedGroups( [ "operation", "printer", "job", "unsupported" ] )
		.forEach( tag => {
			const name = DATA.ATTRIBUTE_GROUP[tag];
			if ( name ) {
				const attributes = that.attributes[name];
				if ( attributes && Object.keys( attributes ).length > 0 ) {
					// include binary tag selecting attribute group
					const buffer = new Buffer( 1 );
					buffer.writeInt8( tag, 0 );
					buffers.push( buffer );
					buffers[0]++;

					that._compileAttributeGroup( buffers, attributes );
				}
			}
		} );

	// include end-of-attribute-groups marker
	const buffer = new Buffer( 1 );
	buffer.writeInt8( 0x03, 0 );
	buffers.push( buffer );
	buffers[0]++;
};

IPPMessage.prototype._compileAttributeGroup = function( buffers, pool ) {
	const that = this;
	Object.keys( pool ).forEach( function( name ) {
		let values = pool[name];

		if ( values instanceof TYPE.Type ) {
			values = [values];
		} else if ( !Array.isArray( values ) ) {
			throw new Error( "invalid set of attribute values" );
		}

		values.forEach( function( value, index ) {
			that._compileAttribute( buffers, index ? "" : name, value );
		} );
	} );
};

IPPMessage.prototype._compileAttribute = function( buffers, name, value ) {
	if ( value instanceof TYPE.Type ) {
		// write type and name of attribute into one buffer
		let buffer = new Buffer( 1 + 2 + name.length );
		buffer.writeInt8( value.type, 0 );
		buffer.writeInt16BE( name.length, 1 );
		buffer.write( name, 3, name.length, "ascii" );
		buffers.push( buffer );
		buffers[0] += buffer.length;

		// fetch compiled value from its type handler
		buffer = value.toBuffer();
		buffers.push( buffer );
		buffers[0] += buffer.length;
	} else {
		throw new Error( "invalid type of value: " + name );
	}
};

IPPMessage.prototype._compileData = function( buffers ) {
	if ( this.data ) {
		// append data to set of buffers used to compile whole message finally
		buffers.push( this.data );
		buffers[0] += this.data.length;    // first element in set is used to track resulting total length of message
	}
};

/**
 * Retrieves name of current message's operation.
 *
 * @returns {?string} name of current message's operation, null if name is unknown
 */
IPPMessage.prototype.getOperationName = function() {
	const m = IPPMessage.OPERATION;
	const c = this.code;
	const s = Object.keys( m );

	for ( let i = 0, l = s.length; i < l; i++ ) {
		if ( c === m[s[i]] ) {
			return s[i];
		}
	}

	return null;
};

IPPMessage.prototype.deriveResponse = function( statusCode ) {
	if ( arguments.length < 1 ) {
		statusCode = DATA.STATUS.successfulOk;
	} else if ( isNaN( statusCode ) ) {
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
	response.attributes.operation["attributes-charset"] = GENERATE.generateCharset( "utf-8" );
	response.attributes.operation["attributes-natural-language"] = GENERATE.generateNaturalLanguage( "en-us" );

	return response;
};



// --- public API ---

module.exports.IPPMessage = IPPMessage;
