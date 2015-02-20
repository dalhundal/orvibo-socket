var dgram = require('dgram');
var EventEmitter = require('events').EventEmitter;
var ip = require('ip');
var udpClient = dgram.createSocket('udp4');
var udpServer = dgram.createSocket('udp4');
var util = require('util');

const UDP_PORT = 10000;
const BROADCAST_IP = '255.255.255.255';
const LOCAL_ADDRESS = ip.address();

var _sockets = [];

function setup() {
	udpClient.bind(UDP_PORT,function() {
		udpClient.setBroadcast(true);
	});
	//
	udpServer.bind(UDP_PORT, LOCAL_ADDRESS);
	udpServer.on('message', receiveMessage);
};

function receiveMessage(message, remote) {
	// Ignore messages from ourselves...
	if (ip.isEqual(remote.address, LOCAL_ADDRESS)) {
		return;
	}
	//
	var messageHex = new Buffer(message).toString('hex');
	var messageMatch = messageHex.match(/^6864([0-9a-z]{4})([0-9a-z]{4}).*?(accf[0-9a-z]{8})/);
	if (!messageMatch) {
		return;
	};
	//
	var decoded = {
		length: parseInt(messageMatch[1],16),
		command: messageMatch[2],
		mac: messageMatch[3]
	};
	//
	if (!_sockets[decoded.mac]) {
		_sockets[decoded.mac] = new aSocket(remote.address, decoded.mac);
	} else if (decoded.command == '7161') {
		// Ignore new socket notification if socket is already known to us
		return;
	};
	var socket = _sockets[decoded.mac];
	//
	switch (decoded.command) {
		case '7161':
			// Socket discovered!
			console.log("Socket found",socket.toString());
			break;
		case '636c':
			socket.emit('subscribe');
			break;
		case '6463':
			console.log("Control request acknowleged")
			break;
		case '7366':
			decoded.state = !!messageHex.match(/1$/);
			break;
		default:
			console.log("DIDNT UNDERSTAND MESSAGE",messageHex);
	};
	// Route the message to the appropriate socket
	socket._receiveDecodedHexMessage(decoded, messageHex, remote);
};

function transmit(msg, address) {
	var msgBuffer = new Buffer(msg);
	udpClient.send(msgBuffer, 0, msgBuffer.length, UDP_PORT, address);
};

var aSocket = function(ip, mac) {
	var self = this;
	EventEmitter.call(this);

	this.ip = ip;
	this.mac = mac;
	this.name = util.format("Orvibo Socket %s",mac);

	var _state = false;

	Object.defineProperty(this,'state',{
		get: function() {
			return _state;
		},
		set: function(state) {
			console.log("SET",state?'ON':'OFF');
			_state = state;
			var baMac = hexStringToByteArray(self.mac);
			transmit([].concat(
				['0x68', '0x64', '0x00', '0x17', '0x64', '0x63'],
				baMac,
				['0x20', '0x20', '0x20', '0x20', '0x20', '0x20'],
				['0x00', '0x00', '0x00', '0x00', (!!state) ? '0x01' : '0x00']
			), self.ip);
		},
		enumerable: true
	});

	this.toString = function() {
		return util.format("[%s] @ [%s], switched %s", this.name, this.ip, this.on ? 'on' : 'off');
	};

	function subscribe() {
		var baMac = hexStringToByteArray(self.mac);
		var baMacReversed = baMac.slice().reverse();
		transmit([].concat(
			['0x68', '0x64', '0x00', '0x1e', '0x63', '0x6c'],
			baMac,
			['0x20', '0x20', '0x20', '0x20', '0x20', '0x20'],
			baMacReversed,
			['0x20', '0x20', '0x20', '0x20', '0x20', '0x20']
		), self.ip);
	};

	this._receiveDecodedHexMessage = function(decoded, messageHex, remote) {
		switch (decoded.command) {
			/*
			case '7161':
				// Socket discovered!
				console.log("Socket found",socket.toString());
				break;
			case '636c':
				socket.emit('subscribe');
				break;
			case '6463':
				console.log("Control request acknowleged")
				break;
			*/
			case '7366':
				console.log("YO I AM %s, %s", self.name, decoded.state ? 'ON' : 'OFF');
				break;
			//default:
			//	console.log("DIDNT UNDERSTAND MESSAGE",messageHex);
		};
	};

	setTimeout(function() {
		subscribe();
		setTimeout(function() {
			module.exports.emit('discovered',self);
		},100);
	},100);
}

var OrviboSocket = function() {
	EventEmitter.call(this);
	this.discover = function() {
		setup();
		transmit(
			['0x68', '0x64', '0x00', '0x06', '0x71', '0x61'],
			BROADCAST_IP
		);
		//OrviboSocket.emit('discovered',socket);
	};
};

// Events
util.inherits(OrviboSocket, EventEmitter);
util.inherits(aSocket, EventEmitter);

module.exports = new OrviboSocket();

/**
 * Utility functions
 */
function hexStringToByteArray(hexString) {
	return hexString.match(/([a-z0-9]{2})/gi).map(function(hexBytes) { return '0x'+hexBytes; });
}