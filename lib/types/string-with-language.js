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
 * Represents attribute's value of type "textWithLanguage" or "nameWithLanguage"
 * by combining some localized string with information on string's locale.
 */
class TypeStringWithLanguage extends Type {
	/**
	 * @param {int} type type identifier
	 * @param {string} string localized string
	 * @param {string} language locale of string
	 */
	constructor( type, string, language ) {
		if ( type !== AttributeType.nameWithLanguage && type !== AttributeType.textWithLanguage ) {
			throw new TypeError( "invalid/unknown type of *WithLanguage" );
		}

		super( type );

		/**
		 * Exposes localized string value.
		 *
		 * @name TypeStringWithLanguage#string
		 * @alias TypeStringWithLanguage#name
		 * @alias TypeStringWithLanguage#text
		 * @type {string}
		 */
		this.string = this.name = this.text = string;

		/**
		 * Exposes locale of string value, e.g. "en-us".
		 *
		 * @name TypeStringWithLanguage#language
		 * @alias TypeStringWithLanguage#locale
		 * @type {string}
		 */
		this.language = this.locale = language;
	}

	/** @inheritDoc */
	toBuffer() {
		const string = Buffer.from( this.value, "utf8" );
		const stringLength = Buffer.alloc( 2 );
		stringLength.writeInt16BE( string.length, 0 );

		const language = Buffer.from( this.value, "utf8" );
		const languageLength = Buffer.alloc( 2 );
		languageLength.writeInt16BE( language.length, 0 );

		return Buffer.concat( [ languageLength, language, stringLength, string ] );
	}
}

module.exports = TypeStringWithLanguage;
