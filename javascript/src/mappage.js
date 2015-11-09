/**
 * EPSG.io Coordinates JavaScript App
 * ----------------------------------
 * Copyright (C) 2013 - Moravian Library, http://www.mzk.cz/
 * Copyright (C) 2014 - Klokan Technologies GmbH, http://www.klokantech.com/
 * All rights reserved.
 */

goog.provide('epsg.io.MapPage');

goog.require('epsg.io.DegreeFormatter');
goog.require('epsg.io.SRSSearch');
goog.require('goog.Timer');
goog.require('goog.Uri.QueryData');
goog.require('goog.dom');
goog.require('goog.net.Jsonp');
goog.require('kt.Nominatim');
goog.require('ol.Map');
goog.require('ol.View');
goog.require('ol.extent');
goog.require('ol.layer.Tile');
goog.require('ol.source.MapQuest');
goog.require('ol.source.OSM');
goog.require('ol.source.TileJSON');


/**
 * @type {string}
 * @const
 */
epsg.io.TRANS_SERVICE_URL = '//epsg.io/trans';



/**
 * @param {string=} opt_srs Spatial Reference System (usually EPSG code)
 * @param {Array.<number>=} opt_bbox [n,w,s,e]
 * @param {number=} opt_lon Longitude of map center (defaults to 0)
 * @param {number=} opt_lat Latitude of map center (defaults to 0)
 * @constructor
 */
