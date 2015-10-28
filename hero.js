var Heroku = require('heroku-client');
var fs = require('fs');
var Q = require('q');
var colors = require('colors');

var hero = function(options) {
  this.heroku = new Heroku({token: options.token});;
  this.skipInactive = options.skipInactive;
  this.addons = {};
  this.csvBuffer = {};

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
  var buffer = "";
  
  buffer += "App Name : ".bold+appName.blue+"\n";
  var self = this;

  var activeDynos = 0;
  var inactiveDynos = 0;
  var dynoCost = 0;
 
  buffer += "Dynos : ".bold+app.dynos.length.toString().green+"\n";
  app.dynos.forEach(function(d) {
    var title = "\t- "+d.size+" "+d.name;
    if(d.state == 'up' || d.state == 'crashed') {
      activeDynos++;

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
      inactiveDynos++;
      cost = 0;
      title = title.yellow;
      priceStr = "(Inactive)".yellow
    }

    buffer += title.green+" "+priceStr.yellow+"\n";
    dynoCost += cost;
  });

  dynoCost -= 0.05*750; //Free 750 dyno-hours per app
  dynoCost = Math.round(Math.max(dynoCost,0));
  this.total += dynoCost;

  buffer += "Dynos Adjusted Cost : ".bold+"$"+dynoCost+"/mo\n";
  buffer += "Addons : ".bold+app.addons.length.toString().green+"\n";

  var addonCost = 0;
  app.addons.forEach(function(addon) {
    var details = self.addons[addon.addon.id];
    if(!details.price)
      price = 0;
    else
      price = details.price;

    addonCost += price;
    var priceStr = " ($"+price+"/mo)";
    buffer += "\t- ".green+details.name.green+priceStr.yellow+"\n";
  });
  this.total += addonCost;


  buffer += "Addons Cost : ".bold+"$"+addonCost+"/mo\n";
  var totalCost = addonCost + dynoCost;
  buffer += "App Total Cost : ".bold+"$"+totalCost.toString().red+"/mo\n";

  if(this.skipInactive && activeDynos == 0 && totalCost <= 0) {
    return;
  }

  console.log(buffer);
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
