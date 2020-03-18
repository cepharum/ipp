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

const { AttributeType, MinInteger, MaxInteger } = require( "./data" );
const Types = require( "./types" );

const ptnAscii = /^[\x00-\x7f]*$/; // eslint-disable-line no-control-regex


/**
 * Generates selected type of value for representing provided ASCII string.
 *
 * @param {int} type type identifier
 * @param {string} string ASCII string to be represented
 * @return {TypeNative} resulting type object
 */
function generateAsciiString( type, string ) {
	if ( typeof string !== "string" || !ptnAscii.test( string ) ) {
		throw new TypeError( "invalid string" );
	}

	return new Types.TypeNative( type, string );
}


module.exports = {
	// out-of-band data

	/**
	 * Generates object representing "default value".
	 *
	 * @returns {TypeDefault} generated value
	 */
	generateDefault: () => new Types.TypeDefault(),

	/**
	 * Generates object representing "unknown value".
	 *
	 * @returns {TypeUnknown} generated value
	 */
	generateUnknown: () => new Types.TypeUnknown(),

	/**
	 * Generates object representing "no value".
	 *
	 * @returns {TypeNoValue} generated value
	 */
	generateNoValue: () => new Types.TypeNoValue(),


	// integer data

	/**
	 * Generates object representing single integer value.
	 *
	 * @param {int} intValue value to be represented
	 * @returns {TypeNative} generated value
	 */
	generateInteger: intValue => {
		if ( intValue < MinInteger || intValue > MaxInteger || isNaN( intValue ) ) {
			throw new TypeError( "invalid integer value" );
		}

		return new Types.TypeNative( AttributeType.integer, parseInt( intValue ) || 0 );
	},

	/**
	 * Generates object representing single boolean value.
	 *
	 * @param {boolean} boolValue value to be represented
	 * @returns {TypeNative} generated value
	 */
	generateBoolean: boolValue => new Types.TypeNative( AttributeType.boolean, Boolean( boolValue ) ),

	/**
	 * Generates object representing one value out of an enumeration of possible
	 * values.
	 *
	 * @template T
	 * @param {int|T} value value to represent or index of value into given set of values
	 * @param {Array.<T>=} setOfValues list of available values
	 * @returns {TypeNative} generated value
	 */
	generateEnum: ( value, setOfValues ) => {
		let intValue;

		if ( value > 1 && value < MaxInteger ) {
			intValue = parseInt( value );
		} else if ( Array.isArray( setOfValues ) ) {
			intValue = setOfValues.indexOf( value );
			if ( intValue < 0 ) {
				throw new TypeError( "invalid enum value" );
			}
		} else {
			throw new TypeError( "invalid set of enum values" );
		}

		return new Types.TypeNative( AttributeType.enum, intValue );
	},


	// binary / octet-string data

	/**
	 * Generates object representing string of arbitrary octets.
	 *
	 * @param {Buffer} dataBuffer string of octets to represent
	 * @returns {TypeNative} generated value
	 */
	generateOctetString: dataBuffer => {
		if ( !Buffer.isBuffer( dataBuffer ) ) {
			throw new TypeError( "invalid octet-string" );
		}

		return new Types.TypeNative( AttributeType.octetString, dataBuffer );
	},

	/**
	 * Generates object representing date/time information.
	 *
	 * @param {Date} timestamp date/time information to represent
	 * @returns {TypeNative} generated value
	 */
	generateDateTime: timestamp => {
		if ( !( timestamp instanceof Date ) ) {
			throw new Error( "invalid date/time information" );
		}

		return new Types.TypeNative( AttributeType.dateTime, timestamp );
	},

	/**
	 * Generates object representing two-dimensional resolution information.
	 *
	 * @param {int} resolutionX non-negative horizontal resolution
	 * @param {int} resolutionY non-negative vertical resolution
	 * @param {int} unit either TypeResolution.PerCm or TypeResolution.PerInch
	 * @returns {TypeResolution} generated value
	 */
	generateResolution: ( resolutionX, resolutionY, unit ) => {
		if ( isNaN( resolutionX ) || resolutionX < 0 || isNaN( resolutionY ) || resolutionY < 0 ) {
			throw new TypeError( "invalid resolution values" );
		}

		if ( unit !== Types.TypeResolution.PER_INCH && unit !== Types.TypeResolution.PER_CM ) {
			throw new TypeError( "unsupported resolution unit" );
		}

		return new Types.TypeResolution( parseInt( resolutionX ), parseInt( resolutionY ), unit );
	},

	/**
	 * Generates object representing range between to given integer values.
	 *
	 * @param {int} min lower limit of range
	 * @param {int} max upper limit of range
	 * @returns {TypeRange} generated value
	 */
	generateRangeOfInteger: ( min, max ) => {
		if ( isNaN( min ) || isNaN( max ) ) {
			throw new TypeError( "invalid bounding values" );
		}

		return new Types.TypeRange( Math.min( min, max ), Math.max( min, max ) );
	},

	/**
	 * Generates arbitrary string localized in selected locale.
	 *
	 * @param {string} text localized text
	 * @param {string} language locale of text
	 * @returns {TypeStringWithLanguage} generated value
	 */
	generateTextWithLanguage: ( text, language ) => {
		if ( typeof text !== "string" || typeof language !== "string" || language.trim().length === 0 ) {
			throw new TypeError( "invalid pair of strings" );
		}

		return new Types.TypeStringWithLanguage( AttributeType.textWithLanguage, text, language );
	},

	/**
	 * Generates localized name, which is a string with limited set of permitted
	 * characters.
	 *
	 * @param {string} name localized name
	 * @param {string} language locale of name
	 * @returns {TypeStringWithLanguage} generated value
	 */
	generateNameWithLanguage: ( name, language ) => {
		if ( typeof name !== "string" || typeof language !== "string" || language.trim().length === 0 ) {
			throw new TypeError( "invalid pair of strings" );
		}

		return new Types.TypeStringWithLanguage( AttributeType.nameWithLanguage, name, language );
	},

	// string data

	/**
	 * Generates arbitrary text without information on its locale.
	 *
	 * @param {string} text text to represent
	 * @returns {TypeNative} generated value
	 */
	generateTextWithoutLanguage: text => {
		if ( typeof text !== "string" ) {
			throw new TypeError( "invalid text string" );
		}

		return new Types.TypeNative( AttributeType.textWithoutLanguage, text );
	},

	/**
	 * Generates name without information on its locale.
	 *
	 * @param {string} name name to represent
	 * @returns {TypeNative} generated value
	 */
	generateNameWithoutLanguage: name => {
		if ( typeof name !== "string" ) {
			throw new TypeError( "invalid text string" );
		}

		return new Types.TypeNative( AttributeType.nameWithoutLanguage, name );
	},

	/**
	 * Generates keyword consisting of ASCII string with limited set of
	 * characters permitted.
	 *
	 * @param {string} keyword US ASCII-encoded keyword
	 * @returns {TypeNative} generated value
	 */
	generateKeyword: keyword => generateAsciiString( AttributeType.keyword, keyword ),

	/**
	 * Generates URL value.
	 *
	 * @param {string} url US ASCII-string URL
	 * @returns {TypeNative} generated value
	 */
	generateUri: url => generateAsciiString( AttributeType.uri, url ),

	/**
	 * Generates URI scheme information.
	 *
	 * @param {string} uriScheme US ASCII-encoded string describing URI scheme
	 * @returns {TypeNative} generated value
	 */
	generateUriScheme: uriScheme => generateAsciiString( AttributeType.uriScheme, uriScheme ),

	/**
	 * Generates charset information.
	 *
	 * @param {string} charset US ASCII-encoded string describing character set
	 * @returns {TypeNative} generated value
	 */
	generateCharset: charset => generateAsciiString( AttributeType.charset, charset ),

	/**
	 * Generates information on some natural language.
	 *
	 * @param {string} string US ASCII-encoded language selector
	 * @returns {TypeNative} generated value
	 */
	generateNaturalLanguage: string => generateAsciiString( AttributeType.naturalLanguage, string ),

	/**
	 * Generates selector of MIME type.
	 *
	 * @param {string} mime US ASCII-encoded MIME string
	 * @returns {TypeNative} generated value
	 */
	generateMimeMediaType: mime => generateAsciiString( AttributeType.mimeMediaType, mime ),
};