epsg.io.MapPage = function(opt_srs, opt_bbox, opt_lon, opt_lat) {

  /**
   * @type {boolean}
   * @private
   */
  this.dynamicMode_ = !goog.isDef(opt_srs);

  // additional handling, if running on /map -- allow srs to be changed
  if (this.dynamicMode_) {
    this.srsTitleEl_ = goog.dom.getElement('crs-title');
    this.srsSearchEl_ = goog.dom.getElement('crs-search');
    this.srsDetailLinkEl_ = goog.dom.getElement('crs-detail-link');
    this.copyClipboardContainerEl_ = /** @type {!Element} */
        (goog.dom.getElement('copy-clipboard-container'));

    goog.style.setElementShown(this.copyClipboardContainerEl_, false);
    goog.style.setElementShown(this.srsDetailLinkEl_, false);

    this.srsSearch_ = new epsg.io.SRSSearch('crs-search', undefined, true);

    this.srsSearch_.listen(epsg.io.SRSSearch.EventType.SRS_SELECTED,
        function(e) {
          this.srs_ = e.data.code;
          this.keepEastNorth = false;
          this.makeQuery();

          goog.dom.setTextContent(this.srsTitleEl_,
              'EPSG:' + e.data.code + ' ' + e.data.name);
          this.srsDetailLinkEl_.href = '/' + e.data.code;
          goog.style.setElementShown(this.copyClipboardContainerEl_, true);
          goog.style.setElementShown(this.srsDetailLinkEl_, true);

          /*
          if (goog.isArray(e.data.bbox) && e.data.bbox.length == 4) {
            var extent = ol.proj.transformExtent(
                [e.data.bbox[1], e.data.bbox[2],
                 e.data.bbox[3], e.data.bbox[0]],
                'EPSG:4326', 'EPSG:3857');
            var center = this.view_.getCenter();
            // only recenter when outside extent
            if (extent && center &&
                !ol.extent.containsCoordinate(extent, center)) {
              var size = this.map_.getSize();
              if (size) {
                this.view_.fit(extent, size);
              }
            }
          }
          */

          this.updateHash_();
        }, false, this);
  }

  /**
   * @type {string}
   * @private
   */
  this.srs_ = opt_srs || '4326';
  var bbox = opt_bbox || [85, -180, -85, 180];

  /**
   * @type {number}
   * @private
   */
  this.lon_ = opt_lon || 0;

  /**
   * @type {number}
   * @private
  */
  this.lat_ = opt_lat || 0;

  // LOAD ALL THE EXPECTED ELEMENTS ON THE PAGE
  this.mapElement = /** @type {!Element} */(goog.dom.getElement('map'));
  this.mapTypeElement_ = /** @type {!HTMLSelectElement} */
                         (goog.dom.getElement('mapType'));

  this.geocoderElement = /** @type {!HTMLInputElement} */
      (goog.dom.getElement('geocoder'));

  this.degreeFormatter = new epsg.io.DegreeFormatter();

  this.eastingElement = goog.dom.getElement('easting');
  this.northingElement = goog.dom.getElement('northing');
  this.eastNorthFormElement = goog.dom.getElement('eastnorth_form');
  this.eastNorthCopyElement = goog.dom.getElement('eastnorth_copy');

  this.lonLatMutex = false;

  // Force preservation of user typed values on recalculation
  this.keepHash = true;
  this.keepLonLat = false;
  this.keepEastNorth = false;

  /**
   * @type {?number}
   * @private
   */
  this.queryTimer_ = null;

  /**
   * @type {!goog.net.Jsonp}
   * @private
   */
  this.jsonp_ = new goog.net.Jsonp(epsg.io.TRANS_SERVICE_URL);

  this.view_ = new ol.View({
    center: ol.proj.fromLonLat([this.lon_, this.lat_]),
    zoom: 8,
    maxZoom: 19
  });

  this.map_ = new ol.Map({
    target: this.mapElement,
    view: this.view_,
    layers: []
  });

  var size = this.map_.getSize();
  if (size) {
    this.view_.fit(
        ol.proj.transformExtent([bbox[1], bbox[2], bbox[3], bbox[0]],
        'EPSG:4326', 'EPSG:3857'), size);
  }

  this.updateLonLat_([this.lon_, this.lat_]);

  this.view_.on('change:center', function(e) {
    var pos = ol.proj.toLonLat(this.view_.getCenter());
    this.updateLonLat_(pos);
  }, this);

  this.parseHash_();

  goog.events.listen(this.mapTypeElement_, goog.events.EventType.CHANGE,
      function(e) {
        this.updateMapType_();
        this.updateHash_();
      }, false, this);
  this.updateMapType_();

  this.keepHash = false;

  goog.events.listen(this.degreeFormatter, goog.events.EventType.CHANGE,
      function(e) {
        this.keepLonLat = true;
        this.updateLonLat_(e.lonlat);
        this.keepLonLat = false;
      }, false, this);

  // The user can type easting / northing and hit Enter
  goog.events.listen(this.eastNorthFormElement, goog.events.EventType.SUBMIT,
      function(e) {
        var easting = goog.string.toNumber(this.eastingElement.value);
        var northing = goog.string.toNumber(this.northingElement.value);
        if (!isNaN(easting) && !isNaN(northing)) {
          // Make the query to epsg.io/trans to get new lat/lon
          this.degreeFormatter.setLonLat(null, null);
          this.jsonp_.send({
            'x': easting,
            'y': northing,
            's_srs': this.srs_
          }, goog.bind(function(result) {
            var latitude = goog.string.toNumber(result['y']);
            var longitude = goog.string.toNumber(result['x']);
            this.keepEastNorth = true;
            this.updateLonLat_([longitude, latitude]);
            this.keepEastNorth = false;
          }, this));
        }
        e.preventDefault();
      }, false, this);

  if (this.geocoderElement) {
    var nominatim = new kt.Nominatim(this.geocoderElement,
        'http://nominatim.klokantech.com/');
    nominatim.registerCallback(goog.bind(function(bnds) {
      this.geocoderElement.value = '';
      var size = this.map_.getSize();
      if (size && ol.extent.getArea(bnds) > 1e-5) {
        this.view_.fit(
            ol.proj.transformExtent(bnds, 'EPSG:4326', 'EPSG:3857'), size);
      } else {
        this.view_.setCenter(ol.proj.fromLonLat(ol.extent.getCenter(bnds)));
        this.view_.setZoom(15);
      }
    }, this));
  }


  // ZeroClipboard initialization
  var ZeroClipboard = window['ZeroClipboard'];
  ZeroClipboard['config']({ 'moviePath': '/js/ZeroClipboard.swf' });
  this.eastNorthZeroClipboard = new ZeroClipboard(this.eastNorthCopyElement);

  this.eastNorthZeroClipboard['on']('dataRequested',
      goog.bind(function(client, args) {
        var eastNorthText = this.eastingElement.value + '\t' +
            this.northingElement.value;
        client['setText'](eastNorthText);
      }, this));
};


