// Browser based Thing Shadow Updater

var AWS = require('aws-sdk');
var AWSIoTData = require('aws-iot-device-sdk');

// Set Thing name constant
const thingName = "car3";

// Initialize the configuration.
AWS.config.region = AWSConfiguration.region;

AWS.config.credentials = new AWS.CognitoIdentityCredentials({
   IdentityPoolId: AWSConfiguration.poolId
});

// Global Variables
// Keep track of the light status from the webpage perspective
var currentLightStatus;
// Keep track of whether or not we've registered the shadows used by this
// example.
var shadowsRegistered = false;

// Attempt to authenticate to the Cognito Identity Pool.
var cognitoIdentity = new AWS.CognitoIdentity();
AWS.config.credentials.get(function (err, data) {
    if (!err) {
        console.log('retrieved identity from Cognito: ' + AWS.config.credentials.identityId);
        var params = {
            IdentityId: AWS.config.credentials.identityId
        };
        cognitoIdentity.getCredentialsForIdentity(params, function (err, data) {
            if (!err) {

                // Create the AWS IoT shadows object.
                const thingShadows = AWSIoTData.thingShadow({
                    // Set the AWS region we will operate in.
                    region: AWS.config.region,

                    //Set the AWS IoT Host Endpoint   
                    host: AWSConfiguration.endpoint,

                    // Use a random client ID.
                    clientId: thingName + '-' + (Math.floor((Math.random() * 100000) + 1)),

                    // Connect via secure WebSocket
                    protocol: 'wss',

                    // Set the maximum reconnect time to 8 seconds; this is a browser application
                    // so we don't want to leave the user waiting too long for re-connection after
                    // re-connecting to the network/re-opening their laptop/etc...
                    maximumReconnectTimeMs: 8000,

                    // Set Access Key, Secret Key and session token based on credentials from Cognito
                    accessKeyId: data.Credentials.AccessKeyId,
                    secretKey: data.Credentials.SecretKey,
                    sessionToken: data.Credentials.SessionToken
                });

                // Update car image whenever we receive status events from the shadows.
                thingShadows.on('status', function (thingName, statusType, clientToken, stateObject) {
                    console.log('status event received for my own operation')
                    if (statusType === 'rejected') {
                        // If an operation is rejected it is likely due to a version conflict;
                        // request the latest version so that we synchronize with the shadow
                        // The most notable exception to this is if the thing shadow has not
                        // yet been created or has been deleted.
                        if (stateObject.code !== 404) {
                            console.log('re-sync with thing shadow');
                            var opClientToken = thingShadows.get(thingName);
                            if (opClientToken === null) {
                                console.log('operation in progress');
                            }
                        }
                    } else { // statusType === 'accepted'
                        if (stateObject.state.hasOwnProperty('reported') && stateObject.state.reported.hasOwnProperty('lights')) {
                            
                            // Update the messages div with new status
                            document.getElementById('messages').innerHTML = '<p>Light status successfully received.</p><p>Connected to AWS IoT.</p>';
                            
                            handleCarImage(stateObject.state.reported.lights);
                        }
                    }
                });

                // Update car image whenever we receive foreignStateChange events from the shadow.
                // This is triggered when the car Thing updates its state.
                thingShadows.on('foreignStateChange', function (thingName, operation, stateObject) {
                    console.log('foreignStateChange event received')
                    
                    // If the operation is an update
                    if (operation === "update") {

                        // Make sure the lights property exists
                        if (stateObject.state.hasOwnProperty('reported') && stateObject.state.reported.hasOwnProperty('lights')) {
                            handleCarImage(stateObject.state.reported.lights);
                        } else {
                            console.log('no reported lights state');
                        }
                    }
                });


                // Connect handler; update div visibility and fetch latest shadow documents.
                // Register shadows on the first connect event.
                thingShadows.on('connect', function () {
                    console.log('connect event received');

                    // Update the messages div with new status
                    document.getElementById('messages').innerHTML = '<p>Connected to AWS IoT. Registering...</p>';

                    // We only register the shadow once.
                    if (!shadowsRegistered) {
                        thingShadows.register(thingName, {}, function (err, failedTopics) {
                            
                            // If there are no errors
                            if (!err) {                    
                                console.log(thingName + ' has been registered');

                                // Update the messages div with new status
                                document.getElementById('messages').innerHTML = '<p>Registered to ' + thingName + ' Shadow. Fetching the current lights</p>';

                                // Fetch the initial state of the Shadow
                                var opClientToken = thingShadows.get(thingName);
                                if (opClientToken === null) {
                                    console.log('operation in progress');
                                }
                                shadowsRegistered = true;
                            }
                        });
                    }
                });

                // When the CarLightsEventButton is clicked, update the Thing Shadow with the inverse of the 
                // current light status
                const CarLightsEventButton = document.getElementById('CarLightsEventButton');
                CarLightsEventButton.addEventListener('click', (evt) => {
                    thingShadows.update(thingName, { state: { desired: { lights: !currentLightStatus } } });
                });

            } else {
                console.log('error retrieving credentials: ' + err);
                alert('Error retrieving credentials: ' + err);
            }
        });
    } else {
        console.log('error retrieving identity:' + err);
        alert('Error retrieving identity: ' + err);
    }
});

 // Function handling the car image based on the newLightStatus
function handleCarImage(newLightStatus) {

    // Don't do anything if the light status hasn't changed
    if (currentLightStatus === newLightStatus) {
        return;
    } else if (newLightStatus === true) {
        console.log('changing car image to lights ON');

        // Set the car image to ON and appropriate text
        document.getElementById("car").src="images/car-with-lights.png";
        document.getElementById('lights').innerHTML = '<h1>The lights are ON</h1>';

    } else {
        console.log('changing car image to lights OFF');
        
        // Set the car image to OFF and appropriate text
        document.getElementById("car").src="images/car-no-lights.png";
        document.getElementById('lights').innerHTML = '<h1>The lights are OFF</h1>';
        
    }

    // Save the new light status
    currentLightStatus = newLightStatus;
}
