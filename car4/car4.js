// Publish Data from car devices

const awsIoT = require('aws-iot-device-sdk');
const crypto = require('crypto');

// Load the iot endpoint from file
const endpointFile = require('../endpoint.json');

const platform = process.platform;
let deviceName = "";

// Fetch the deviceName from the folder name
if(platform == "linux"){
    deviceName = __dirname.split('/').pop();
}
else if(platform == "win32"){
    deviceName = __dirname.split('\\').pop();
}

// Create the thingShadow object with argument data
const device = awsIoT.device({
   keyPath: 'private.pem.key',
  certPath: 'certificate.pem.crt',
    caPath: '../root-CA.crt',
  clientId: deviceName, // deviceName is the folder name, ultimately named after the thing so like car4, etc
      host: endpointFile.endpointAddress
});

// Function that gets executed when the connection to IoT is established
device.on('connect', function() {
    console.log('Connected to AWS IoT');
    
    // Start the publish loop
    infiniteLoopPublish();
});

// Function sending car telemetry data every 7 seconds
function infiniteLoopPublish() {
    console.log('Sending car telemetry data to AWS IoT for ' + deviceName);
    // Publish car data to edx/telemetry topic with getCarData
    device.publish("iot-vehicles/telemetry", JSON.stringify(getCarData(deviceName)));
    
    // Start Infinite Loop of Publish every 7 seconds
    setTimeout(infiniteLoopPublish, 7000);
}

// Function to create a random float between minValue and maxValue
function randomFloatBetween(minValue,maxValue){
    return parseFloat(Math.min(minValue + (Math.random() * (maxValue - minValue)),maxValue));
}

// Generate random car data based on the deviceName
function getCarData(deviceName) {
    let message = {
        'trip_id': crypto.randomBytes(15).toString('hex'),
        'engine_speed_mean': randomFloatBetween(700.55555, 3000.55555),
        'fuel_level': randomFloatBetween(0, 100),
        'high_acceleration_event': randomFloatBetween(0, 12),
        'high_breaking_event': randomFloatBetween(0, 4),
        'odometer': randomFloatBetween(0.374318249, 8.142630049),
        'oil_temp_mean': randomFloatBetween(12.7100589, 205.3165256)
    };
    
    const device_data = {
        'car4': {
            'vin': 'ETWUASOOGRZOPQRTR',
            'latitude': 40.8173411,
            'longitude': -73.94332990000001
        }
    };

    message['vin'] = device_data[deviceName].vin;
    message['latitude'] = device_data[deviceName].latitude;
    message['longitude'] = device_data[deviceName].longitude;
    message['device'] = deviceName;
    message['datetime'] = new Date().toISOString().replace(/\..+/, '');

    console.log(message)
    
    return message;
}