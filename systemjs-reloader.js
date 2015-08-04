// Topological sort
// The code is taken from https://github.com/marcelklehr/toposort/blob/master/index.js
var toposort = function(nodes, edges) {

    var cursor = nodes.length
        , sorted = new Array(cursor)
        , visited = {}
        , i = cursor

    while (i--) {
        if (!visited[i]) visit(nodes[i], i, [])
    }

    return sorted

    function visit(node, i, predecessors) {
        if(predecessors.indexOf(node) >= 0) {
            throw new Error('Cyclic dependency: ' + JSON.stringify(node))
        }

        if (visited[i]) return;
        visited[i] = true

        // outgoing edges
        var outgoing = edges.filter(function(edge){
            return edge[0] === node
        })
        if (i = outgoing.length) {
            var preds = predecessors.concat(node)
            do {
                var child = outgoing[--i][1]
                visit(child, nodes.indexOf(child), preds)
            } while (i)
        }

        sorted[--cursor] = node
    }
}

function addEvent(element, eventName, callback) {
    if (element.addEventListener) {
        element.addEventListener(eventName, callback, false);
    } else if (element.attachEvent) {
        element.attachEvent("on" + eventName, callback);
    } else {
        element["on" + eventName] = callback;
    }
}

var debugLog = function(){
    if (System.reloader.debug){
        var args = Array.prototype.slice.call(arguments),
            method = 'log'

        if (args.indexOf(['warn', 'error', 'info', 'log']) >= 0){
            method = args.shift();
        }
        args.unshift('System.reloader:');
        console[method].apply(console, args)
    }
}


var isStyle = function(file){
    return /\.(css|less|scss|styl)$/.test(file.file || file.address || file)
}

var isModuleStyle = function(mod){
    return /\.(css|less|scss|styl)\!/.test(mod)
}

var isModuleNoneStyle = function(mod){
    return !isModuleStyle(mod)
}


var isNonStyle = function(file){
    return !isStyle(file)
}

var mapNames = function(changes){
    return changes.map(function(c){return c.file || c})
}

// TODO: make styles reload in the same manner asJS
var reloadStyles = function(changes){
    //slog('relaodStyles', changes)
    var reloader = System.reloader

    if (changes.length){

        var styleChanges = changes.filter(isStyle)

        if (styleChanges.length){
            styleChanges.forEach(function(change){
                var load = reloader.addrs[change.file]
                if (!load){
                    console.warn('System.reloader: no load object for', change.file)
                    return
                }
                load.source = change.data
                load.metadata.replace = true
                System.delete(load.name)
                System.define(load.name, load.source, {address: load.address, metadata: load.metadata}).then(function(){
                    debugLog('Css style replaced', change.file)
                }).catch(function(err){
                    console.log('debugLog', debugLog)
                    debugLog('warn', 'Define Catch', err)
                })
            })

            reloader.emit('styles', mapNames(changes))

            changes = changes.filter(isNonStyle)
        }
    }
    return changes
}


addEvent(document, "keydown", function (ev) {
    ev = ev || window.event;
    if (ev.ctrlKey && ev.altKey && ev.keyCode == 'R'.charCodeAt(0)){
        //System.reloader.emit('complete')
        System.reloader.completeReload()
    }
});

addEvent(window, 'error', function (ev) {
    System.reloader.catchError && System.reloader.catchError(ev.message)
    //ev.error.stack, ev.lineno - on safarit
    var obj = {
        message: ev.message,
        filename: ev.filename,
        lineno: ev.lineno,
        colno: ev.colno,
        stack: ev.error && ev.error.stack
    }
    console.warn('System reloader caught error:', ev.message, obj.filename, obj.lineno, obj.stack)
    ev.preventDefault()
})

