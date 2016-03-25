/* websocket-api-js-client
 * https://maltegegner.de
 *
 * Copyright 2015, 2016 Malte Gegner
 * Released under the MIT license.
 */

var wsapi = {
  
  
  // Configuration
  wsurl:           "maltegegner.de/wsapi", // the websocket api server url
  preventRestarts: false, // prevent restart routine on close or errors
  restartMaxTime:  60000, // the maximum time in ms before a restart should be tried
  tickrates:       [1000, 100, 50, 33, 16, 5], // the times in ms the ticker should tick (left to right: boost level)
  initSubscribe:   [], // subscribe to actions when init
  interpreter:     {}, // map of action to interpreter function for later access
  allowConsole:    false, // debug messages should be sent to console
  
  
  // Variables
  ws:              {}, // the WebSocket instance
  isOpen:          false, // true if websocket active
  restarter:       {}, // the restarter timeout function
  restartTries:    0, // the number of connection recover tries
  restartTime:     500, // the last time the restart was tried
  ticker:          {}, // the wrapper for the tick timeout function
  inMessages:      [], // messages got from the server, to be handled
  outMessages:     [], // messages to be written to the server, to be handled
  lastAnswers:     {}, // last timestamps per action
  subscriptions:   [], // subscriptions active
  
  
  // fires, when the websocket is ready
  firstConnect: function() {
    for(subTo in wsapi.subscriptions) {
      wsapi.subscribe(wsapi.subscriptions[subTo], true);
    }
    for(subTo in wsapi.initSubscribe) {
      wsapi.subscribe(wsapi.initSubscribe[subTo]);
    }
    if(wsapi.ticker) {
      clearTimeout(wsapi.ticker);
    }
    wsapi.isOpen = true;
    wsapi.restartTime = 500;
    wsapi.refreshTicker();
  },
  
  
  // fires, when the websocket is closing
  isClosing: function() {
    wsapi.isOpen = false;
    if(!wsapi.preventRestarts && wsapi.restartTries < 100) {
      wsapi.restartTries++;
      wsapi.restartTime = wsapi.restartTime * 2;
      if(wsapi.restartTime > wsapi.restartMaxTime) {
        wsapi.restartTime = wsapi.restartMaxTime;
      }
      wsapi.restarter = setTimeout(wsapi.init, wsapi.restartTime);
    }
  },
  
  
  // true, when the websocket is open and ready
  isConnected: function() {
    return wsapi.isOpen === true;
  },
  
  
  // subscribe this client to the action
  subscribe: function(action, recover) {
    if(recover) {
      wsapi.ws.send(JSON.stringify({action: "subscribe", data: action}));
      return;
    }
    if(wsapi.subscriptions.indexOf(action) <= -1) {
      wsapi.writeMessage("subscribe", action);
      wsapi.subscriptions.push(action);
    }
  },
  
  
  // unsubscribe this client to the action
  unsubscribe: function(action, recover) {
    if(recover) {
      wsapi.ws.send(JSON.stringify({action: "unsubscribe", data: action}));
      return;
    }
    var index = wsapi.subscriptions.indexOf(action);
    if(index > -1) {
      wsapi.writeMessage("unsubscribe", action);
      wsapi.subscriptions.splice(index, 1);
    }
  },
  
  
  // writes request message to the server
  writeMessage: function(action, data) {
    var msg = {action: action, data: data};
    wsapi.outMessages.push(JSON.stringify(msg));
  },
  
  
  // reads answer message from the server
  readMessage: function(event) {
    wsapi.inMessages.push(event.data);
  },
  
  
  // handles all messages in a synchronized way with respects to the server timeout time
  tick: function() {
    // write one message first
    if(wsapi.isConnected() && wsapi.outMessages.length > 0) {
      var msg = wsapi.outMessages[0];
      wsapi.ws.send(msg);
      wsapi.outMessages.splice(0, 1);
      if(wsapi.allowConsole) {
        console.log("<< wsapi:", msg);
      }
    }
    
    // read one message then
    if(wsapi.inMessages.length > 0) {
      var msg = JSON.parse(wsapi.inMessages[0]);
      wsapi.inMessages.shift();
      if(wsapi.allowConsole) {
        console.log(">> wsapi:", msg);
      }
      var interpreter = wsapi.interpreter[msg.action];
      if(interpreter) {
        var lTime = wsapi.lastAnswers[msg.action];
        var tTime = msg.timestamp;
        var isOld = lTime && tTime < lTime
        if(!isOld) {
          wsapi.lastAnswers[msg.action] = tTime;
        }
        interpreter(msg.data, isOld);
      } else {
        wsapi.defaultInterpreter(msg, isOld);
      }
    }
    
    wsapi.refreshTicker();
  },
  
  
  // sets the next execution for the tick based on payload
  refreshTicker: function() {
    var nextExecutionIn = wsapi.tickrates[1]; // default time
    if(!wsapi.isConnected()) {
      nextExecutionIn = wsapi.tickrates[0];
    } else if(wsapi.inMessages.length > 15) {
      // don't be faster only because there are many write messages
      nextExecutionIn = wsapi.tickrates[5];
    } else if(wsapi.inMessages.length > 7 || wsapi.outMessages.length > 7) {
      nextExecutionIn = wsapi.tickrates[4];
    } else if(wsapi.inMessages.length > 3 || wsapi.outMessages.length > 3) {
      nextExecutionIn = wsapi.tickrates[3];
    } else if(wsapi.inMessages.length > 1 || wsapi.outMessages.length > 1) {
      nextExecutionIn = wsapi.tickrates[2];
    } else {
      nextExecutionIn = wsapi.tickrates[1];
    }
    wsapi.ticker = setTimeout(wsapi.tick, nextExecutionIn);
  },
  
  
  // fallback, if no interpreter is found for the action
  defaultInterpreter: function(msg, isOld) {
    wsapi.addNotification(msg.action + " interpreter not found.", JSON.stringify(msg.data));
  },
  
  
  // adds a notification to the notification div (only if jquery is available)
  addNotification: function(title, content) {
    if(!$) {
      if(wsapi.useConsole) {
        console.log("wsapi:", title, content)
      }
      return;
    }
    
    var container = $('#ws-notifications');
    if(!container.length > 0) {
      $('<div>').attr('id', 'ws-notifications').prependTo('body');
      container = $("#ws-notifications");
    }
    
    var notification = $('<div class="ws-notification">');
    $('<p>').addClass('ws-notification-title').html(title).appendTo(notification);
    $('<p>').addClass('ws-notification-content').html(content).appendTo(notification);
    var closer = $('<span>').addClass('ws-notification-closer').html('X');
    closer.on('click', function(e) {
      $(e.target).parent().remove();
    });
    closer.prependTo(notification);
    
    notification.appendTo(container);
  },
  
  
  // initializes the websocket api
  init: function() {
    if(wsapi.isConnected()) {
      wsapi.preventRestarts = true;
      wsapi.ws.close();
      clearTimeout(wsapi.ticker);
    }
    wsapi.preventRestarts = false;
    
    // keep security layer for websocket, if the website has https-protocol
    if(window.location.protocol == "https:") {
      wsapi.ws = new WebSocket("wss://" + wsapi.wsurl);
    } else {
      wsapi.ws = new WebSocket("ws://" + wsapi.wsurl);
    }
    wsapi.ws.onopen = wsapi.firstConnect;
    wsapi.ws.onclose = wsapi.isClosing;
    wsapi.ws.onmessage = wsapi.readMessage;
    
    if(wsapi.restarter.length > 0) {
      clearTimeout(wsapi.restarter);
    }
  }
  
  
};