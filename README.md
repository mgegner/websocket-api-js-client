# websocket-api-js-client
A simple websocket api framework (clientside) for sending and receiving json messages.
It is written in JavaScript and can be included to an existing system as a slim and fast solution.

## Concept
Goal of this framework is the easier implementation of client to client, clients to server and server to clients communications via the HTML5 WebSockets. Targets of this framework are developers of small and slim web-based systems. It can easily be used for chat implementations or other heavy communication applications.

The communication between client to client or client to server is divided in websocket packets, which are named messages.
Each message is a tuple of message type as a string and a data object as a json object. The framework will automatically provide timestamps to each message, so that the server and other clients can decide, what to do with outdated messages.
The server allows clients to subscribe to message types, so they will receive published messages for that message type.

## Usage
You need to include the wsapi.js script file in your website, before you access it.

```html
<!-- Include the wsapi-script before your scripts, which use this framework. -->
<script type="application/javascript" src="wsapi.js"></script>

<!-- Example of your scripts... -->
<script type="application/javascript">
  
  // example interpreter
  function toText(data, isOld) {
    document.write("<pre>" + JSON.stringify(data) + "</pre>");
  }
  wsapi.interpreter["example"] = toText;
  
  // example subscription
  wsapi.initSubscribe.push("example")
  wsapi.init();
  wsapi.writeMessage("example", {example: "echo message", value: 42});
  
</script>
```

This client only works, if the configurated server (defined in ```wsapi.wsurl```) is available and accepts messages from this framework in general.
See below, what you need to configurate and how you can use the message handling.

### Configuration
There are static fields, you might want to change to your purposes, before using the framework.

| Field | Type | Description | Default |
|:------|:-----|:------------|:--------|
| ```wsapi.wsurl``` | string | the server url without http(s) | maltegegner.de/wsapi |
| ```wsapi.preventRestarts``` | boolean | disable restarting, when connection was lost (max 100 times) | false |
| ```wsapi.restartMaxTime``` | integer | the maximal time in milliseconds before the next connection restart is tried | 60000 |
| ```wsapi.tickrates``` | [integer] | the times in milliseconds to update messages to and from the server | [1000, 100, 50, 33, 16, 5] |
| ```wsapi.initSubscribe``` | [string] | the message types to subscribe when initializing | [] |
| ```wsapi.interpreter``` | {string:function} | a map of interpreter functions for message types | {} |
| ```wsapi.allowConsole``` | boolean | write debug messages to the console.log function | false |

### Methods
These are the methods, the framework offers.
Keep in mind, that you need to specify interpreters in ```wsapi.interpreter``` as well.

```javascript
// Returns true, if the wsapi is connected to the server.
wsapi.isConnected() : boolean

// Subscribes to a message type.
wsapi.subscribe(messageType) : void

// Unsubscribes from a message type.
wsapi.unsubscribe(messageType) : void

// Publishes a message to the server.
wsapi.writeMessage(messageType, jsonData) : void

// Initializes the wsapi. Needs to be called at least once, before you can write and read messages.
wsapi.init() : void
```

### Subscribe to a message type
To receive messages for a specified message type, you can subscribe to a message type:

```javascript
// subscription before initialization (faster and more performant)
wsapi.initSubscribe.push("example");

// subscription anytime after initialization
wsapi.subscribe("example");
```
The message types "subscribe" and "unsubscribe" are keywords for the server and should be avoided.


### Unsubscribe from a message type
To no longer receive messages for a specified message type, you can unsubscribe from a message type:
```javascript
wsapi.unsubscribe("example");
```

### Publish a message to the server
These method is used for publishing a message from a client to the server. Other clients, who subscribed to the message type will receive this message as well, if the server is allowing that.
```javascript
wsapi.writeMessage("exampleType", {data: "anything", blocks: [1, 2, 3], more: false});
```
You don't need to subscribe or unsubscribe to the message type you are publishing to. However, you will get an echo message from the server, if you publish a message for a message type you are subscribed to.

### Parse a message from the server
Received messages will be redirected to an interpreter function. If no interpreter is found, it will be send to the defaultInterpreter, which creates a div-block in the body element of the client page.
To add an interpreter for a specific message type, you have to create a function with two parameters. The first one will be filled with the message json object and the second one is true/false, if the message is the newest of its type measured by time.
Then you need to connect the function to the wsapi interpreter map.
```javascript
// function type to handle a message, the messagetype is not fixed here
function exampleInterpreter(message, isOld) {
  if(isOld) {
    // do something with a message, which is older than the latest received for this type
    console.log("isOld", message);
  } else {
    // do something with a newer message
    console.log("newest", message);
  }
}

// Connect the interpreter function to the example interpreter somewhere before receiving the messages.
wsapi.interpreter["messageType"] = exampleInterpreter;
```

## Contact and Troubleshooting
Contact me via mail to info@maltegegner.de for further help or to report a bug.


Copyright (c) 2015, 2016 Malte Gegner

Released under [MIT License](LICENSE).
