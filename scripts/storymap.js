$(window).on('load', function() {
  var documentSettings = {};

  // Some constants, such as default settings
  const CHAPTER_ZOOM = 15;

  // First, try reading Options.csv
  $.get('csv/Options.csv', function(options) {

    $.get('csv/Chapters.csv', function(chapters) {
      initMap(
        $.csv.toObjects(options),
        $.csv.toObjects(chapters)
      )
    }).fail(function(e) { alert('Found Options.csv, but could not read Chapters.csv') });

  // If not available, try from the Google Sheet
  }).fail(function(e) {

    var parse = function(res) {
      return Papa.parse(Papa.unparse(res[0].values), {header: true} ).data;
    }

    // First, try reading data from the Google Sheet
    if (typeof googleDocURL !== 'undefined' && googleDocURL) {

      if (typeof googleApiKey !== 'undefined' && googleApiKey) {

        var apiUrl = 'https://sheets.googleapis.com/v4/spreadsheets/'
        var spreadsheetId = googleDocURL.split('/d/')[1].split('/')[0];

        $.when(
          $.getJSON(apiUrl + spreadsheetId + '/values/Options?key=' + googleApiKey),
          $.getJSON(apiUrl + spreadsheetId + '/values/Chapters?key=' + googleApiKey),
        ).then(function(options, chapters) {
          initMap(parse(options), parse(chapters))
        })

      } else {
        alert('You load data from a Google Sheet, you need to add a free Google API key')
      }

    } else {
      alert('You need to specify a valid Google Sheet (googleDocURL)')
    }

  })



  /**
  * Reformulates documentSettings as a dictionary, e.g.
  * {"webpageTitle": "Leaflet Boilerplate", "infoPopupText": "Stuff"}
  */
  function createDocumentSettings(settings) {
    for (var i in settings) {
      var setting = settings[i];
      documentSettings[setting.Setting] = setting.Customize;
    }
  }

  /**
   * Returns the value of a setting s
   * getSetting(s) is equivalent to documentSettings[constants.s]
   */
  function getSetting(s) {
    return documentSettings[constants[s]];
  }

  /**
   * Returns the value of setting named s from constants.js
   * or def if setting is either not set or does not exist
   * Both arguments are strings
   * e.g. trySetting('_authorName', 'No Author')
   */
  function trySetting(s, def) {
    s = getSetting(s);
    if (!s || s.trim() === '') { return def; }
    return s;
  }

  /**
   * Loads the basemap and adds it to the map
   */
  function addBaseMap() {
    var basemap = trySetting('_tileProvider', 'Stamen.TonerLite');
    L.tileLayer.provider(basemap, {
      maxZoom: 18
    }).addTo(map);
  }

  function initMap(options, chapters) {
    createDocumentSettings(options);

    var chapterContainerMargin = 70;

    document.title = getSetting('_mapTitle');
    $('#header').append('<h1>' + (getSetting('_mapTitle') || '') + '</h1>');
    $('#header').append('<h2>' + (getSetting('_mapSubtitle') || '') + '</h2>');

    // Add logo
    if (getSetting('_mapLogo')) {
      $('#logo').append('<img src="' + getSetting('_mapLogo') + '" />');
      $('#top').css('height', '60px');
    } else {
      $('#logo').css('display', 'none');
      $('#header').css('padding-top', '25px');
    }

    // Load tiles
    addBaseMap();

    // Add scale if needed
    if (getSetting('_scaleControls') !== 'off') {
      L.control.scale({
        position: getSetting('_scaleControls'),
        imperial: false
      }).addTo(map);
    }

    // Add zoom controls if needed
    if (getSetting('_zoomControls') !== 'off') {
      L.control.zoom({
        position: getSetting('_zoomControls')
      }).addTo(map);
    }

    var markers = [];

    var markActiveColor = function(k) {
      /* Removes marker-active class from all markers */
      for (var i = 0; i < markers.length; i++) {
        if (markers[i] && markers[i]._icon) {
          markers[i]._icon.className = markers[i]._icon.className.replace(' marker-active', '');

          if (i == k) {
            /* Adds marker-active class, which is orange, to marker k */
            markers[k]._icon.className += ' marker-active';
          }
        }
      }
    }

    var markerOnTop = function(k) {
      /* sets markers z-index to 0 */
      for (var i = 0; i < markers.length; i++) {
        if (markers[i] && markers[i]._icon) {
          markers[i].setZIndexOffset(0);

          if (i == k) {
            /* Adds marker-active class, which is orange, to marker k */
            markers[k].setZIndexOffset(1000);
          }
        }
      }
    }

    var pixelsAbove = [];
    var chapterCount = 0;

    var currentlyInFocus; // integer to specify each chapter is currently in focus
    var overlay;  // URL of the overlay for in-focus chapter
    var geoJsonOverlay;
    var geoJsonOverlayName = null;

    for (i in chapters) {
      var c = chapters[i];

      if ( !isNaN(parseFloat(c['Latitude'])) && !isNaN(parseFloat(c['Longitude']))) {
        var lat = parseFloat(c['Latitude']);
        var lon = parseFloat(c['Longitude']);

        if (c['Marker'] === 'Numbered') chapterCount += 1;

        var markerNumber = c['Marker'] === 'Plain' ? '' : chapterCount;
        if (c['Marker'] === 'CustomNumbered') markerNumber = c['Custom Number']

        if (c['Marker Color'] != 'metro') {
          markers.push(
            L.marker([lat, lon], {
              icon: L.ExtraMarkers.icon({
                icon: 'fa-number',
                number: markerNumber,
                markerColor: c['Marker Color'] || 'blue'
              }),
              opacity: c['Marker'] === 'Hidden' ? 0 : 0.9,
              interactive: c['Marker'] === 'Hidden' ? false : true,
            }
          ));
        } else {
          markers.push(
            L.marker([lat, lon], {
              icon: L.divIcon({
                  html: `
                  <?xml version="1.0" encoding="utf-8"?>
                  <svg version="1.1" id="svg2" xmlns:svg="http://www.w3.org/2000/svg"
                     xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 833.3 622.5"
                     enable-background="new 0 0 833.3 622.5" xml:space="preserve">
                  <g>
                    <rect x="400.65" y="480" fill="black" width="32" height="60"/>
                    <rect x="100.65" y="540" fill="white" stroke-width="5" stroke="black" width="632" height="80"/>
                    <text x="416.65" y="582.55" font-family="Helvetica" font-weight="bold" font-size="60" fill="black" dominant-baseline="middle" text-anchor="middle">`.concat(c['Chapter'].split('middle">')[1].split("<")[0]).concat(`</text>
                  </g>
                  <g>
                    <polygon fill="#FFFFFF" points="166.7,250 416.7,100 666.7,250 416.7,400 	"/>
                    <path fill="#E8112D" d="M166.7,250l250-150l250,150l-250,150L166.7,250z M416.7,0L0,250l416.7,250l416.7-250L416.7,0z"/>
                    <rect x="218.8" y="171.9" fill="#0038A8" width="395.8" height="156.3"/>
                    <path fill="#FFFFFF" d="M536,259.7c0-10.3,3.6-20.6,15.5-20.6c12,0,15.6,10.3,15.6,20.6c0,10.2-3.6,20.5-15.6,20.5
                      C539.6,280.1,536,269.8,536,259.7 M518.3,259.7c0,20.3,13,33.7,33.1,33.7c20.2,0,33.2-13.4,33.2-33.7c0-20.5-13-33.9-33.2-33.9
                      C531.4,225.8,518.3,239.2,518.3,259.7 M474.8,291.7h17.6v-28.9c0-11.3,4.5-20.6,17.4-20.6c2.1,0,4.7,0.2,6.3,0.6v-16.4
                      c-1.1-0.4-2.6-0.6-3.8-0.6c-8.6,0-17.2,5.6-20.5,13.6l-0.3-11.9h-16.7V291.7z M450.9,208.3h-17.6v19.2h-10.7v11.8h10.7v37.8
                      c0,12.8,9.4,15.2,20.2,15.2c3.5,0,7.3-0.1,10.3-0.6V278c-1.9,0.4-3.6,0.5-5.4,0.5c-6,0-7.4-1.5-7.4-7.4v-31.7h12.9v-11.8h-12.9
                      V208.3z M371.8,252.7c0.2-5,3.5-13.6,14.6-13.6c8.6,0,12.4,4.7,14,13.6H371.8z M418.1,263.9c1.2-19.7-9.3-38.1-31.1-38.1
                      c-19.5,0-32.7,14.6-32.7,33.9c0,19.8,12.5,33.7,32.7,33.7c14.5,0,25.1-6.5,30-21.6h-15.5c-1.1,4-6.8,8.3-13.9,8.3
                      c-9.8,0-15.3-5.1-15.7-16.2H418.1z M250,291.7h18.2v-62.1l22,62.1h15l21.7-62.8l0.3,62.8h18.2v-88.5H318L298.4,264l-21-60.9H250
                      V291.7z"/>
                  </g>
                  </svg>
                  `),
                  className: "",
                  iconSize: [83.33, 62.25]
                }),
              /*icon: L.icon({
                iconUrl: 'MetroMadridLogo.svg',
            
                iconSize:     [35,21], // size of the icon
                //shadowSize:   [50, 64], // size of the shadow
                //iconAnchor:   [22, 94], // point of the icon which will correspond to marker's location
                //shadowAnchor: [4, 62],  // the same for the shadow
                //popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
              }),*/
              opacity: c['Marker'] === 'Hidden' ? 0 : 0.9,
              interactive: c['Marker'] === 'Hidden' ? false : true,
            })
          )
        }

      } else {
        markers.push(null);
      }

      // Add chapter container
      var container = $('<div></div>', {
        id: 'container' + i,
        class: 'chapter-container'
      });


      // Add media and credits: YouTube, audio, or image
      var media = null;
      var mediaContainer = null;

      // Add media source
      var source = '';
      if (c['Media Credit Link']) {
        source = $('<a>', {
          text: c['Media Credit'],
          href: c['Media Credit Link'],
          target: "_blank",
          class: 'source'
        });
      } else {
        source = $('<span>', {
          text: c['Media Credit'],
          class: 'source'
        });
      }

      // YouTube
      if (c['Media Link'] && c['Media Link'].indexOf('youtube.com/') > -1) {
        media = $('<iframe></iframe>', {
          src: c['Media Link'],
          width: '100%',
          height: '100%',
          frameborder: '0',
          allow: 'autoplay; encrypted-media; picture-in-picture',
          allowfullscreen: 'allowfullscreen',
        });

        mediaContainer = $('<div></div>', {
          class: 'img-container'
        }).append(media).after(source);
      }

      // If not YouTube: either audio or image
      var mediaTypes = {
        'jpg': 'img',
        'jpeg': 'img',
        'png': 'img',
        'tiff': 'img',
        'gif': 'img',
        'mp3': 'audio',
        'ogg': 'audio',
        'wav': 'audio',
      }

      var mediaExt = c['Media Link'] ? c['Media Link'].split('.').pop().toLowerCase() : '';
      var mediaType = mediaTypes[mediaExt];

      if (mediaType) {
        media = $('<' + mediaType + '>', {
          src: c['Media Link'],
          controls: mediaType === 'audio' ? 'controls' : '',
          alt: c['Chapter']
        });

        var enableLightbox = getSetting('_enableLightbox') === 'yes' ? true : false;
        if (enableLightbox && mediaType === 'img') {
          var lightboxWrapper = $('<a></a>', {
            'data-lightbox': c['Media Link'],
            'href': c['Media Link'],
            'data-title': c['Chapter'],
            'data-alt': c['Chapter'],
          });
          media = lightboxWrapper.append(media);
        }

        mediaContainer = $('<div></div', {
          class: mediaType + '-container'
        }).append(media).after(source);
      }

      container
        .append('<p class="chapter-header">' + c['Chapter'] + '</p>')
        .append(media ? mediaContainer : '')
        .append(media ? source : '')
        .append('<p class="description">' + c['Description'] + '</p>');

      $('#contents').append(container);

    }

    changeAttribution();

    /* Change image container heights */
    imgContainerHeight = parseInt(getSetting('_imgContainerHeight'));
    if (imgContainerHeight > 0) {
      $('.img-container').css({
        'height': imgContainerHeight + 'px',
        'max-height': imgContainerHeight + 'px',
      });
    }

    // For each block (chapter), calculate how many pixels above it
    pixelsAbove[0] = -100;
    for (i = 1; i < chapters.length; i++) {
      pixelsAbove[i] = pixelsAbove[i-1] + $('div#container' + (i-1)).height() + chapterContainerMargin;
    }
    pixelsAbove.push(Number.MAX_VALUE);

    $('div#contents').scroll(function() {
      var currentPosition = $(this).scrollTop();

      // Make title disappear on scroll
      if (currentPosition < 200) {
        $('#title').css('opacity', 1 - Math.min(1, currentPosition / 100));
      }

      for (var i = 0; i < pixelsAbove.length - 1; i++) {

        if ( currentPosition >= pixelsAbove[i]
          && currentPosition < (pixelsAbove[i+1] - 2 * chapterContainerMargin)
          && currentlyInFocus != i
        ) {

          // Update URL hash
          location.hash = i + 2;

          // Remove styling for the old in-focus chapter and
          // add it to the new active chapter
          $('.chapter-container').removeClass("in-focus").addClass("out-focus");
          $('div#container' + i).addClass("in-focus").removeClass("out-focus");

          currentlyInFocus = i;
          markActiveColor(currentlyInFocus);

          // Remove overlay tile layer if needed
          if (overlay && map.hasLayer(overlay)) {
            map.removeLayer(overlay);
          }

          var c = chapters[i];

          // Add chapter's overlay tiles if specified in options
          if (c['Overlay']) {

            var opacity = parseFloat(c['Overlay Transparency']) || 1;
            var url = c['Overlay'];

            if (url.split('.').pop() === 'geojson') {
              $.getJSON(url, function(geojson) {
                overlay = L.geoJson(geojson, {
                  style: function(feature) {
                    return {
                      fillColor: feature.properties.fillColor || '#ffffff',
                      weight: feature.properties.weight || 1,
                      opacity: feature.properties.opacity || opacity,
                      color: feature.properties.color || '#cccccc',
                      fillOpacity: feature.properties.fillOpacity || 0.5,
                    }
                  }
                }).addTo(map);
              });
            } else {
              overlay = L.tileLayer(c['Overlay'], { opacity: opacity }).addTo(map);
            }

          }

          if (c['GeoJSON Overlay']) {
            if (geoJsonOverlayName !== c['GeoJSON Overlay']){
              // Remove GeoJson Overlay only if different from new one
              if (geoJsonOverlay && map.hasLayer(geoJsonOverlay)) {
                map.removeLayer(geoJsonOverlay);
              }

              geoJsonOverlayName = c['GeoJSON Overlay'];

              $.getJSON(c['GeoJSON Overlay'], function (geojson) {

                // Parse properties string into a JS object
                var props = {};

                if (c['GeoJSON Feature Properties']) {
                  var propsArray = c['GeoJSON Feature Properties'].split(';');
                  var props = {};
                  for (var p in propsArray) {
                    if (propsArray[p].split(':').length === 2) {
                      props[propsArray[p].split(':')[0].trim()] = propsArray[p].split(':')[1].trim();
                    }
                  }
                }

                geoJsonOverlay = L.geoJson(geojson, {
                  style: function (feature) {
                    return {
                      fillColor: feature.properties.fillColor || props.fillColor || '#ffffff',
                      weight: feature.properties.weight || props.weight || 1,
                      opacity: feature.properties.opacity || props.opacity || 0.5,
                      color: feature.properties.color || props.color || '#cccccc',
                      fillOpacity: feature.properties.fillOpacity || props.fillOpacity || 0.5,
                    }
                  }
                }).addTo(map);
              });
            }
          } else {
            // Remove GeoJson Overlay tile layer if needed
            if (geoJsonOverlay && map.hasLayer(geoJsonOverlay)) {
              map.removeLayer(geoJsonOverlay);
            }

            geoJsonOverlayName = null;
          }

          // Fly to the new marker destination if latitude and longitude exist
          if (c['Latitude'] && c['Longitude']) {
            var zoom = c['Zoom'] ? c['Zoom'] : CHAPTER_ZOOM;
            map.flyTo([c['Latitude'], c['Longitude']], zoom, {
              animate: true,
              duration: 2, // default is 2 seconds
            });
          }

          // Fix for first chapter
          if (currentlyInFocus == 0) {
            map.fitBounds(bounds, { animate: true, duration: 2 });
          }
          
          // Fix for close by markers
          markerOnTop(currentlyInFocus);

          // No need to iterate through the following chapters
          break;
        }
      }
    });


    $('#contents').append(" \
      <div id='space-at-the-bottom'> \
        <a href='#top'>  \
          <i class='fa fa-chevron-up'></i></br> \
          <small>Volver arriba</small>  \
        </a> \
      </div> \
    ");

    /* Generate a CSS sheet with cosmetic changes */
    $("<style>")
      .prop("type", "text/css")
      .html("\
      #narration, #title {\
        background-color: " + trySetting('_narrativeBackground', 'white') + "; \
        color: " + trySetting('_narrativeText', 'black') + "; \
      }\
      a, a:visited, a:hover {\
        color: " + trySetting('_narrativeLink', 'blue') + " \
      }\
      .in-focus {\
        background-color: " + trySetting('_narrativeActive', '#f0f0f0') + " \
      }")
      .appendTo("head");


    endPixels = parseInt(getSetting('_pixelsAfterFinalChapter'));
    if (endPixels > 100) {
      $('#space-at-the-bottom').css({
        'height': (endPixels / 2) + 'px',
        'padding-top': (endPixels / 2) + 'px',
      });
    }

    // Add markers to map
    var bounds = [];
    if (!trySetting('_cluster', false)) {
      var markersClusterLayer = L.markerClusterGroup({
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: true,
        zoomToBoundsOnClick: false,
        maxClusterRadius: 25,
        removeOutsideVisibleBounds: false
      });
    }
    for (i in markers) {
      if (markers[i]) {
        if (trySetting('_cluster', false)) {
          markers[i].addTo(map);
        } else {
          markersClusterLayer.addLayer(markers[i]);
        }
        markers[i]['_pixelsAbove'] = pixelsAbove[i];
        markers[i].on('click', function() {
          var pixels = parseInt($(this)[0]['_pixelsAbove']) + 5;
          $('div#contents').animate({
            scrollTop: pixels + 'px'});
        });
        bounds.push(markers[i].getLatLng());
      }
    }
    if (!trySetting('_cluster', false)) {
      map.addLayer(markersClusterLayer);
    }
    map.fitBounds(bounds);

    $('#map, #narration, #title').css('visibility', 'visible');
    $('div.loader').css('visibility', 'hidden');

    $('div#container0').addClass("in-focus");
    $('div#contents').animate({scrollTop: '1px'});

    // On first load, check hash and if it contains a number, scroll down
    if (parseInt(location.hash.substr(1))) {
      var containerId = parseInt( location.hash.substr(1) ) - 2;
      $('#contents').animate({
        scrollTop: $('#container' + containerId).offset().top
      }, 2000);
    }

    // Add Google Analytics if the ID exists
    var ga = getSetting('_googleAnalytics');
    if ( ga && ga.length >= 10 ) {
      var gaScript = document.createElement('script');
      gaScript.setAttribute('src','https://www.googletagmanager.com/gtag/js?id=' + ga);
      document.head.appendChild(gaScript);

      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', ga);
    }


  }


  /**
   * Changes map attribution (author, GitHub repo, email etc.) in bottom-right
   */
  function changeAttribution() {
    var attributionHTML = $('.leaflet-control-attribution')[0].innerHTML;
    var credit = 'View <a href="'
      // Show Google Sheet URL if the variable exists and is not empty, otherwise link to Chapters.csv
      + (typeof googleDocURL !== 'undefined' && googleDocURL ? googleDocURL : './csv/Chapters.csv')
      + '" target="_blank">data</a>';

    var name = getSetting('_authorName');
    var url = getSetting('_authorURL');

    if (name && url) {
      if (url.indexOf('@') > 0) { url = 'mailto:' + url; }
      credit += ' by <a href="' + url + '">' + name + '</a> | ';
    } else if (name) {
      credit += ' by ' + name + ' | ';
    } else {
      credit += ' | ';
    }

    credit += 'View <a href="' + getSetting('_githubRepo') + '">code</a>';
    if (getSetting('_codeCredit')) credit += ' by ' + getSetting('_codeCredit');
    credit += ' with ';
    $('.leaflet-control-attribution')[0].innerHTML = credit + attributionHTML;
  }

});
