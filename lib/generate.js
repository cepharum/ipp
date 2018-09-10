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

var DATA = require( "./data" );
var TYPE = require( "./type" );
var ATTR = require( "./data" ).ATTRIBUTE_TYPE;



var ptnAscii = /^[\x00-\x7f]*$/;


function generateAsciiString( type, string ) {
	"use strict";

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

	generateDefault: function() {
		"use strict";
		return new TYPE.TypeDefault();
	},

	/**
	 * @returns {TypeUnknown}
	 */

	generateUnknown: function() {
		"use strict";
		return new TYPE.TypeUnknown();
	},

	/**
	 * @returns {TypeNoValue}
	 */

	generateNoValue: function() {
		"use strict";
		return new TYPE.TypeNoValue();
	},

	// integer data

	/**
	 * @param {int} intValue
	 * @returns {TypeNative}
	 */

	generateInteger: function( intValue ) {
		"use strict";

		if ( intValue < DATA.MIN || intValue > DATA.MAX || isNaN( intValue ) ) {
			throw new Error( "invalid integer value" );
		}

		return new TYPE.TypeNative( ATTR.integer, parseInt( intValue ) || 0 );
	},

	/**
	 * @param {boolean} boolValue
	 * @returns {TypeNative}
	 */

	generateBoolean: function( boolValue ) {
		"use strict";

		return new TYPE.TypeNative( ATTR.boolean, !!boolValue );
	},

	/**
	 * @template T
	 * @param {int|T} value
	 * @param {Array.<T>=} setOfValues
	 * @returns {TypeNative}
	 */

	generateEnum: function( value, setOfValues ) {
		"use strict";

		var intValue;

		if ( value > 1 && value < DATA.MAX ) {
			intValue = parseInt( value );
		} else if ( !Array.isArray( setOfValues ) ) {
			throw new Error( "invalid set of enum values" );

			intValue = setOfValues.indexOf( value );
			if ( intValue < 0 ) {
				throw new Error( "invalid enum value" );
			}
		}

		return new TYPE.TypeNative( ATTR.enum, intValue );
	},

	// binary / octet-string data

	/**
	 * @param {Buffer} dataBuffer
	 * @returns {TypeNative}
	 */

	generateOctetString: function( dataBuffer ) {
		"use strict";

		if ( !Buffer.isBuffer( dataBuffer ) ) {
			throw new Error( "invalid octet-string" );
		}

		return new TYPE.TypeNative( ATTR.octetString, dataBuffer );
	},

	/**
	 * @param {Date} timestamp
	 * @returns {TypeNative}
	 */

	generateDateTime: function( timestamp ) {
		"use strict";

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

	generateResolution: function( resolutionX, resolutionY, unit ) {
		"use strict";

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

	generateRangeOfInteger: function( min, max ) {
		"use strict";

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

	generateTextWithLanguage: function( text, language ) {
		"use strict";

		if ( typeof text !== "string" || typeof language !== "string" || language.trim().length == 0 ) {
			throw new Error( "invalid pair of strings" );
		}

		return new TYPE.TypeStringWithLanguage( ATTR.textWithLanguage, text, language );
	},

	/**
	 * @param {string} name
	 * @param {string} language
	 * @returns {TypeStringWithLanguage}
	 */

	generateNameWithLanguage: function( name, language ) {
		"use strict";

		if ( typeof name !== "string" || typeof language !== "string" || language.trim().length == 0 ) {
			throw new Error( "invalid pair of strings" );
		}

		return new TYPE.TypeStringWithLanguage( ATTR.nameWithLanguage, name, language );
	},

	// string data

	/**
	 * @param {string} string string
	 * @returns {TypeNative}
	 */

	generateTextWithoutLanguage: function( text ) {
		"use strict";

		if ( typeof text !== "string" ) {
			throw new Error( "invalid text string" );
		}

		return new TYPE.TypeNative( ATTR.textWithoutLanguage, text );
	},

	/**
	 * @param {string} string string
	 * @returns {TypeNative}
	 */

	generateNameWithoutLanguage: function( name ) {
		"use strict";

		if ( typeof name !== "string" ) {
			throw new Error( "invalid text string" );
		}

		return new TYPE.TypeNative( ATTR.textWithoutLanguage, name );
	},

	/**
	 * @param {string} string US ASCII string
	 * @returns {TypeNative}
	 */

	generateKeyword: function( string ) {
		return generateAsciiString( ATTR.keyword, string );
	},

	/**
	 * @param {string} string US ASCII string
	 * @returns {TypeNative}
	 */

	generateUri: function( string ) {
		return generateAsciiString( ATTR.uri, string );
	},

	/**
	 * @param {string} string US ASCII string
	 * @returns {TypeNative}
	 */

	generateUriScheme: function( string ) {
		return generateAsciiString( ATTR.uriScheme, string );
	},

	/**
	 * @param {string} string US ASCII string
	 * @returns {TypeNative}
	 */

	generateCharset: function( string ) {
		return generateAsciiString( ATTR.charset, string );
	},

	/**
	 * @param {string} string US ASCII string
	 * @returns {TypeNative}
	 */

	generateNaturalLanguage: function( string ) {
		return generateAsciiString( ATTR.naturalLanguage, string );
	},

	/**
	 * @param {string} string US ASCII string
	 * @returns {TypeNative}
	 */

	generateMimeMediaType: function( string ) {
		return generateAsciiString( ATTR.mimeMediaType, string );
	},

	PER_INCH: TYPE.TypeResolution.PER_INCH,
	PER_CM: TYPE.TypeResolution.PER_CM
};
