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

const DATA = require( "./data" );
const TYPE = require( "./type" );



/**
 * Maps tags selecting type of an attribute's value into function capable of
 * extracting the value.
 *
 * This map is used to extract value from raw binary encoded IPP message. Every
 * method is invoked with IPP message, index of first octet of value to extract
 * and the declared number of octets used to describe the value. Finally the
 * tag on value's type is passed in fourth argument to support shared methods.
 *
 * @type {{int: Function}}
 */

const decoders = {
	// out-of-band data
	0x11: () => new TYPE.TypeDefault(),
	0x12: () => new TYPE.TypeUnknown(),
	0x13: () => new TYPE.TypeNoValue(),

	// integer data
	0x21: ( data, pos, length, type ) => {
		if ( length !== 4 ) {
			throw new Error( "invalid integer size" );
		}

		return new TYPE.TypeNative( type, data.readInt32BE( pos ) );
	},
	0x22: ( data, pos, length, type ) => {
		if ( length !== 1 ) {
			throw new Error( "invalid size of bool" );
		}

		return new TYPE.TypeNative( type, data.readInt8( pos ) !== 0 );
	},
	0x23: 0x21,   // enum is encoded like integer

	// binary / octet-string data
	0x30: ( data, pos, length, type ) => new TYPE.TypeNative( type, data.slice( pos, pos + length ) ),
	0x31: ( data, pos, length, type ) => {
		if ( length !== 11 ) {
			throw new Error( "invalid size" );
		}

		// extract date/time
		const year = data.readUInt16BE( pos );
		const month = data.readUInt8( pos + 2 );
		const day = data.readUInt8( pos + 3 );
		const hour = data.readUInt8( pos + 4 );
		const minute = data.readUInt8( pos + 5 );
		const second = data.readUInt8( pos + 6 );
		const deci = data.readUInt8( pos + 7 );

		// extract information on distance from UTC (timezone)
		const utcDir = data.toString( "ascii", pos + 8, pos + 9 );
		let utcMinutes = data.readUInt8( pos + 9 ) + ( 60 * data.readUInt8( pos + 10 ) );
		if ( utcDir === "-" ) {
			utcMinutes = -utcMinutes;
		} else if ( utcDir !== "+" ) {
			throw new Error( "invalid timezone offset" );
		}

		// compile into native timestamp
		const timestamp = new Date( year, month, day, hour, minute, second, deci * 100 );

		// date was falsely considering given time to be local time above
		// -> translate from local timezone to declared one (so Date() is storing proper UTC finally)
		let ts = timestamp.getTime();
		// - convert from local timezone to UTC (e.g. from local 10am to 10am UTC)
		ts -= timestamp.getTimezoneOffset() * 60;   // on +02:00 this is returning -120, thus adding
		// - convert from UTC to declared timezone (e.g. from 10am UTC to declared 10am)
		ts -= utcMinutes;                           // on +02:00 utcMinutes is 120, thus correcting properly
		timestamp.setTime( ts );


		return new TYPE.TypeNative( type, timestamp );
	},
	0x32: ( data, pos, length ) => {
		if ( length !== 9 ) {
			throw new Error( "invalid size" );
		}

		const x = data.readInt32BE( pos );
		const y = data.readInt32BE( pos + 4 );
		const unit = data.readInt8( pos + 8 );

		return new TYPE.TypeResolution( x, y, unit );
	},
	0x33: ( data, pos, length ) => {
		if ( length !== 8 ) {
			throw new Error( "invalid size" );
		}

		const lower = data.readInt32BE( pos );
		const upper = data.readInt32BE( pos + 4 );

		return new TYPE.TypeRange( lower, upper );
	},
	0x35: ( data, pos, length, type ) => {
		const typeName = ( type === DATA.ATTRIBUTE_TYPE.textWithLanguage ? "text" : "name" ) + "WithLanguage";

		// read length of included naturalLanguage
		if ( length < 2 ) {
			throw new Error( "met EOM while reading length of naturalLanguage" );
		}

		const languageLength = data.readInt16BE( pos );
		pos += 2;

		// read included naturalLanguage
		if ( length < 2 + languageLength ) {
			throw new Error( "met EOM while reading naturalLanguage" );
		}

		const language = data.toString( "ascii", pos, pos + languageLength );
		pos += languageLength;

		// read length of included *WithoutLanguage
		if ( length < 4 + languageLength ) {
			throw new Error( "met EOM while reading length of included " + typeName );
		}

		const stringLength = data.readInt16BE( pos );
		pos += 2;

		// read included *WithoutLanguage
		if ( length < 4 + languageLength + stringLength ) {
			throw new Error( "met EOM while reading included " + typeName );
		}

		const string = data.toString( pos, pos + stringLength );
		pos += stringLength;

		if ( pos < length ) {
			throw new Error( "invalid extra content" );
		}


		return new TYPE.TypeStringWithLanguage( type, string, language );
	},
	0x36: 0x35,

	// string data
	0x41: ( data, pos, length, type ) => new TYPE.TypeNative( type, data.toString( "utf8", pos, pos + length ) ),
	0x42: 0x41,
	0x44: ( data, pos, length, type ) => new TYPE.TypeNative( type, data.toString( "ascii", pos, pos + length ) ),
	0x45: 0x44,
	0x46: 0x44,
	0x47: 0x44,
	0x48: 0x44,
	0x49: 0x44
};


Object.keys( decoders ).forEach( function( id ) {
	const ref = decoders[id];

	if ( !isNaN( ref ) ) {
		decoders[id] = decoders[ref];
	}
} );



// --- public API ---

module.exports.processors = decoders;
