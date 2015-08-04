exports.instantiate = function(load) {

    load.metadata.deps = [];
    load.metadata.execute = function(){
        if(load.source) {
            var head = document.head || document.getElementsByTagName('head')[0],
                style = document.createElement('style'),
                source = load.source+"/*# sourceURL=" + load.address + " */";

            // make source load relative to the current page
            source = source.replace(/url\(['"]?([^'"\)]*)['"]?\)/g, function( whole, part ) {
                var result = "url(" + steal.joinURIs( load.address, part) + ")";
                return result
            });

            style.type = 'text/css';

            if (load.metadata.replace){
                if (System.reloader.debug){
                    console.log('replace css plugin:', load.address)
                }
                for (var i = 0; i < document.styleSheets.length; i++){
                    var ss = document.styleSheets[i]
                    if (ss.ownerNode.innerHTML.indexOf('sourceURL=' + load.address) >= 0){
                        console.log('replace css plugin:', load.address, 'found replace')
                        ss.ownerNode.innerHTML = source
                        load.metadata.replace = false
                        break;
                    }
                }
            } else {
                if (style.styleSheet){
                    style.styleSheet.cssText = source;
                } else {
                    style.appendChild(document.createTextNode(source));
                }
                head.appendChild(style);
            }
        }

        return System.newModule({});
    };
    load.metadata.format = "css";
};