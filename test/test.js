require("systemjs-reloader")({
    main: 'test/app',
    skip: /node_modules|bower_components|can\.js/i,
    deps: {
        'components/web-app/web-app': ['components/reader-app/', 'components/promo-page/']
    },
    excepts: ['test/test'],
    debug: true,
    beforeReload: function(){

    },
    clearConsole: false,
    afterReload: function(){
    }

})




var expect = chai.expect
chai.should()
mocha.setup('bdd')



var getHtml = function(){
    return document.getElementById('test').innerHTML
}

var getStyle = function(){
    return getComputedStyle(document.getElementById('test'))
}


describe('Systemjs module hot reload', function(){


    before(function(done){
        System.import('test/app').then(function(){
            done()
        })
        //document.getElementById('test').innerHTML = 'CJS TEXT'
    })

    it('System.trace set to true', function(){
        expect(System.trace).to.be.true
    })

    it('System.reloader object presents', function(){
        expect(System.reloader).to.be.object
    })

    it('System.reloader.modules has test/app', function(){
        var modules = System.reloader.modules
        expect(modules['test/app']).to.be.object
        expect(modules['test/app'].address).to.be.string
        expect(modules['test/app'].name).to.be.string
    })

    it('System loads app', function(){
        expect(getHtml()).to.be.equal('APP LOADED')
        console.log('System.reloader', System.reloader)
    })

    it('Test div style initial state', function(){
        expect(getStyle().color).to.be.equal('rgb(255, 0, 0)')
    })


    describe('redefines source of css style', function(){
        before(function(done){
            //var changes = [{file: 'test/cjs-module.js', data: "document.getElementById('test').innerHTML = 'CJS CHANGED'"}]
            //#test {color: red;}
            var changes = [{file: 'test/app.css', data: "#test {color: rgb(0, 128, 0);}"}]
            System.reloadChanges(changes)
            setTimeout(function(){
                done()
            }, 100)
        })

        it('number of style elements is correct', function(){
            expect(document.head.getElementsByTagName('style').length).to.be.equal(2)
        })

        it('changes style of test div', function(){
            console.log(getStyle().color)
            expect(getStyle().color).to.be.equal('rgb(0, 128, 0)')
        })

    })
})

mocha.run();