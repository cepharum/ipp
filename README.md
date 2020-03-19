# IPP Message Processor

(c) cepharum GmbH, http://cepharum.de

## License

MIT

## About

This library provides parsing and generation of RFC 2911 IPP messages. In addition it contains code for parsing IPP message from stream forwarding all body data following parsed IPP message to be processed separately, e.g. for storing or instantly processing it. Eventually, there is a middleware for use with express or compatible server applications to conveniently discover IPP messages in incoming requests.

