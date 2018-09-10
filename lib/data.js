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

// --- public API ---

module.exports.MIN = -2147483648;   // ( 2 ^ 31 ) - 1, highest possible value of value type "integer"
module.exports.MAX = 2147483647;    // ( 2 ^ 31 ) - 1, highest possible value of value type "integer"


/**
 * Maps binary attribute group tag into name of section containing related
 * attributes in property "attributes".
 *
 * @type {Object.<int,?string>}
 */

module.exports.ATTRIBUTE_GROUP = {
	0x01: "operation",
	0x02: "job",
	0x03: null,
	0x04: "printer",
	0x05: "unsupported"
};

/**
 * Maps names of value types into their related tag for encoding according to
 * RFC2910.
 *
 * @type {Object.<string,int>}
 */

module.exports.ATTRIBUTE_TYPE = {
	// out-of-band data
	unsupported: 0x10,
	default: 0x11,
	unknown: 0x12,
	noValue: 0x13,

	// integer data
	integer: 0x21,
	boolean: 0x22,
	enum: 0x23,

	// binary / octet-string data
	octetString: 0x30,
	dateTime: 0x31,
	resolution: 0x32,
	rangeOfInteger: 0x33,
	textWithLanguage: 0x35,
	nameWithLanguage: 0x36,

	// string data
	textWithoutLanguage: 0x41,
	nameWithoutLanguage: 0x42,
	keyword: 0x44,
	uri: 0x45,
	uriScheme: 0x46,
	charset: 0x47,
	naturalLanguage: 0x48,
	mimeMediaType: 0x49
};

/**
 * Maps operation names into related numeric operation codes.
 *
 * @see RFC 2911
 *
 * @type {Object.<string,int>}
 */

module.exports.OPERATION = {
	// operations supported on a printer object
	PrintJob: 0x02,
	PrintURI: 0x03,
	ValidateJob: 0x04,
	CreateJob: 0x05,
	GetPrinterAttributes: 0x0b,
	GetJobs: 0x0a,
	PausePrinter: 0x10,
	ResumePrinter: 0x11,
	PurgeJobs: 0x12,

	// operations supported on a job object
	SendDocument: 0x06,
	SendURI: 0x07,
	CancelJob: 0x08,
	GetJobAttributes: 0x09,
	HoldJob: 0x0c,
	ReleaseJob: 0x0d,
	RestartJob: 0x0e
};


/**
 * Maps status names into related numeric status codes.
 *
 * @see RFC 2911, 13.1
 *
 * @type {Object.<string,int>}
 */

module.exports.STATUS = {
	// informational status codes
	successfulOk: 0x0000,
	successfulOkIgnoredOrSubstitutedAttributes: 0x0001,
	successfulOkConflictingAttributes: 0x0002,

	// redirection status codes

	// client error status codes
	clientErrorBadRequest: 0x0400,
	clientErrorForbidden: 0x0401,
	clientErrorNotAuthenticated: 0x0402,
	clientErrorNotAuthorized: 0x0403,
	clientErrorNotPossible: 0x0404,
	clientErrorTimeout: 0x0405,
	clientErrorNotFound: 0x0406,
	clientErrorGone: 0x0407,
	clientErrorRequestEntityTooLarge: 0x0408,
	clientErrorRequestValueTooLong: 0x0409,
	clientErrorDocumentFormatNotSupported: 0x040a,
	clientErrorAttributesOrValuesNotSupported: 0x040b,
	clientErrorUriSchemeNotSupported: 0x040c,
	clientErrorCharsetNotSupported: 0x040d,
	clientErrorConflictingAttributes: 0x040e,
	clientErrorCompressionNotSupported: 0x040f,
	clientErrorCompressionError: 0x0410,
	clientErrorDocumentFormatError: 0x0411,
	clientErrorDocumentAccessError: 0x0412,

	// server error status codes
	serverErrorInternalError: 0x0500,
	serverErrorOperationNotSupported: 0x0501,
	serverErrorServiceUnavailable: 0x0502,
	serverErrorVersionNotSupported: 0x0503,
	serverErrorDeviceError: 0x0504,
	serverErrorTemporaryError: 0x0505,
	serverErrorNotAcceptingJobs: 0x0506,
	serverErrorBusy: 0x0507,
	serverErrorJobCanceled: 0x0508,
	serverErrorMultipleDocumentJobsNotSupported: 0x0509
};



module.exports.ENUM_PRINTER_STATE = {
	3: "idle",
	4: "processing",
	5: "stopped"
};
