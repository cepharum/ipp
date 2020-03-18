/**
 * (c) 2020 cepharum GmbH, Berlin, http://cepharum.de
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2020 cepharum GmbH
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

const Type = require( "./abstract" );

/**
 * Represents an attribute's value supported by Javascript native types such as
 * strings, integers, booleans or Date.
 *
 * @param {int} type type marker found in
 * @param {*} value native value to be wrapped
 */
class TypeNative extends Type {
	/**
	 * @param {int} type value type identifier
	 * @param {*} value initial value
	 */
	constructor( type, value ) {
		super( type );

		this.value = value;
	}

	/** @inheritDoc */
	toBuffer() {
		if ( Buffer.isBuffer( this.value ) ) {
			return this.value;
		}

		if ( this.value instanceof Date ) {
			const data = Buffer.alloc( 13 );
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
			const data = Buffer.from( this.value, "utf8" );
			const length = Buffer.alloc( 2 );

			length.writeInt16BE( data.length, 0 );

			return Buffer.concat( [ length, data ] );
		}

		if ( this.value === true || this.value === false ) {
			const data = Buffer.alloc( 3 );
			data.writeInt16BE( 1, 0 );                          // length of value
			data.writeInt8( this.value ? 1 : 0, 2 );            // value

			return data;
		}

		const temporary = parseInt( this.value );
		if ( !isNaN( temporary ) ) {
			const data = Buffer.alloc( 6 );
			data.writeInt16BE( 4, 0 );                          // length of value
			data.writeInt32BE( temporary, 2 );                  // value

			return data;
		}

		throw new Error( "unsupported native value" );
	}
}

module.exports = TypeNative;
