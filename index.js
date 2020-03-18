/**
 * (c) 2014 cepharum GmbH, Berlin, http://cepharum.de
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 cepharum GmbH
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

const IPPMessage = require( "./lib/message" );
const Data = require( "./lib/data" );
const Types = require( "./lib/types" );
const Generate = require( "./lib/generate" );
const IPPMessageStreamParser = require( "./lib/stream-parser" );



// --- public API ---

/** @class IPPMessage */
exports.IPPMessage = IPPMessage;

/** @class IPPMessageStreamParser */
exports.IPPMessageStreamParser = IPPMessageStreamParser;

// export named pseudo-constants
exports.Operation = Data.Operation;
exports.Status = Data.Status;
exports.AttributeGroup = Data.AttributeGroup;
exports.AttributeType = Data.AttributeType;
exports.EnumPrinterState = Data.EnumPrinterState;

// export all managers for typed values of attributes
exports.AttributeType = Types.Type;
exports.AttributeTypeNative = Types.TypeNative;
exports.AttributeTypeDefault = Types.TypeDefault;
exports.AttributeTypeUnknown = Types.TypeUnknown;
exports.AttributeTypeNoValue = Types.TypeNoValue;
exports.AttributeTypeResolution = Types.TypeResolution;
exports.AttributeTypeRange = Types.TypeRange;
exports.AttributeTypeStringWithLanguage = Types.TypeStringWithLanguage;


exports.Generators = Generate;


/**
 * Parses IPP message contained in provided buffer.
 *
 * @param {Buffer} rawMessage IPP message to be parsed
 * @returns {IPPMessage} parsed IPP message
 */
exports.parse = rawMessage => new IPPMessage( rawMessage );

/**
 * Creates new instance of MessageStreamParser.
 *
 * @returns {IPPMessageStreamParser} instance of stream parser
 */
exports.getParsingStream = () => new IPPMessageStreamParser();

/**
 * Generates connect/express compatible middleware detecting and extracting IPP
 * message in handled requests.
 *
 * @returns {function(IncomingMessage,ServerResponse,function(error=):void)} generated middle ware
 */
exports.middleware = () => ( req, res, next ) => {
	let streamParser;

	if ( req.is( "application/ipp" ) ) {
		streamParser = new IPPMessageStreamParser();

		streamParser.on( "message", onMessage );

		streamParser.on( "error", error => {
			next( Object.assign( new Error( `IPP parsing error: ${error.stack}` ), { status: 500 } ) );
		} );

		req.pipe( streamParser );
	} else {
		next();
	}

	/**
	 * Handles discovery of IPP message in current request.
	 *
	 * @param {IPPMessage} message IPP message found in request
	 * @returns {void}
	 */
	function onMessage( message ) {
		req.ipp = {
			header: message,
			body: streamParser,
		};

		next();
	}
};
