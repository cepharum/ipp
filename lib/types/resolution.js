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

const { AttributeType } = require( "../data" );
const Type = require( "./abstract" );

/**
 * Represents attribute's value of type "resolution" consisting of resolution
 * on x- and y-axis and some unit information.
 */
class TypeResolution extends Type {
	/**
	 * @param {int} x horizontal resolution
	 * @param {int} y vertical resolution
	 * @param {int} unit unit identifier, either TypeResolution.PerInch or TypeResolution.PerCm
	 */
	constructor( x, y, unit ) {
		if ( unit !== TypeResolution.PER_INCH && unit !== TypeResolution.PER_CM ) {
			throw new Error( "unsupported resolution unit" );
		}

		super( AttributeType.resolution );

		/**
		 * Exposes horizontal resolution value.
		 *
		 * @type {int}
		 */
		this.x = x;

		/**
		 * Exposes vertical resolution value.
		 *
		 * @type {int}
		 */
		this.y = y;

		/**
		 * Exposes unit of resolution values.
		 *
		 * @type {int}
		 */
		this.unit = unit;
	}

	/** @inheritDoc */
	toBuffer() {
		const data = Buffer.alloc( 11 );
		data.writeInt16BE( 9, 0 );
		data.writeInt32BE( parseInt( this.x ) || 0, 2 );
		data.writeInt32BE( parseInt( this.y ) || 0, 6 );
		data.writeInt8( parseInt( this.unit ) || TypeResolution.PER_INCH, 10 );

		return data;
	}
}

TypeResolution.PerInch = 3;
TypeResolution.PerCm = 4;

module.exports = TypeResolution;
