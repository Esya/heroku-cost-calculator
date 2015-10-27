var Heroku = require('heroku-client');
var fs = require('fs');
var Q = require('q');
var colors = require('colors');

var hero = function(options) {
  this.heroku = new Heroku({token: options.token});;
  this.addons = {};

  this.total = 0;
}

hero.prototype.getDynos = function() {
  var self = this;
  return self.heroku.apps().list().then(function (apps) {
    return Q.all(apps.map(function (app) {
      return self.heroku.apps(app.name).dynos().list();
    }));
  });
}

hero.prototype.displayPrice = function(apps) {
  for(appName in apps) {
    this.displayPriceApp(appName,apps[appName])
  }

  var priceStr = "$"+this.total+"/mo";
  console.log("Total cost accross all apps : ".underline.blue+" "+priceStr.red);
}

hero.prototype.readAddons = function(apps) {
  var self = this;
  for(appName in apps) {
    var app = apps[appName];
    var addons = app.addons;

    addons.forEach(function(addon) {
      var id = addon.addon.id;
      self.addons[id] = {};
    })
  }

  var p = [];
  var addonsIds = Object.keys(this.addons);

  addonsIds.forEach(function(id) {
    p.push(self.heroku.addons(id).info().then(function(info) {
      self.addons[id].name = info.plan.name;
      serviceId = info.addon_service.id;
      planId = info.plan.id;

      return self.heroku.addonServices(serviceId).plans(planId).info().then(function(info) {
        if(info.price.unit !== 'month') throw "Unexpected : Not Month";
        self.addons[id].price = info.price.cents / 100;
      })
    }))
  });

  return Q.allSettled(p).then(function() {
    return apps;
  });
}

hero.prototype.displayPriceApp = function(appName,app) {
  console.log("App Name : ".bold+appName.blue);
  var self = this;

  var activeDynos = 0;
  var inactiveDynos = 0;
  var dynoCost = 0;
  
  console.log("Dynos : ".bold+app.dynos.length.toString().green);
  app.dynos.forEach(function(d) {
    var title = "\t- "+d.size+" "+d.name;
    if(d.state == 'up' || d.state == 'crashed') {
      switch(d.size) {
        case '1X':
        cost = 0.05 * 24 * 31;
        break;

        case '2X':
        cost = 0.10 * 24 * 31;
        break;

        case 'M':
        cost = 250;
        break;

        case 'L':
        cost = 500;
        break;

        case 'Free':
        cost = 0;
        break;

        default:
        throw "Unknown size "+d.size;
        break;
      }
      priceStr = "($"+cost+"/mo)";
      title = title.green;
    } else {
      cost = 0;
      title = title.yellow;
      priceStr = "(Inactive)".yellow
    }

    console.log(title.green+" "+priceStr.yellow);
    dynoCost += cost;
  });

  dynoCost -= 0.05*750; //Free 750 dyno-hours per app
  dynoCost = Math.round(Math.max(dynoCost,0));
  this.total += dynoCost;

  console.log("Dynos Adjusted Cost : ".bold+"$"+dynoCost+"/mo");
  console.log("Addons : ".bold+app.addons.length.toString().green);

  var addonCost = 0;
  app.addons.forEach(function(addon) {
    var details = self.addons[addon.addon.id];
    if(!details.price)
      price = 0;
    else
      price = details.price;

    addonCost += price;
    var priceStr = " ($"+price+"/mo)";
    console.log("\t- ".green+details.name.green+priceStr.yellow);
  });
  this.total += addonCost;


  console.log("Addons Cost : ".bold+"$"+addonCost+"/mo");
  var totalCost = addonCost + dynoCost;
  console.log("App Total Cost : ".bold+"$"+totalCost.toString().red+"/mo");
  //AddonCost
  
  console.log("");
}

hero.prototype.addAddons = function(apps) {
  var p = [];

  for(appName in apps) {
    var attachments = this.heroku.apps(appName).addonAttachments();
    p.push(attachments.listByApp());
  }

  return Q.all(p).then(function(values) {
    values.forEach(function(addons) {
      addons.forEach(function(addon) {
        appName = addon.app.name;
        apps[appName].addons.push(addon);
      })
    })

    return apps;
  });
}

module.exports = hero;