module.exports = function(options){


    if (System.reloader) return

    if (typeof steal !== 'undefined'){
        System.config({
            map: {
                '$css': "systemjs-reloader/css-steal",
                '$less': "systemjs-reloader/css-steal"
            }
        })
    } else {

        //require('types/steal-to-amd')(System)
        System.config({
            map: {
                'css': "systemjs-reloader/css",
                'less': "systemjs-reloader/css"
            }
        })
    }

    var translateR = System.translate;

    System.translate = function(load) {
        var skip = System.reloader.skip

        var host = location.origin || (location.protocol + '//' + location.host)

        if (load.address.indexOf(host) == 0 && !(skip && skip.test(load.address))){
            var addr = load.address.substr(host.length + 1)
            var mapped = System.reloader.modules[load.name] || {}

            mapped.name = load.name
            mapped.source = load.source
            mapped.metadata = load.metadata
            mapped.address = load.address

            System.reloader.modules[load.name] = mapped
            System.reloader.addrs[addr] = mapped
        }

        return translateR.call(this, load)
    }

    var systemImport = System.import


    System.import = function(name) {

        return systemImport.apply(this, arguments).catch(function(err){

            System.reloader.emit('error', err)
            System.normalize(name).then(function(name){
                //console.warn('System.import', name, err)
                var load = System.reloader.modules[name] || {}
                System.reloader.error = ''
                Object.keys(System.reloader.modules).forEach(function(mod){
                    System.reloader.modules[mod].prevFailed = true
                })
                if (load.metadata){
                    System.define(name, load.source, {metadata: load.metadata, address: load.address})
                }
            })
        })
    }

    //System.trace = true

    System.reloader = System.reloader || {}
    System.reloader.handlers = {}


    System.reloader.modules = System.reloader.modules || {}
    System.reloader.addrs = System.reloader.addrs || {}

    options = options || {}

    System.reloader.catchError = function(error){
        System.reloader.error = error
    }

    System.reloader.removeDOM = function(removeAllDOM){
        $('body').html('')
    }


    Object.keys(options).forEach(function(prop){
        System.reloader[prop] = options[prop]
    })


    System.reloader.deleteAll = function(){
        Object.keys(System.reloader.modules)
            .filter(isModuleNoneStyle)
            .forEach(function(mod){
                System.delete(mod)
            })
    }

    System.reloader.completeReload = function(){
        if (System.reloader.clearConsole && console.clear){
            console.clear()
        }
        if (System.reloader.beforeReload){
            System.reloader.beforeReload()
        }
        debugLog('completeReload')
        System.reloader.deleteAll()
        System.import(System.reloader.main || System.main).then(function(){
            if (System.reloader.afterReload){
                System.reloader.afterReload()
            }
        })

    }

    System.reloader.reload = function(changes, options){

        if (!changes){
            System.reloader.__doCompleteReload = true
            System.reloader.emit('reload')
            return
        }

        var spared = changes.filter(function(change){
            return !System.reloader.addrs[change.file]
        })

        changes = changes.filter(function(change){
            return !!System.reloader.addrs[change.file]
        })

        var reloader = System.reloader

        var main = null

        changes = reloadStyles(changes)




        //var removeDOM = function(){
        //    debugLog('Removing DOM....')
        //    reloader.removeDOM(options.removeAllDOM)
        //}

        //if (reloader.clearConsole && console.clear){
        //    console.clear()
        //}

        if (!changes.length){
            debugLog('No JS to reload')
            return
        }

        var allDependents = {}

        var compareArrays = function(array1, array2){
            return (array1.length == array2.length) && array1.every(function(element, index) {
                    return element === array2[index];
                });
        }

        var findDependants = function(module){

            var dependants = {}

            var checkDeps = function(load){
                if (allDependents[load.name]) return
                if (load.normalized.indexOf(module) >= 0){
                    allDependents[load.name] = load
                    dependants[load.name] = load
                }
            }

            // Find dependent modules (loads) for changed module
            return new Promise(function(resolve){

                Promise.all(Object.keys(reloader.modules).filter(isNonStyle).map(function(m){
                    if (m == module){
                        return Promise.resolve()
                    }

                    var load = reloader.modules[m]
                    var additionalDeps = reloader.deps && reloader.deps[load.name]
                    if (additionalDeps){
                        load.metadata.deps = load.metadata.deps.concat(additionalDeps)
                    }
                    return new Promise(function(resolve){
                        if (load.normalized instanceof Promise){
                            return load.normalized.then(resolve)
                        }

                        if (load.prevDeps && !compareArrays(load.prevDeps, load.metadata.deps) && !load.prevFailed){
                            load.normalized = false
                        }
                        if (load.normalized){
                            checkDeps(load)
                            resolve()
                        } else {
                            load.normalized = Promise.all(load.metadata.deps.map(function(dep){
                                return System.normalize(dep, load.name, load.address)
                            })).then(function(normalized){
                                load.normalized = normalized
                                checkDeps(load)
                                resolve()
                            })
                        }
                    })
                })).then(function(){
                    resolve(dependants)
                })
            })
        }

        var findDependantsMulti = function(modules){
            return new Promise(function(resolve){
                Promise.all(modules.map(function(m){
                    return findDependants(m)
                })).then(function(multi){
                    Promise.all(multi.map(function(m){
                        return findDependantsMulti(Object.keys(m))
                    })).then(resolve)
                })
            })
        }

        var changedModules = changes.map(function(change){

            var load = reloader.addrs[change.file]

            if (!load){
                console.log('No module in loadMaps for changed file', change)
                //reloadPage()
                return
            }

            load.source = change.data
            return load.name
        }).filter(function(m){return !!m})

        System.reloader.emit('beforeReload', mapNames(changes), mapNames(spared))

        findDependantsMulti(changedModules).then(function(){

            // Create dependency graph and sort it topologically
            var depGraph = [],
                modules = Object.keys(allDependents)

            modules.forEach(function(module){
                allDependents[module].normalized.forEach(function(dep){
                    if (reloader.modules[dep]){
                        depGraph.push([dep, module])
                    }
                })
            })

            var excepts = reloader.excepts || []

            var nodes = modules.concat(changedModules)
            var queuedModules = toposort(nodes, depGraph).filter(function(m){
                return excepts.indexOf(m) < 0
            })



            //var main = System.main
            //
            //if (main && queuedModules.indexOf(main) < 0){
            //    queuedModules.push(main)
            //}



            //if (typeof reloader.beforeRemoveDOM == 'function'){
            //    reloader.beforeRemoveDOM()
            //} else if (options.removeDOM !== false){
            //    removeDOM()
            //    if (typeof reloader.afterRemoveDOM == 'function'){
            //        reloader.afterRemoveDOM()
            //    }
            //}

            debugLog('queue', queuedModules)

            // Loop through queue imports
            queuedModules.reduce(function(imp, mod) {

                return imp.then(function(){
                    var deleted = System.delete(mod)
                    if (!deleted){
                        debugLog('System.delete', mod, 'returned false')
                    }

                    var load = reloader.modules[mod]
                    if (load.prevFailed){
                        debugLog('System.import', mod, '(previously failed))')
                    } else {
                        debugLog('System.define', mod)
                    }


                    // some hacky method to handle proviosly failed to load module
                    if (load.prevFailed){
                        return new Promise(function(resolve){
                            //System.delete(mod)
                            // if we do not import module twice it won't be updated any more
                            System.import(mod).then(function(){
                                // wo won't import twice main module
                                // TODO: check for main module
                                if (mod == main){
                                    load.prevFailed = false
                                    //reloader.completeReload()
                                    resolve()
                                } else {
                                    System.delete(mod)
                                    System.import(mod).then(function(){
                                        console.log('SET prevFailed TRUE', mod)
                                        load.prevFailed = false
                                        resolve()
                                    })
                                }
                            })
                        })
                    }

                    // Every time we define mod deps are appended to existing, so clean it up
                    load.prevDeps = load.metadata.deps
                    load.metadata.deps = []
                    return new Promise(function(resolve, reject){
                        System.define(mod, load.source, {address: load.address, metadata: load.metadata})
                            .then(resolve)
                            .catch(function(e){
                                //System.reloader.__doCompleteReload = true
                                //return
                                reloader.__doCompleteReload = false
                                System.reloader.error = ''
                                //TODO remove prevFailed at ALL!!
                                reloader.modules[mod].prevFailed = true
                                //console.warn('System.define', mod, e, reloader.modules[mod])
                                reject(e)
                            })
                    })
                }).catch(function(){

                })
            }, Promise.resolve()).then(function(){
                System.reloader.emit('reload', queuedModules, mapNames(spared))
            });
        })

    }

    System.reloader.reloadStyles = reloadStyles

    System.reloadChanges = function(changes){

        debugLog('reload changes', changes)

        changes = reloadStyles(changes)


        if (System.reloader.error){
            System.reloader.error = ''
            if (System.reloader.reloadPageOnError){
                location.reload()
            } else {
                System.reloader.completeReload()
            }

            return
        }

        if (changes.length){
            System.reloader.completeReload()
        }

    }


    System.reloader.emit = function(event, data){
        var handlers = this.handlers[event]
        handlers && handlers.reverse().forEach(function(handler){
            if (handler.onlyOne){
                handlers.splice(handlers.indexOf(handler), 1)
            }
            handler(data)
        })
    }

    System.reloader.on = function(event, handler){
        var handlers = this.handlers[event] || []
        this.handlers[event] = handlers
        handlers.push(handler)
    }

    System.reloader.one = function(event, handler){
        handler.onlyOne = true
        this.on(event, handler)
    }


}