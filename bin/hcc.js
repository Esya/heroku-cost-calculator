#!/usr/bin/env node
var Hero    = require('./../hero');
var colors  = require('colors');
var argv    = require('yargs').argv;

var argv = require('yargs').wrap(100)
    .usage('Usage: $0 -t [string]')
    .example('$0 -t 1234567-12345-123456','Get costs for all apps for this Heroku token')
    .example('$0 -t [token] -i -c output.csv','Output CSV for all active apps')
    .version('0.0.4', 'version', 'display version information').alias('version', 'v')
    .help('h')
    .alias('t','token').string('t').demand('t')
    .describe('t',"Your Heroku API Token")
    .alias('i','skip-inactive').boolean('i').default('i',false)
    .describe('i',"Skip inactive workers")
    .alias('c','csv').string('c')
    .describe('c',"Write result as CSV to target file")
    .epilog('for more information visit https://github.com/esya/heroku-cost-calculator')
    .argv;

var hero = new Hero(argv);

hero.getDynos()
.then(function(dynos) {
  //Rotate per-app
  var apps = {};

  dynos.forEach(function(group) {
    group.forEach(function(dyno) {
      var name = dyno.app.name;
      if(!apps[name]) {
        apps[name] = {};
        apps[name].dynos = [];
        apps[name].addons = [];
      }

      apps[name].dynos.push(dyno);
    });
  });

  return apps;
})
.then(hero.addAddons.bind(hero))
.then(hero.readAddons.bind(hero))
.then(hero.displayPrice.bind(hero))
.done(function() {
},function(e) {
  throw e;
});
