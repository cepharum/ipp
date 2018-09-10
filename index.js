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

const MESSAGE = require( "./lib/message" );
const DATA = require( "./lib/data" );
const TYPE = require( "./lib/type" );
const GENERATE = require( "./lib/generate" );
const STREAM = require( "./lib/stream-parser" );



// --- public API ---

/** @class IPPMessage */
module.exports.IPPMessage = MESSAGE.IPPMessage;

/** @class IPPMessageStreamParser */
module.exports.IPPMessageStreamParser = STREAM.IPPMessageStreamParser;

// export named pseudo-constants
module.exports.OPERATION = DATA.OPERATION;
module.exports.STATUS = DATA.STATUS;
module.exports.ATTRIBUTE_GROUP = DATA.ATTRIBUTE_GROUP;
module.exports.ATTRIBUTE_TYPE = DATA.ATTRIBUTE_TYPE;
module.exports.ENUM_PRINTER_STATE = DATA.ENUM_PRINTER_STATE;

// export all managers for typed values of attributes
module.exports.AttributeType = TYPE.Type;
module.exports.AttributeTypeNative = TYPE.TypeNative;
module.exports.AttributeTypeDefault = TYPE.TypeDefault;
module.exports.AttributeTypeUnknown = TYPE.TypeUnknown;
module.exports.AttributeTypeNoValue = TYPE.TypeNoValue;
module.exports.AttributeTypeResolution = TYPE.TypeResolution;
module.exports.AttributeTypeRange = TYPE.TypeRange;
module.exports.AttributeTypeStringWithLanguage = TYPE.TypeStringWithLanguage;


module.exports.generators = GENERATE;


/**
 * Parses IPP message contained in provided buffer.
 *
 * @param {Buffer} rawMessage
 * @returns {IPPMessage}
 */
module.exports.parse = rawMessage => new MESSAGE.IPPMessage( rawMessage );

/**
 * Creates new instance of MessageStreamParser.
 *
 * @returns {IPPMessageStreamParser}
 */
module.exports.getParsingStream = () => new STREAM.IPPMessageStreamParser();

/**
 * Retrieves expressjs-compatible middleware for parsing incoming IPP message.
 *
 * @returns {function({},{},function)}
 */
module.exports.middleware = () => ( req, res, next ) => {
	if ( req.is( "application/ipp" ) ) {
		const streamParser = new STREAM.IPPMessageStreamParser();

		streamParser.on( "message", /** @param {IPPMessage} message */ function( message ) {
			req.ipp = {
				header: message,
				body: streamParser
			};

			next();
		} );

		streamParser.on( "error", function( error ) {
			error.message = "IPP parsing error: " + error.message;
			error.status = 500;

			next( error );
		} );

		req.pipe( streamParser );
	} else {
		next();
	}
};
