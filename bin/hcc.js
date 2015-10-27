#!/usr/bin/env node
var Hero    = require('./../hero');
var colors  = require('colors');
var argv    = require('yargs').argv;

var argv = require('yargs')
    .usage('Usage: $0 -t [string] -h [num]')
    .alias('t','token').string('t').demand('t')
    .describe('t',"Your Heroku API Token")
    .alias('i','skip-inactive').boolean('i').default('i',false)
    .describe('i',"Skip inactive workers (To be implemented)")
    .alias('c','csv').boolean('c').default('c',false)
    .describe('c',"Output CSV instead (To be implemented)")
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