/**
 * @private
 */
epsg.io.MapPage.prototype.updateMapType_ = function() {
  var newLayers = [];
  var src;

  var tilejson = this.mapTypeElement_.options[
      this.mapTypeElement_.selectedIndex].getAttribute('data-tilejson');
  if (tilejson) {
    src = new ol.source.TileJSON({url: tilejson});
  } else {
    var mapType = this.mapTypeElement_.value;
    if (mapType == 'mqosm') {
      src = new ol.source.MapQuest({layer: 'osm'});
    } else if (mapType == 'osm') {
      src = new ol.source.OSM();
    }
  }
  newLayers = [new ol.layer.Tile({source: src})];

  this.map_.getLayerGroup().setLayers(new ol.Collection(newLayers));
  this.map_.updateSize();
};


/**
 * The throttled call for the coordinates transformation via JSONP
 * @protected
 */
epsg.io.MapPage.prototype.makeQuery = function() {
  this.eastingElement.value = '';
  this.northingElement.value = '';

  // If the timer has a waiting query, then trash it -
  // it is obsolete, because we have a new one
  if (this.queryTimer_) {
    goog.Timer.clear(this.queryTimer_);
    this.queryTimer_ = null;
  }

  // Don't proceed with the JSONP query immediatelly,
  //   but wait for 500 ms if the user doesn't make a new one.
  this.queryTimer_ = goog.Timer.callOnce(function() {
    var showResult = goog.bind(function(result) {
      if (!this.keepEastNorth) {
        this.eastingElement.value = result.x;
        this.northingElement.value = result.y;
      }
      this.queryTimer_ = null;
    }, this);

    var data = { 'x': this.lon_, 'y': this.lat_, 't_srs': this.srs_ };
    if (this.srs_ == '4326') {// no need to transform
      showResult(data);
    } else {
      this.jsonp_.send(data, showResult);
    }
  }, 500, this);
};


/**
 * @param {ol.Coordinate} lonlat
 * @private
 */
epsg.io.MapPage.prototype.updateLonLat_ = function(lonlat) {
  if (this.lonLatMutex) return;
  this.lonLatMutex = true;
  this.lat_ = lonlat[1];
  this.lon_ = lonlat[0];
  if (!this.keepLonLat) {
    this.degreeFormatter.setLonLat(this.lon_, this.lat_);
  }
  if (!this.keepEastNorth) {
    this.makeQuery();
  }
  this.view_.setCenter(ol.proj.fromLonLat([this.lon_, this.lat_]));
  this.lonLatMutex = false;

  this.updateHash_();
};


/**
 * @private
 */
epsg.io.MapPage.prototype.updateHash_ = function() {
  if (this.keepHash) return;
  var qd = new goog.Uri.QueryData();

  if (this.dynamicMode_) {
    qd.set('srs', this.srs_);
  }

  qd.set('lon', this.lon_.toFixed(7));
  qd.set('lat', this.lat_.toFixed(7));
  qd.set('z', this.view_.getZoom());

  var layer = this.mapTypeElement_.value;
  if (layer != 'mqosm') {
    // do not include default value to shorten the url
    qd.set('layer', this.mapTypeElement_.value);
  }

  window.location.hash = qd.toString();
};


/**
 * @private
 */
epsg.io.MapPage.prototype.parseHash_ = function() {
  var qd = new goog.Uri.QueryData(window.location.hash.substr(1));


  if (this.dynamicMode_) {
    var srs = qd.get('srs');
    if (srs) {
      this.srsSearch_.select(/** @type {string} */(srs));
    }
  }

  var lon = parseFloat(qd.get('lon')), lat = parseFloat(qd.get('lat'));
  if (goog.math.isFiniteNumber(lon) && goog.math.isFiniteNumber(lat)) {
    this.updateLonLat_([lon, lat]);
  }
  var z = parseInt(qd.get('z'), 10);
  if (goog.math.isFiniteNumber(z)) {
    this.view_.setZoom(z);
  }
  var layer = qd.get('layer');
  if (layer) {
    this.mapTypeElement_.value = /** @type {string} */(layer);
    this.updateMapType_();
  }
};


goog.exportSymbol('MapPage', epsg.io.MapPage);
