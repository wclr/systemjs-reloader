##System.js and StealJS hot module reloader

Reloads application on when recieves and event about file change.
Systemjs-reloader is not resposible for handling filechanges on server, you should use other software for this
 
 
 ```javascript
 var $ = require('jquery')
  
 require('systemjs-reloader')({
     main: 'app',
     skip: /node_modules|can\.js/i,
     excepts: ['app-dev'],
     debug: true,
     beforeReload: function(){
         $('body').html('')
     },
     clearConsole: true     
 })
 
 // 
 watchalive.onFiles(System.reloadChanges)
 
 System.import('app')
 ```