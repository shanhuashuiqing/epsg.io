<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"  lang="en" xml:lang="en">
    <head>
        <meta charset="utf-8"/>
%if defined('name'):
        <title>WGS84 and {{name}} - transform coordinates for position on a map - converting latitude / longitude degrees</title>
%else:
        <title>Transform coordinates for position on a map - converting latitude / longitude degrees</title>
%end
        <meta content="width=device-width, initial-scale=1, maximum-scale=1" name="viewport" />
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <meta name="description" content="Transform coordinates for position on a map - converting latitude / longitude degrees" />
        <meta name="keywords" content="EPSG.io" />
        <meta name="robots" content="ALL,FOLLOW" />
        <link rel="stylesheet" href="/css/main.css" type="text/css" />
        <link rel="shortcut icon" href="//epsg.io/favicon.ico" />
        <link rel="search" href="/opensearch.xml" title="EPSG.io" type="application/opensearchdescription+xml"/>
        <script src="/js/ZeroClipboard.min.js"></script>
        <script src="/js/map.js"></script>
    </head>
    <body id="mappage" data-role="page">
        <div id="map"></div>
        <select id="mapType">
          <option value="mqosm">OSM MapQuest</option>
          <option value="osm">OSM</option>
          <option value="streets" data-tilejson="http://api.tiles.mapbox.com/v3/klokantech.icij6jpi.jsonp">MapBox Streets</option>
          <option value="satellite" data-tilejson="http://api.tiles.mapbox.com/v3/klokantech.iciigjd2.jsonp">MapBox Satellite</option>
        </select>
        <div id="mapsight"></div>
        <div id="head">
            <div id="head-top">
                <p id="logo-container">
                    <a href="//epsg.io" title=""><span>Epsg.io</span> Coordinate Systems Worldwide</a>
                </p>
                <ul id="menu-top">
                    <li><a href="/about" title="">About</a></li>
                </ul>
            </div>
            <div id="search-lat-lg-container">
                <div id="search-container">
                    <p><form><input type="search" name="geocoder" id="geocoder" placeholder="Place or address" /> <input type="submit" name="send" value="search" /></form></p>
                </div>
                <div id="lat-lg-container">
                    <form id="lonlat_form" class="dec" method="post" action="#">
                    <select id="lonlat_format">
                      <option value="dec">Decimal</option>
                      <option value="dm">DM</option>
                      <option value="dms">DMS</option>
                    </select>
                    <p id="lg">
                      <label for="longitude">Longitude:</label>
                      <select id="longitude_sign"><option value="+">E</option><option value="-">W</option></select>
                      <input id="longitude_d" value="0" />°
                      <input id="longitude_m" class="lonlat_min" value="0" /><span class="lonlat_min">'</span>
                      <input id="longitude_s" class="lonlat_sec" value="0" /><span class="lonlat_sec">''</span>
                    </p>
                    <p id="lat">
                      <label for="latitude">Latitude:</label>
                      <select id="latitude_sign"><option value="+">N</option><option value="-">S</option></select>
                      <input id="latitude_d" value="0" />°
                      <input id="latitude_m" class="lonlat_min" value="0" /><span class="lonlat_min">'</span>
                      <input id="latitude_s" class="lonlat_sec" value="0" /><span class="lonlat_sec">''</span>
                    </p>
                    <input type="submit" id="lonlat_submit" value="">
                    </form>
                </div>
            </div>
        </div>
        <div id="map-clipboard-container">
                <div id="mc-info-container">
%if defined('name'):
                    <h1>EPSG:{{code}} {{name}}</h1>
                    <p>
                        <a href="//epsg.io/" title="">Change coordinate system</a>
                        <a class="right" href="//epsg.io/{{url_coords}}" title="">Show details</a>
                    </p>
%else:
                    <h1 id="crs-title">Choose coordinate system</h1>
                    <p>
                        Find a coordinate system: <input type="search" id="crs-search" placeholder="Country, code or name of a coordinate system" />
                        <a id="crs-detail-link" class="right" href="#" title="">Show details</a>
                    </p>
%end
                </div>
                <div id="copy-clipboard-container">
                    <p>
                        <form id="eastnorth_form" method="post" action="#">
                        <input id="easting" type="text" name="easting" value="" />
                        <input id="northing" type="text" name="northing" value="" />
                        <a id="eastnorth_copy" href="#" title="">Copy to clipboard</a>
                        <input type="submit" id="lonlat_submit" value="">
                        </form>
                    </p>
                </div>
            </div>
        </div>
    <script type="text/javascript">
%if defined('url_coords'):
      new MapPage('{{url_coords}}', {{bbox}}, {{center[1]}}, {{center[0]}});
%else:
      new MapPage;
%end
    </script>
    </body>
</html>
