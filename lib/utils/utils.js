'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _mathLog2 = require('./math/log2');

var _mathLog22 = _interopRequireDefault(_mathLog2);

var GOOGLE_TILE_SIZE = 256;

function latLng2World(_ref) {
  var lat = _ref.lat;
  var lng = _ref.lng;

  var sin = Math.sin(lat * Math.PI / 180);
  var x = lng / 360 + 0.5;
  var y = 0.5 - 0.25 * Math.log((1 + sin) / (1 - sin)) / Math.PI;

  y = y < 0 // eslint-disable-line
  ? 0 : y > 1 ? 1 : y;
  return { x: x, y: y };
}

function world2LatLng(_ref2) {
  var x = _ref2.x;
  var y = _ref2.y;

  var n = Math.PI - 2 * Math.PI * y;

  // TODO test that this is faster
  // 360 * Math.atan(Math.exp((180 - y * 360) * Math.PI / 180)) / Math.PI - 90;
  return {
    lat: 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))),
    lng: x * 360 - 180
  };
}

// Thank you wiki https://en.wikipedia.org/wiki/Geographic_coordinate_system
function latLng2MetersPerDegree(_ref3) {
  var lat = _ref3.lat;

  var phi = lat * Math.PI / 180;
  var metersPerLatDegree = 111132.92 - 559.82 * Math.cos(2 * phi) + 1.175 * Math.cos(4 * phi) - 0.0023 * Math.cos(6 * phi);
  var metersPerLngDegree = 111412.84 * Math.cos(phi) - 93.5 * Math.cos(3 * phi) + 0.118 * Math.cos(5 * phi);
  return { metersPerLatDegree: metersPerLatDegree, metersPerLngDegree: metersPerLngDegree };
}

function meters2LatLngBounds(meters, _ref4) {
  var lat = _ref4.lat;
  var lng = _ref4.lng;

  var _latLng2MetersPerDegree = latLng2MetersPerDegree({ lat: lat });

  var metersPerLatDegree = _latLng2MetersPerDegree.metersPerLatDegree;
  var metersPerLngDegree = _latLng2MetersPerDegree.metersPerLngDegree;

  var latDelta = 0.5 * meters / metersPerLatDegree;
  var lngDelta = 0.5 * meters / metersPerLngDegree;

  return {
    nw: {
      lat: lat - latDelta,
      lng: lng - lngDelta
    },
    se: {
      lat: lat + latDelta,
      lng: lng + lngDelta
    }
  };
}

function meters2WorldSize(meters, _ref5) {
  var lat = _ref5.lat;
  var lng = _ref5.lng;

  var _meters2LatLngBounds = meters2LatLngBounds(meters, { lat: lat, lng: lng });

  var nw = _meters2LatLngBounds.nw;
  var se = _meters2LatLngBounds.se;

  var nwWorld = latLng2World(nw);
  var seWorld = latLng2World(se);
  var w = Math.abs(seWorld.x - nwWorld.x);
  var h = Math.abs(seWorld.y - nwWorld.y);

  return { w: w, h: h };
}

exports['default'] = {
  fitBounds: function fitBounds(_ref6, _ref7) {
    var nw = _ref6.nw;
    var se = _ref6.se;
    var width = _ref7.width;
    var height = _ref7.height;

    var EPS = 0.000000001;
    var nwWorld = latLng2World(nw);
    var seWorld = latLng2World(se);
    var dx = nwWorld.x < seWorld.x ? seWorld.x - nwWorld.x : 1 - nwWorld.x + seWorld.x;
    var dy = seWorld.y - nwWorld.y;

    if (dx <= 0 && dy <= 0) {
      return null;
    }

    var zoomX = _mathLog22['default'](width / GOOGLE_TILE_SIZE / dx);
    var zoomY = _mathLog22['default'](height / GOOGLE_TILE_SIZE / dy);
    var zoom = Math.floor(EPS + Math.min(zoomX, zoomY));

    // TODO find center just unproject middle world point
    var middle = {
      x: nwWorld.x < seWorld.x // eslint-disable-line
      ? 0.5 * (nwWorld.x + seWorld.x) : nwWorld.x + seWorld.x - 1 > 0 ? 0.5 * (nwWorld.x + seWorld.x - 1) : 0.5 * (1 + nwWorld.x + seWorld.x),
      y: 0.5 * (nwWorld.y + seWorld.y)
    };

    return {
      center: world2LatLng(middle),
      zoom: zoom
    };
  },

  // -------------------------------------------------------------------
  // Helpers to calc some markers size

  meters2ScreenPixels: function meters2ScreenPixels(meters, _ref8, zoom) {
    var lat = _ref8.lat;
    var lng = _ref8.lng;

    var _meters2WorldSize = meters2WorldSize(meters, { lat: lat, lng: lng });

    var w = _meters2WorldSize.w;
    var h = _meters2WorldSize.h;

    var scale = Math.pow(2, zoom);
    var wScreen = w * scale * GOOGLE_TILE_SIZE;
    var hScreen = h * scale * GOOGLE_TILE_SIZE;
    return {
      w: wScreen,
      h: hScreen
    };
  },

  // --------------------------------------------------
  // Helper functions for working with svg tiles, (examples coming soon)

  tile2LatLng: function tile2LatLng(_ref9, zoom) {
    var x = _ref9.x;
    var y = _ref9.y;

    var n = Math.PI - 2 * Math.PI * y / Math.pow(2, zoom);

    return {
      lat: 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))),
      lng: x / Math.pow(2, zoom) * 360 - 180
    };
  },

  latLng2Tile: function latLng2Tile(_ref10, zoom) {
    var lat = _ref10.lat;
    var lng = _ref10.lng;

    var worldCoords = latLng2World({ lat: lat, lng: lng });
    var scale = Math.pow(2, zoom);

    return {
      x: Math.floor(worldCoords.x * scale),
      y: Math.floor(worldCoords.y * scale)
    };
  },

  getTilesIds: function getTilesIds(_ref11, zoom) {
    var from = _ref11.from;
    var to = _ref11.to;

    var scale = Math.pow(2, zoom);

    var ids = [];
    for (var x = from.x; x !== (to.x + 1) % scale; x = (x + 1) % scale) {
      for (var y = from.y; y !== (to.y + 1) % scale; y = (y + 1) % scale) {
        ids.push([zoom, x, y]);
      }
    }

    return ids;
  }
};
module.exports = exports['default'];