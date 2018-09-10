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
const DATA = require( "./data" );


/**
 * Generically represents attribute's value of custom (non-scalar) type.
 *
 * @constructor
 */
function Type( type ) {
	this.type = type;
}

Type.prototype.toBuffer = function() {
	// indicate missing subclass ...
	throw new Error( "generic type must not be converted to buffer" );
};

Type.prototype._emptyValueToBuffer = function() {
	const buffer = new Buffer( 2 );
	buffer.writeInt16BE( 0, 0 );

	return buffer;
};



/**
 * Represents an attribute's value supported by Javascript native types such as
 * strings, integers, booleans or Date.
 *
 * @param {int} type type marker found in
 * @param {*} value native value to be wrapped
 * @constructor
 */
function TypeNative( type, value ) {
	Type.call( this, type );

	this.value = value;
}

UTIL.inherits( TypeNative, Type );

TypeNative.prototype.toBuffer = function() {
	let data, length;

	if ( Buffer.isBuffer( this.value ) ) {
		return this.value;
	}

	if ( this.value instanceof Date ) {
		data = new Buffer( 13 );
		data.writeInt16BE( 11, 0 );                         // length of value
		data.writeInt16BE( this.value.getFullYear(), 2 );
		data.writeInt8( this.value.getMonth(), 4 );
		data.writeInt8( this.value.getDate(), 5 );
		data.writeInt8( this.value.getHours(), 6 );
		data.writeInt8( this.value.getMinutes(), 7 );
		data.writeInt8( this.value.getSeconds(), 8 );
		data.writeInt8( Math.floor( this.value.getMilliseconds() / 100 ), 9 );

		const shift = this.value.getTimezoneOffset();
		data.write( shift < 0 ? "+" : "-", 10, 1, "ascii" );
		data.writeInt8( Math.floor( Math.abs( shift ) / 60 ), 11 );
		data.writeInt8( Math.abs( shift ) % 60, 12 );

		return data;
	}

	if ( typeof this.value === "string" ) {
		data = new Buffer( this.value, "utf8" );
		length = new Buffer( 2 );
		length.writeInt16BE( data.length, 0 );

		return Buffer.concat( [ length, data ] );
	}

	if ( this.value === true || this.value === false ) {
		data = new Buffer( 3 );
		data.writeInt16BE( 1, 0 );                          // length of value
		data.writeInt8( this.value ? 1 : 0, 2 );            // value

		return data;
	}

	const temporary = parseInt( this.value );
	if ( !isNaN( temporary ) ) {
		data = new Buffer( 6 );
		data.writeInt16BE( 4, 0 );                          // length of value
		data.writeInt32BE( temporary, 2 );                  // value

		return data;
	}

	throw new Error( "unsupported native value" );
};



/**
 * Represents attribute's out-of-band value of type "default".
 *
 * @constructor
 */
function TypeDefault() {
	Type.call( this, DATA.ATTRIBUTE_TYPE.default );
}

UTIL.inherits( TypeDefault, Type );

TypeDefault.prototype.toBuffer = Type.prototype._emptyValueToBuffer;



/**
 * Represents attribute's out-of-band value of type "unknown".
 *
 * @constructor
 */
function TypeUnknown() {
	Type.call( this, DATA.ATTRIBUTE_TYPE.unknown );
}

UTIL.inherits( TypeUnknown, Type );

TypeUnknown.prototype.toBuffer = Type.prototype._emptyValueToBuffer;



/**
 * Represents attribute's out-of-band value of type "no-value".
 *
 * @constructor
 */
function TypeNoValue() {
	Type.call( this, DATA.ATTRIBUTE_TYPE.noValue );
}

UTIL.inherits( TypeNoValue, Type );

TypeNoValue.prototype.toBuffer = Type.prototype._emptyValueToBuffer;



/**
 * Represents attribute's value of type "resolution" consisting of resolution
 * on x- and y-axis and some unit information.
 *
 * @constructor
 */
function TypeResolution( x, y, unit ) {
	if ( unit !== TypeResolution.PER_INCH && unit !== TypeResolution.PER_CM ) {
		throw new Error( "unsupported resolution unit" );
	}

	Type.call( this, DATA.ATTRIBUTE_TYPE.resolution );

	/**
	 * resolution on x-axis
	 *
	 * @type {int}
	 */
	this.x = x;

	/**
	 * resolution on y-axis
	 *
	 * @type {int}
	 */
	this.y = y;

	/**
	 * unit of resolution
	 */
	this.unit = unit;
}

UTIL.inherits( TypeResolution, Type );

TypeResolution.prototype.toBuffer = function() {
	const data = new Buffer( 11 );
	data.writeInt16BE( 9, 0 );                              // length of value
	data.writeInt32BE( parseInt( this.x ) || 0, 2 );
	data.writeInt32BE( parseInt( this.y ) || 0, 6 );
	data.writeInt8( parseInt( this.unit ) || TypeResolution.PER_INCH, 10 );

	return data;
};

TypeResolution.PER_INCH = 3;
TypeResolution.PER_CM = 4;



/**
 * Represents attribute's value of type "resolution".
 *
 * @constructor
 */
function TypeRange( lower, upper ) {
	Type.call( this, DATA.ATTRIBUTE_TYPE.rangeOfInteger );

	/**
	 * lower limit of range
	 *
	 * @type {int}
	 */
	this.lower = this.min = Math.min( lower, upper );

	/**
	 * upper limit of range
	 *
	 * @type {int}
	 */
	this.upper = this.max = Math.max( lower, upper );
}

UTIL.inherits( TypeRange, Type );

TypeRange.prototype.toBuffer = function() {
	const data = new Buffer( 10 );
	data.writeInt16BE( 9, 0 );                              // length of value
	data.writeInt32BE( parseInt( this.lower ) || 0, 2 );
	data.writeInt32BE( parseInt( this.upper ) || 0, 6 );

	return data;
};



/**
 * Represents attribute's value of type "textWithLanguage" or
 * "nameWithLanguage" by combining some localized string with information on
 * string's locale.
 *
 * @constructor
 */
function TypeStringWithLanguage( type, string, language ) {
	if ( type !== DATA.ATTRIBUTE_TYPE.nameWithLanguage && type !== DATA.ATTRIBUTE_TYPE.textWithLanguage ) {
		throw new Error( "invalid/unknown type of *WithLanguage" );
	}

	Type.call( this, type );

	/**
	 * localized text or name
	 *
	 * @type {string}
	 */
	this.string = this.name = this.text = string;

	/**
	 * locale of text/name, e.g. "en-us"
	 *
	 * @type {string}
	 */
	this.language = this.locale = language;
}

UTIL.inherits( TypeStringWithLanguage, Type );

TypeStringWithLanguage.prototype.toBuffer = function() {
	const string = new Buffer( this.value, "utf8" );
	const stringLength = new Buffer( 2 );
	stringLength.writeInt16BE( string.length, 0 );

	const language = new Buffer( this.value, "utf8" );
	const languageLength = new Buffer( 2 );
	languageLength.writeInt16BE( language.length, 0 );

	return Buffer.concat( [ languageLength, language, stringLength, string ] );
};



// --- public API ---

module.exports.Type = Type;
module.exports.TypeNative = TypeNative;
module.exports.TypeDefault = TypeDefault;
module.exports.TypeUnknown = TypeUnknown;
module.exports.TypeNoValue = TypeNoValue;
module.exports.TypeResolution = TypeResolution;
module.exports.TypeRange = TypeRange;
module.exports.TypeStringWithLanguage = TypeStringWithLanguage;
