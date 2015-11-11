/*jslint node: true, nomen: true */
'use strict';

var Gun = require('gun'),
  levelUP = require('level'),
  defaultFolder = 'level/';

var path = {};


function valid(err) {
  var noData = 'Key not found in database';

  if (!err) {
    return false;
  }
  if (err.message.match(noData)) {
    return false;
  }
  return true;
}


function patch(opt) {
  // Give default options where they aren't defined

  opt = opt || {};
  opt.hooks = opt.hooks || {};
  opt.level = opt.level || {};

  var folder, level = opt.level;
  opt.level.folder = opt.level.folder || defaultFolder;
  folder = level.folder;
  opt.level.folder = folder && folder.replace(/\/$/, '') + '/';

  return opt;
}



function setup(gun, opt) {

  opt = patch(opt);

  var driver, level, folder = opt.level.folder;


  // level instances can't share a database
  // set it to the instance already using that path.
  if (!path[folder]) {

    path[folder] = level = levelUP(folder, {
      valueEncoding: 'json'
    });

  } else {
    level = path[folder];
  }




  driver = {
    get: function (key, cb, opt) {

      if (!key) {
        return cb({
          err: "No key was given to .get()"
        }, false);
      }

      level.get(key, function (err, souls) {
        var saved = 0,
          pending = 0;

        if (!souls) {
          cb(null, null);
        }

        Gun.obj.map(souls, function (rel, soul) {
          pending += 1;

          level.get(soul, function (err, node) {
            if (valid(err)) {
              return cb({
                err: err
              }, false);
            }
            var graph = {},
              soul = Gun.is.soul.on(node);
            graph[soul] = node;
            cb(null, graph || null);
            graph = {};
            graph[soul] = Gun.union.pseudo(soul);
            cb(null, graph || null);

            saved += 1;
            if (pending === saved) {
              cb(null, {});
            }
          });
        });
      });

    },

    put: function (graph, cb, opt) {
      var saved = 0,
        pending = 0;

      Gun.is.graph(graph, function (node, soul) {
        pending += 1;
        level.put(soul, node, function (err) {
          if (valid(err)) {
            cb({
              err: err
            }, false);
          }
          saved += 1;
          if (pending === saved) {
            cb(null, true);
          }
        });
      });

    },

    key: function (name, soul, cb) {
      if (!name) {
        return cb({
          err: "No key was given to .key()"
        }, false);
      }
      if (!soul) {
        return cb({
          err: "No soul given to .key()"
        }, false);
      }
      level.get(name, function (err, graph) {
        if (valid(err)) {
          return cb({
            err: err
          }, false);
        }
        graph = graph || {};
        graph[soul] = {
          '#': soul
        };
        level.put(name, graph, function (err) {
          if (valid(err)) {
            return cb({
              err: err
            }, false);
          }
          cb(null, true);
        });

      });

    }
  };









  gun.opt({
    hooks: {
      get: opt.hooks.get || driver.get,
      put: opt.hooks.put || driver.put,
      key: opt.hooks.key || driver.key
    }
  }, true);

}


Gun.on('opt').event(setup);


module.exports = Gun;
