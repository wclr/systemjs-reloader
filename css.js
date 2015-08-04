exports.instantiate = function(load) {

    load.metadata.deps = [];

    if(load.source) {
        var head = document.head || document.getElementsByTagName('head')[0],
            style = document.createElement('style'),
            source = load.source+"/*# sourceURL=" + load.address + " */";

        //TODO: normalize relative URLS

        style.type = 'text/css';

        if (load.metadata.replace){
            for (var i = 0; i < document.styleSheets.length; i++){
                var ss = document.styleSheets[i]
                if (ss.ownerNode.innerHTML.indexOf('sourceURL=' + load.address) >= 0){
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