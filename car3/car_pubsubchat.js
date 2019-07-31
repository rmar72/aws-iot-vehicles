// Chat application between cars

// Require readline for input from the console
const readline = require('readline');

// Require AWS IoT Device SDK
const awsIoT = require('aws-iot-device-sdk');

// Load the endpoint from file
const endpointFile = require('../endpoint.json');

// Fetch the deviceName from the current folder name
const deviceName = __dirname.split('/').pop();

// Set the destinationDeviceName depending on this deviceName
var destinationDeviceName = 'car3';
if (deviceName === 'car3') {
    destinationDeviceName = 'car4';
}

// Build constants
const subTopic = 'edx/messaging/' + deviceName;
const pubTopic = 'edx/messaging/' + destinationDeviceName;
const keyPath = 'private.pem.key';
const certPath = 'certificate.pem.crt';
const caPath = '../root-CA.crt';
const clientId = deviceName;
const host = endpointFile.endpointAddress;

// Interface for console input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Recursive function reading console input
function readConsoleInput() {
    rl.question('Enter a message on the next line to send to ' + pubTopic + ':\r\n', function (message) {
        
        // Calling function to publish to IoT Topic
        publishToIoTTopic(pubTopic, message);
        
        readConsoleInput();
    });
}

// Use the awsIoT library to create device object using above constants
var carDevice = awsIoT.device({
    keyPath,
    certPath,
    caPath,
    clientId,
    host
});

 
//  When the connection to AWS IoT is established, subscribe to the 
//  subTopic IoT Topic and start reading from the console for a message to
//  send using the readConsoleInput() function.

carDevice.on('connect', function(){
    carDevice.subscribe(subTopic);
    readConsoleInput()
})


// When a new message is received on the subscribed topic, console output
carDevice.on('message', function(topic, message) {
    console.log("Message received on topic " + topic + ": " + message);
});

 
// Function to publish payload to IoT topic
function publishToIoTTopic(topic, payload) {
    // Publish to specified IoT topic using device object that was created
    carDevice.publish(topic, payload);
}