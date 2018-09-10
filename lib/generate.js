/**
 * (c) 2015 cepharum GmbH, Berlin, http://cepharum.de
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
 * @author: cepharum
 */

"use strict";

const DATA = require( "./data" );
const TYPE = require( "./type" );
const ATTR = require( "./data" ).ATTRIBUTE_TYPE;

const ptnAscii = /^[\x00-\x7f]*$/; // eslint-disable-line no-control-regex


function generateAsciiString( type, string ) {
	if ( typeof string !== "string" || !ptnAscii.test( string ) ) {
		throw new Error( "invalid string" );
	}

	return new TYPE.TypeNative( type, string );
}




module.exports = {
	// out-of-band data

	/**
	 * @returns {TypeDefault}
	 */
	generateDefault: () => new TYPE.TypeDefault(),

	/**
	 * @returns {TypeUnknown}
	 */
	generateUnknown: () => new TYPE.TypeUnknown(),

	/**
	 * @returns {TypeNoValue}
	 */
	generateNoValue: () => new TYPE.TypeNoValue(),

	// integer data

	/**
	 * @param {int} intValue
	 * @returns {TypeNative}
	 */
	generateInteger: intValue => {
		if ( intValue < DATA.MIN || intValue > DATA.MAX || isNaN( intValue ) ) {
			throw new Error( "invalid integer value" );
		}

		return new TYPE.TypeNative( ATTR.integer, parseInt( intValue ) || 0 );
	},

	/**
	 * @param {boolean} boolValue
	 * @returns {TypeNative}
	 */
	generateBoolean: boolValue => new TYPE.TypeNative( ATTR.boolean, Boolean( boolValue ) ),

	/**
	 * @template T
	 * @param {int|T} value
	 * @param {Array.<T>=} setOfValues
	 * @returns {TypeNative}
	 */
	generateEnum: ( value, setOfValues ) => {
		let intValue;

		if ( value > 1 && value < DATA.MAX ) {
			intValue = parseInt( value );
		} else if ( Array.isArray( setOfValues ) ) {
			intValue = setOfValues.indexOf( value );
			if ( intValue < 0 ) {
				throw new Error( "invalid enum value" );
			}
		} else {
			throw new Error( "invalid set of enum values" );
		}

		return new TYPE.TypeNative( ATTR.enum, intValue );
	},

	// binary / octet-string data

	/**
	 * @param {Buffer} dataBuffer
	 * @returns {TypeNative}
	 */
	generateOctetString: dataBuffer => {
		if ( !Buffer.isBuffer( dataBuffer ) ) {
			throw new Error( "invalid octet-string" );
		}

		return new TYPE.TypeNative( ATTR.octetString, dataBuffer );
	},

	/**
	 * @param {Date} timestamp
	 * @returns {TypeNative}
	 */
	generateDateTime: timestamp => {
		if ( !( timestamp instanceof Date ) ) {
			throw new Error( "invalid date/time information" );
		}

		return new TYPE.TypeNative( ATTR.dateTime, timestamp );
	},

	/**
	 * @param {int} resolutionX non-negative horizontal resolution
	 * @param {int} resolutionY non-negative vertical resolution
	 * @param {int} unit one of TypeResolution.PER_CM or TypeResolution.PER_INCH
	 * @returns {TypeResolution}
	 */
	generateResolution: ( resolutionX, resolutionY, unit ) => {
		if ( isNaN( resolutionX ) || resolutionX < 0 || isNaN( resolutionY ) || resolutionY < 0 ) {
			throw new Error( "invalid resolution values" );
		}

		if ( unit !== TYPE.TypeResolution.PER_INCH && unit !== TYPE.TypeResolution.PER_CM ) {
			throw new Error( "unsupported resolution unit" );
		}

		return new TYPE.TypeResolution( parseInt( resolutionX ), parseInt( resolutionY ), unit );
	},

	/**
	 * @param {int} min
	 * @param {int} max
	 * @returns {TypeRange}
	 */
	generateRangeOfInteger: ( min, max ) => {
		if ( isNaN( min ) || isNaN( max ) ) {
			throw new Error( "invalid bounding values" );
		}

		return new TYPE.TypeRange( Math.min( min, max ), Math.max( min, max ) );
	},

	/**
	 * @param {string} text
	 * @param {string} language
	 * @returns {TypeStringWithLanguage}
	 */
	generateTextWithLanguage: ( text, language ) => {
		if ( typeof text !== "string" || typeof language !== "string" || language.trim().length === 0 ) {
			throw new Error( "invalid pair of strings" );
		}

		return new TYPE.TypeStringWithLanguage( ATTR.textWithLanguage, text, language );
	},

	/**
	 * @param {string} name
	 * @param {string} language
	 * @returns {TypeStringWithLanguage}
	 */
	generateNameWithLanguage: ( name, language ) => {
		if ( typeof name !== "string" || typeof language !== "string" || language.trim().length === 0 ) {
			throw new Error( "invalid pair of strings" );
		}

		return new TYPE.TypeStringWithLanguage( ATTR.nameWithLanguage, name, language );
	},

	// string data

	/**
	 * @param {string} text string
	 * @returns {TypeNative}
	 */
	generateTextWithoutLanguage: text => {
		if ( typeof text !== "string" ) {
			throw new Error( "invalid text string" );
		}

		return new TYPE.TypeNative( ATTR.textWithoutLanguage, text );
	},

	/**
	 * @param {string} name string
	 * @returns {TypeNative}
	 */
	generateNameWithoutLanguage: name => {
		if ( typeof name !== "string" ) {
			throw new Error( "invalid text string" );
		}

		return new TYPE.TypeNative( ATTR.nameWithoutLanguage, name );
	},

	/**
	 * @param {string} string US ASCII string
	 * @returns {TypeNative}
	 */
	generateKeyword: string => generateAsciiString( ATTR.keyword, string ),

	/**
	 * @param {string} string US ASCII string
	 * @returns {TypeNative}
	 */
	generateUri: string => generateAsciiString( ATTR.uri, string ),

	/**
	 * @param {string} string US ASCII string
	 * @returns {TypeNative}
	 */
	generateUriScheme: string => generateAsciiString( ATTR.uriScheme, string ),

	/**
	 * @param {string} string US ASCII string
	 * @returns {TypeNative}
	 */
	generateCharset: string => generateAsciiString( ATTR.charset, string ),

	/**
	 * @param {string} string US ASCII string
	 * @returns {TypeNative}
	 */
	generateNaturalLanguage: string => generateAsciiString( ATTR.naturalLanguage, string ),

	/**
	 * @param {string} string US ASCII string
	 * @returns {TypeNative}
	 */
	generateMimeMediaType: string => generateAsciiString( ATTR.mimeMediaType, string ),

	PER_INCH: TYPE.TypeResolution.PER_INCH,
	PER_CM: TYPE.TypeResolution.PER_CM
};
