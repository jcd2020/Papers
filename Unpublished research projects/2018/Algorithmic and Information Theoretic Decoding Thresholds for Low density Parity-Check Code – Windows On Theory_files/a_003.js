/* Detect-zoom
 * -----------
 * Cross Browser Zoom and Pixel Ratio Detector
 * Version 1.0.4 | Apr 1 2013
 * dual-licensed under the WTFPL and MIT license
 * Maintained by https://github/tombigel
 * Original developer https://github.com/yonran
 */

//AMD and CommonJS initialization copied from https://github.com/zohararad/audio5js
(function (root, ns, factory) {
    "use strict";

    if (typeof (module) !== 'undefined' && module.exports) { // CommonJS
        module.exports = factory(ns, root);
    } else if (typeof (define) === 'function' && define.amd) { // AMD
        define("factory", function () {
            return factory(ns, root);
        });
    } else {
        root[ns] = factory(ns, root);
    }

}(window, 'detectZoom', function () {

    /**
     * Use devicePixelRatio if supported by the browser
     * @return {Number}
     * @private
     */
    var devicePixelRatio = function () {
        return window.devicePixelRatio || 1;
    };

    /**
     * Fallback function to set default values
     * @return {Object}
     * @private
     */
    var fallback = function () {
        return {
            zoom: 1,
            devicePxPerCssPx: 1
        };
    };
    /**
     * IE 8 and 9: no trick needed!
     * TODO: Test on IE10 and Windows 8 RT
     * @return {Object}
     * @private
     **/
    var ie8 = function () {
        var zoom = Math.round((screen.deviceXDPI / screen.logicalXDPI) * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * For IE10 we need to change our technique again...
     * thanks https://github.com/stefanvanburen
     * @return {Object}
     * @private
     */
    var ie10 = function () {
        var zoom = Math.round((document.documentElement.offsetHeight / window.innerHeight) * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * Mobile WebKit
     * the trick: window.innerWIdth is in CSS pixels, while
     * screen.width and screen.height are in system pixels.
     * And there are no scrollbars to mess up the measurement.
     * @return {Object}
     * @private
     */
    var webkitMobile = function () {
        var deviceWidth = (Math.abs(window.orientation) == 90) ? screen.height : screen.width;
        var zoom = deviceWidth / window.innerWidth;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * Desktop Webkit
     * the trick: an element's clientHeight is in CSS pixels, while you can
     * set its line-height in system pixels using font-size and
     * -webkit-text-size-adjust:none.
     * device-pixel-ratio: http://www.webkit.org/blog/55/high-dpi-web-sites/
     *
     * Previous trick (used before http://trac.webkit.org/changeset/100847):
     * documentElement.scrollWidth is in CSS pixels, while
     * document.width was in system pixels. Note that this is the
     * layout width of the document, which is slightly different from viewport
     * because document width does not include scrollbars and might be wider
     * due to big elements.
     * @return {Object}
     * @private
     */
    var webkit = function () {
        var important = function (str) {
            return str.replace(/;/g, " !important;");
        };

        var div = document.createElement('div');
        div.innerHTML = "1<br>2<br>3<br>4<br>5<br>6<br>7<br>8<br>9<br>0";
        div.setAttribute('style', important('font: 100px/1em sans-serif; -webkit-text-size-adjust: none; text-size-adjust: none; height: auto; width: 1em; padding: 0; overflow: visible;'));

        // The container exists so that the div will be laid out in its own flow
        // while not impacting the layout, viewport size, or display of the
        // webpage as a whole.
        // Add !important and relevant CSS rule resets
        // so that other rules cannot affect the results.
        var container = document.createElement('div');
        container.setAttribute('style', important('width:0; height:0; overflow:hidden; visibility:hidden; position: absolute;'));
        container.appendChild(div);

        document.body.appendChild(container);
        var zoom = 1000 / div.clientHeight;
        zoom = Math.round(zoom * 100) / 100;
        document.body.removeChild(container);

        return{
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * no real trick; device-pixel-ratio is the ratio of device dpi / css dpi.
     * (Note that this is a different interpretation than Webkit's device
     * pixel ratio, which is the ratio device dpi / system dpi).
     *
     * Also, for Mozilla, there is no difference between the zoom factor and the device ratio.
     *
     * @return {Object}
     * @private
     */
    var firefox4 = function () {
        var zoom = mediaQueryBinarySearch('min--moz-device-pixel-ratio', '', 0, 10, 20, 0.0001);
        zoom = Math.round(zoom * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom
        };
    };

    /**
     * Firefox 18.x
     * Mozilla added support for devicePixelRatio to Firefox 18,
     * but it is affected by the zoom level, so, like in older
     * Firefox we can't tell if we are in zoom mode or in a device
     * with a different pixel ratio
     * @return {Object}
     * @private
     */
    var firefox18 = function () {
        return {
            zoom: firefox4().zoom,
            devicePxPerCssPx: devicePixelRatio()
        };
    };

    /**
     * works starting Opera 11.11
     * the trick: outerWidth is the viewport width including scrollbars in
     * system px, while innerWidth is the viewport width including scrollbars
     * in CSS px
     * @return {Object}
     * @private
     */
    var opera11 = function () {
        var zoom = window.top.outerWidth / window.top.innerWidth;
        zoom = Math.round(zoom * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * Use a binary search through media queries to find zoom level in Firefox
     * @param property
     * @param unit
     * @param a
     * @param b
     * @param maxIter
     * @param epsilon
     * @return {Number}
     */
    var mediaQueryBinarySearch = function (property, unit, a, b, maxIter, epsilon) {
        var matchMedia;
        var head, style, div;
        if (window.matchMedia) {
            matchMedia = window.matchMedia;
        } else {
            head = document.getElementsByTagName('head')[0];
            style = document.createElement('style');
            head.appendChild(style);

            div = document.createElement('div');
            div.className = 'mediaQueryBinarySearch';
            div.style.display = 'none';
            document.body.appendChild(div);

            matchMedia = function (query) {
                style.sheet.insertRule('@media ' + query + '{.mediaQueryBinarySearch ' + '{text-decoration: underline} }', 0);
                var matched = getComputedStyle(div, null).textDecoration == 'underline';
                style.sheet.deleteRule(0);
                return {matches: matched};
            };
        }
        var ratio = binarySearch(a, b, maxIter);
        if (div) {
            head.removeChild(style);
            document.body.removeChild(div);
        }
        return ratio;

        function binarySearch(a, b, maxIter) {
            var mid = (a + b) / 2;
            if (maxIter <= 0 || b - a < epsilon) {
                return mid;
            }
            var query = "(" + property + ":" + mid + unit + ")";
            if (matchMedia(query).matches) {
                return binarySearch(mid, b, maxIter - 1);
            } else {
                return binarySearch(a, mid, maxIter - 1);
            }
        }
    };

    /**
     * Generate detection function
     * @private
     */
    var detectFunction = (function () {
        var func = fallback;
        //IE8+
        if (!isNaN(screen.logicalXDPI) && !isNaN(screen.systemXDPI)) {
            func = ie8;
        }
        // IE10+ / Touch
        else if (window.navigator.msMaxTouchPoints) {
            func = ie10;
        }
        //Mobile Webkit
        else if ('orientation' in window && typeof document.body.style.webkitMarquee === 'string') {
            func = webkitMobile;
        }
        //WebKit
        else if (typeof document.body.style.webkitMarquee === 'string') {
            func = webkit;
        }
        //Opera
        else if (navigator.userAgent.indexOf('Opera') >= 0) {
            func = opera11;
        }
        //Last one is Firefox
        //FF 18.x
        else if (window.devicePixelRatio) {
            func = firefox18;
        }
        //FF 4.0 - 17.x
        else if (firefox4().zoom > 0.001) {
            func = firefox4;
        }

        return func;
    }());


    return ({

        /**
         * Ratios.zoom shorthand
         * @return {Number} Zoom level
         */
        zoom: function () {
            return detectFunction().zoom;
        },

        /**
         * Ratios.devicePxPerCssPx shorthand
         * @return {Number} devicePxPerCssPx level
         */
        device: function () {
            return detectFunction().devicePxPerCssPx;
        }
    });
}));

var wpcom_img_zoomer = {
        clientHintSupport: {
                gravatar: false,
                files: false,
                photon: false,
                mshots: false,
                staticAssets: false,
                latex: false,
                imgpress: false,
        },
	useHints: false,
	zoomed: false,
	timer: null,
	interval: 1000, // zoom polling interval in millisecond

	// Should we apply width/height attributes to control the image size?
	imgNeedsSizeAtts: function( img ) {
		// Do not overwrite existing width/height attributes.
		if ( img.getAttribute('width') !== null || img.getAttribute('height') !== null )
			return false;
		// Do not apply the attributes if the image is already constrained by a parent element.
		if ( img.width < img.naturalWidth || img.height < img.naturalHeight )
			return false;
		return true;
	},

        hintsFor: function( service ) {
                if ( this.useHints === false ) {
                        return false;
                }
                if ( this.hints() === false ) {
                        return false;
                }
                if ( typeof this.clientHintSupport[service] === "undefined" ) {
                        return false;
                }
                if ( this.clientHintSupport[service] === true ) {
                        return true;
                }
                return false;
        },

	hints: function() {
		try {
			var chrome = window.navigator.userAgent.match(/\sChrome\/([0-9]+)\.[.0-9]+\s/)
			if (chrome !== null) {
				var version = parseInt(chrome[1], 10)
				if (isNaN(version) === false && version >= 46) {
					return true
				}
			}
		} catch (e) {
			return false
		}
		return false
	},

	init: function() {
		var t = this;
		try{
			t.zoomImages();
			t.timer = setInterval( function() { t.zoomImages(); }, t.interval );
		}
		catch(e){
		}
	},

	stop: function() {
		if ( this.timer )
			clearInterval( this.timer );
	},

	getScale: function() {
		var scale = detectZoom.device();
		// Round up to 1.5 or the next integer below the cap.
		if      ( scale <= 1.0 ) scale = 1.0;
		else if ( scale <= 1.5 ) scale = 1.5;
		else if ( scale <= 2.0 ) scale = 2.0;
		else if ( scale <= 3.0 ) scale = 3.0;
		else if ( scale <= 4.0 ) scale = 4.0;
		else                     scale = 5.0;
		return scale;
	},

	shouldZoom: function( scale ) {
		var t = this;
		// Do not operate on hidden frames.
		if ( "innerWidth" in window && !window.innerWidth )
			return false;
		// Don't do anything until scale > 1
		if ( scale == 1.0 && t.zoomed == false )
			return false;
		return true;
	},

	zoomImages: function() {
		var t = this;
		var scale = t.getScale();
		if ( ! t.shouldZoom( scale ) ){
			return;
		}
		t.zoomed = true;
		// Loop through all the <img> elements on the page.
		var imgs = document.getElementsByTagName("img");

		for ( var i = 0; i < imgs.length; i++ ) {
			// Wait for original images to load
			if ( "complete" in imgs[i] && ! imgs[i].complete )
				continue;

			// Skip images that have srcset attributes.
			if ( imgs[i].hasAttribute('srcset') ) {
				continue;
			}

			// Skip images that don't need processing.
			var imgScale = imgs[i].getAttribute("scale");
			if ( imgScale == scale || imgScale == "0" )
				continue;

			// Skip images that have already failed at this scale
			var scaleFail = imgs[i].getAttribute("scale-fail");
			if ( scaleFail && scaleFail <= scale )
				continue;

			// Skip images that have no dimensions yet.
			if ( ! ( imgs[i].width && imgs[i].height ) )
				continue;

			// Skip images from Lazy Load plugins
			if ( ! imgScale && imgs[i].getAttribute("data-lazy-src") && (imgs[i].getAttribute("data-lazy-src") !== imgs[i].getAttribute("src")))
				continue;

			if ( t.scaleImage( imgs[i], scale ) ) {
				// Mark the img as having been processed at this scale.
				imgs[i].setAttribute("scale", scale);
			}
			else {
				// Set the flag to skip this image.
				imgs[i].setAttribute("scale", "0");
			}
		}
	},

	scaleImage: function( img, scale ) {
		var t = this;
		var newSrc = img.src;

                var isFiles = false;
                var isLatex = false;
                var isPhoton = false;

		// Skip slideshow images
		if ( img.parentNode.className.match(/slideshow-slide/) )
			return false;

		// Skip CoBlocks Lightbox images
		if ( img.parentNode.className.match(/coblocks-lightbox__image/) )
			return false;

		// Scale gravatars that have ?s= or ?size=
		if ( img.src.match( /^https?:\/\/([^\/]*\.)?gravatar\.com\/.+[?&](s|size)=/ ) ) {
                        if ( this.hintsFor( "gravatar" ) === true ) {
                                return false;
                        }
			newSrc = img.src.replace( /([?&](s|size)=)(\d+)/, function( $0, $1, $2, $3 ) {
				// Stash the original size
				var originalAtt = "originals",
				originalSize = img.getAttribute(originalAtt);
				if ( originalSize === null ) {
					originalSize = $3;
					img.setAttribute(originalAtt, originalSize);
					if ( t.imgNeedsSizeAtts( img ) ) {
						// Fix width and height attributes to rendered dimensions.
						img.width = img.width;
						img.height = img.height;
					}
				}
				// Get the width/height of the image in CSS pixels
				var size = img.clientWidth;
				// Convert CSS pixels to device pixels
				var targetSize = Math.ceil(img.clientWidth * scale);
				// Don't go smaller than the original size
				targetSize = Math.max( targetSize, originalSize );
				// Don't go larger than the service supports
				targetSize = Math.min( targetSize, 512 );
				return $1 + targetSize;
			});
		}

		// Scale mshots that have width
		else if ( img.src.match(/^https?:\/\/([^\/]+\.)*(wordpress|wp)\.com\/mshots\/.+[?&]w=\d+/) ) {
                        if ( this.hintsFor( "mshots" ) === true ) {
                                return false;
                        }
			newSrc = img.src.replace( /([?&]w=)(\d+)/, function($0, $1, $2) {
				// Stash the original size
				var originalAtt = 'originalw', originalSize = img.getAttribute(originalAtt);
				if ( originalSize === null ) {
					originalSize = $2;
					img.setAttribute(originalAtt, originalSize);
					if ( t.imgNeedsSizeAtts( img ) ) {
						// Fix width and height attributes to rendered dimensions.
						img.width = img.width;
						img.height = img.height;
					}
				}
				// Get the width of the image in CSS pixels
				var size = img.clientWidth;
				// Convert CSS pixels to device pixels
				var targetSize = Math.ceil(size * scale);
				// Don't go smaller than the original size
				targetSize = Math.max( targetSize, originalSize );
				// Don't go bigger unless the current one is actually lacking
				if ( scale > img.getAttribute("scale") && targetSize <= img.naturalWidth )
					targetSize = $2;
				if ( $2 != targetSize )
					return $1 + targetSize;
				return $0;
			});

			// Update height attribute to match width
			newSrc = newSrc.replace( /([?&]h=)(\d+)/, function($0, $1, $2) {
				if ( newSrc == img.src ) {
					return $0;
				}
				// Stash the original size
				var originalAtt = 'originalh', originalSize = img.getAttribute(originalAtt);
				if ( originalSize === null ) {
					originalSize = $2;
					img.setAttribute(originalAtt, originalSize);
				}
				// Get the height of the image in CSS pixels
				var size = img.clientHeight;
				// Convert CSS pixels to device pixels
				var targetSize = Math.ceil(size * scale);
				// Don't go smaller than the original size
				targetSize = Math.max( targetSize, originalSize );
				// Don't go bigger unless the current one is actually lacking
				if ( scale > img.getAttribute("scale") && targetSize <= img.naturalHeight )
					targetSize = $2;
				if ( $2 != targetSize )
					return $1 + targetSize;
				return $0;
			});
		}

		// Scale simple imgpress queries (s0.wp.com) that only specify w/h/fit
		else if ( img.src.match(/^https?:\/\/([^\/.]+\.)*(wp|wordpress)\.com\/imgpress\?(.+)/) ) {
                        if ( this.hintsFor( "imgpress" ) === true ) {
                                return false; 
                        }
			var imgpressSafeFunctions = ["zoom", "url", "h", "w", "fit", "filter", "brightness", "contrast", "colorize", "smooth", "unsharpmask"];
			// Search the query string for unsupported functions.
			var qs = RegExp.$3.split('&');
			for ( var q in qs ) {
				q = qs[q].split('=')[0];
				if ( imgpressSafeFunctions.indexOf(q) == -1 ) {
					return false;
				}
			}
			// Fix width and height attributes to rendered dimensions.
			img.width = img.width;
			img.height = img.height;
			// Compute new src
			if ( scale == 1 )
				newSrc = img.src.replace(/\?(zoom=[^&]+&)?/, '?');
			else
				newSrc = img.src.replace(/\?(zoom=[^&]+&)?/, '?zoom=' + scale + '&');
		}

		// Scale files.wordpress.com, LaTeX, or Photon images (i#.wp.com)
		else if (
			( isFiles = img.src.match(/^https?:\/\/([^\/]+)\.files\.wordpress\.com\/.+[?&][wh]=/) ) ||
			( isLatex = img.src.match(/^https?:\/\/([^\/.]+\.)*(wp|wordpress)\.com\/latex\.php\?(latex|zoom)=(.+)/) ) ||
			( isPhoton = img.src.match(/^https?:\/\/i[\d]{1}\.wp\.com\/(.+)/) )
		) {
                        if ( false !== isFiles && this.hintsFor( "files" ) === true ) {
                                return false
                        }
                        if ( false !== isLatex && this.hintsFor( "latex" ) === true ) {
                                return false
                        }
                        if ( false !== isPhoton && this.hintsFor( "photon" ) === true ) {
                                return false
                        }
			// Fix width and height attributes to rendered dimensions.
			img.width = img.width;
			img.height = img.height;
			// Compute new src
			if ( scale == 1 ) {
				newSrc = img.src.replace(/\?(zoom=[^&]+&)?/, '?');
			} else {
				newSrc = img.src;

				var url_var = newSrc.match( /([?&]w=)(\d+)/ );
				if ( url_var !== null && url_var[2] ) {
					newSrc = newSrc.replace( url_var[0], url_var[1] + img.width );
				}

				url_var = newSrc.match( /([?&]h=)(\d+)/ );
				if ( url_var !== null && url_var[2] ) {
					newSrc = newSrc.replace( url_var[0], url_var[1] + img.height );
				}

				var zoom_arg = '&zoom=2';
				if ( !newSrc.match( /\?/ ) ) {
					zoom_arg = '?zoom=2';
				}
				img.setAttribute( 'srcset', newSrc + zoom_arg + ' ' + scale + 'x' );
			}
		}

		// Scale static assets that have a name matching *-1x.png or *@1x.png
		else if ( img.src.match(/^https?:\/\/[^\/]+\/.*[-@]([12])x\.(gif|jpeg|jpg|png)(\?|$)/) ) {
                        if ( this.hintsFor( "staticAssets" ) === true ) {
                                return false; 
                        }
			// Fix width and height attributes to rendered dimensions.
			img.width = img.width;
			img.height = img.height;
			var currentSize = RegExp.$1, newSize = currentSize;
			if ( scale <= 1 )
				newSize = 1;
			else
				newSize = 2;
			if ( currentSize != newSize )
				newSrc = img.src.replace(/([-@])[12]x\.(gif|jpeg|jpg|png)(\?|$)/, '$1'+newSize+'x.$2$3');
		}

		else {
			return false;
		}

		// Don't set img.src unless it has changed. This avoids unnecessary reloads.
		if ( newSrc != img.src ) {
			// Store the original img.src
			var prevSrc, origSrc = img.getAttribute("src-orig");
			if ( !origSrc ) {
				origSrc = img.src;
				img.setAttribute("src-orig", origSrc);
			}
			// In case of error, revert img.src
			prevSrc = img.src;
			img.onerror = function(){
				img.src = prevSrc;
				if ( img.getAttribute("scale-fail") < scale )
					img.setAttribute("scale-fail", scale);
				img.onerror = null;
			};
			// Finally load the new image
			img.src = newSrc;
		}

		return true;
	}
};

wpcom_img_zoomer.init();
;
var wpFollowButton;

(function($) {
	var cookies = document.cookie.split( /;\s*/ ), cookie = false;
	for ( i = 0; i < cookies.length; i++ ) {
		if ( cookies[i].match( /^wp_api=/ ) ) {
			cookies = cookies[i].split( '=' );
			cookie = cookies[1];
			break;
		}
	}

wpFollowButton = {

	enable: function() {
		$( 'a.wpcom-follow, a.wpcom-following' ).click( function( e ) {
			e.preventDefault();
		
 	 		var link = $( this );
		
			var blog_id = link.data('id');
			var blog_url = link.data('url');
			var is_following = link.hasClass( 'wpcom-following' );

			if ( blog_id ) {
				var f_id = blog_id;
			} else {
				var ln_classes = link.attr( 'class' ).split( ' ' );
				for ( i=0; i < ln_classes.length; i++ ) {
					if ( 0 == ln_classes[i].indexOf('f-') ) {
						var f_id = ln_classes[i].slice( 2, ln_classes[i].length );
					}
				}
			}

 	 		if ( is_following ) {
				var action = 'ab_unsubscribe_from_blog';
 	 		} else {
				var action = 'ab_subscribe_to_blog';
			}

			f_id = parseInt( f_id, 10 ) || 0;
		
			var elem = $( 'a.f-' + f_id );
			if ( is_following ) {
				elem.fadeOut( 'fast', function() {
					elem.removeClass( 'wpcom-following' ).addClass( 'wpcom-follow' ).text( 'Follow' );
					elem.fadeIn( 'fast' );
 	 			})
			} else {
 	 			elem.fadeOut( 'fast', function() {
 	 				elem.addClass( 'wpcom-following' ).removeClass( 'wpcom-follow' ).text( 'Following' );
 	 				elem.fadeIn( 'fast' );
				})
 	 		}
		
			var href = link.attr( 'href' );
			if ( typeof href == 'undefined' )
				return;
			var params = href.split( '\?' );
			var domain = params[0];
			var flds = 'undefined' != typeof params[1] ? params[1].split( '&' ) : [];
			for ( var i = 0; i < flds.length; i++ ) {
 	 			var pos = flds[i].indexOf( '=' );
 	 			if ( -1 == pos ) continue;
 	 			var argname = flds[i].substring( 0, pos );
 	 			var value = flds[i].substring( pos+1 );
		
				if ( argname == '_wpnonce') {
 	 				var nonce = value; 
				} else if ( argname == 'src' ) {
					var source = value;
 	 			}
			}

			$.post( domain + 'wp-admin/admin-ajax.php', {
 	 			'action': action,
 	 			'_wpnonce': nonce,
 	 			'blog_id': blog_id,
 	 			'blog_url': blog_url,
 	 			'source': source
			}, function( response ) {
 	 			if ( 'object' == typeof response.errors ) {
 	 				if ( is_following )
 	 					elem.removeClass( 'wpcom-follow' ).addClass( 'wpcom-following' ).text( 'Following' );
 	 				else
 	 					elem.removeClass( 'wpcom-following' ).addClass( 'wpcom-follow' ).text( 'Follow' );
 	 			}
 	 		},
			'json' );
		});
	},

	enable_rest: function( el, source ) {
		var t = this;

		el.unbind( 'click' ).bind( 'click', function( e ) {
			e.preventDefault();
 	 		var link = $( this );
			var blog_id = link.attr( 'data-blog-id' );
 	 		var is_following = link.hasClass( 'wpcom-following-rest' );
			var rest_path = '/sites/' + blog_id + '/follows/new';
		
 	 		if ( is_following ) {
				rest_path = '/sites/' + blog_id + '/follows/mine/delete';
 	 		}
			blog_id = parseInt( blog_id, 10 ) || 0;
			//select and update ALL follow buttons on the page (could be more than one)
			var attr_selector = 'data-blog-id="' + blog_id + '"';
			var elem = $( 'a.wpcom-follow-rest[' + attr_selector + '], a.wpcom-following-rest[' + attr_selector + ']' );
			if ( is_following ) {
				elem.fadeOut( 'fast', function() {
					elem.removeClass( 'wpcom-following-rest' ).addClass( 'wpcom-follow-rest' ).text( link.attr( 'data-follow-text' ) );
					elem.fadeIn( 'fast' );
 	 			})
			} else {
 	 			elem.fadeOut( 'fast', function() {
 	 				elem.addClass( 'wpcom-following-rest' ).removeClass( 'wpcom-follow-rest' ).text( link.attr( 'data-following-text' ) );
 	 				elem.fadeIn( 'fast' );
				})
 	 		}
		
			t.ajax( {
				type: 'POST',
				path : rest_path,
				success : function( res ) {
					if ( ! res.success ){
						if ( is_following )
							elem.removeClass( 'wpcom-follow-rest' ).addClass( 'wpcom-following-rest' ).text( link.attr( 'data-following-text' ) );
						else
							elem.removeClass( 'wpcom-following-rest' ).addClass( 'wpcom-follow-rest' ).text( link.attr( 'data-follow-text' ) );
					}
				},
				error : function( res ) {
					if ( is_following )
						elem.removeClass( 'wpcom-follow-rest' ).addClass( 'wpcom-following-rest' ).text( link.attr( 'data-following-text' ) );
					else
						elem.removeClass( 'wpcom-following-rest' ).addClass( 'wpcom-follow-rest' ).text( link.attr( 'data-follow-text' ) );
				}
			});

			//show post-Follow bubble
			if ( ! is_following ) {
				t.showBubble( link );
				t.bumpStat( link.attr( 'data-stat-src' ) );
			}
		});

		//show unfollow text on hover
		el.hover( function() {
	 	 		var link = $( this );
 		 		var is_following = link.hasClass( 'wpcom-following-rest' );
				if ( is_following )
					link.text( link.attr( 'data-following-hover-text' ) );
			}, function() {
	 	 		var link = $( this );
 		 		var is_following = link.hasClass( 'wpcom-following-rest' );
				if ( is_following )
					link.text( link.attr( 'data-following-text' ) );
			});

	},

	showBubble: function( link ) {
		var pos = link.position();
		var hideBubble = this.hideBubble;
		$( 'div.bubble-txt', 'div.action-bubble' ).html( "New posts from this blog will now appear in <a href='http://wordpress.com/read/following/' onclick='hideBubble()'>your reader</a>." );
		var bubble = $( 'div.action-bubble' );
		link.parent().append( bubble );
		var left = pos.left + ( link.width() / 2 ) - ( $( 'div.wpcom-bubble' ).width() / 2 );
		var top = pos.top + bubble.height();
		bubble.css( { left: left + 'px', top: top + 'px' } );
		bubble.addClass( 'fadein' );
		setTimeout( function() {
			$('body').on( 'click.bubble touchstart.bubble', function(e) {
				if ( !$(e.target).hasClass('action-bubble') && !$(e.target).parents( 'div.action-bubble' ).length )
					hideBubble();
			});
			$(document).on( 'scroll.bubble', hideBubble );
			setTimeout( hideBubble, 10000 );
		}, 500 );
	},

	hideBubble: function() {
		$( 'div.wpcom-bubble.action-bubble' ).remove();
  	},

	//common method for rendering a follow button from the object data
	create : function ( data, source ) {
		var is_following = data['params']['is_following'];
		var follow_link = $('<a></a>', {
			'class' : ( is_following ? 'wpcom-following-rest' : 'wpcom-follow-rest' ),
			href : 'http://public-api.wordpress.com/sites/' + data['params']['site_id'] + '/follows',
			title : data['params']['blog_title'] + 
				' (' + data['params']['blog_domain'] + ')',
			text : is_following ? data['params']['following-text'] : data['params']['follow-text']
		} ).attr( { 
			'data-blog-id' : data['params']['site_id'],
			'data-stat-src' : data['params']['stat-source'],
			'data-follow-text' : data['params']['follow-text'],
			'data-following-text' : data['params']['following-text'],
			'data-following-hover-text' : data['params']['following-hover-text']
		} );
		var follow_button = $( '<div></div>', { 
			'class': 'wpcom-follow-container wpcom-follow-attached',
			style: 'display: inline-block;'
		 } ).append( follow_link );

		this.enable_rest( follow_link, source );
		return follow_button;
	},

	createAll: function() {
		$( '.wpcom-follow-container' ).not( '.wpcom-follow-attached' ).each( function( index ) {
			var el = $( this );
			el.replaceWith( wpFollowButton.create( el.data( 'json' ), el.data( 'follow-source' ) ) );
		});
	},

	ajax: function( options ) {
		if ( document.location.host == 'public-api.wordpress.com' ) {
			//console.log( 'regular ajax call ' + options.type + ' ' + options.path);
			$.ajaxSetup({ beforeSend : function(xhr){
				if ( cookie ) {
					xhr.setRequestHeader( 'Authorization', 'X-WPCOOKIE ' + cookie + ':1:' + document.location.host );
				}
			}});
			var request = {
				type : options.type,
				url : 'https://public-api.wordpress.com/rest/v1' + options.path,
				success : options.success,
				error : options.error,
				data : options.data,
				dataType : 'json'
			};
			$.ajax(request);
			$.ajaxSetup({ beforeSend : null });
		} else {
			//console.log( 'proxied ajax call ' + options.type + ' ' + options.path );
			var request = {
				path: options.path,
				method: options.type
			};
			if ( request.method === "POST" )
				request.body = options.data;
			else
				request.query = options.data;

			$.wpcom_proxy_request(request).done( function ( response, statusCode ) { 
				if ( 200 == statusCode ) 
					options.success( response );
				else
					options.error( statusCode );
			} );
		}
	},

	bumpStat: function( source ) {
		new Image().src = document.location.protocol + 
			'//pixel.wp.com/g.gif?v=wpcom-no-pv&x_follow_source=' + encodeURIComponent( source ) + '&baba=' + Math.random();
	}

};

$(function(){
	wpFollowButton.enable()
	wpFollowButton.createAll()
});

})(jQuery);
;
/**
 The MIT License

 Copyright (c) 2010 Daniel Park (http://metaweb.com, http://postmessage.freebaseapps.com)

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 **/
var NO_JQUERY = {};
(function(window, $, undefined) {

     if (!("console" in window)) {
         var c = window.console = {};
         c.log = c.warn = c.error = c.debug = function(){};
     }

     if ($ === NO_JQUERY) {
         // jQuery is optional
         $ = {
             fn: {},
             extend: function() {
                 var a = arguments[0];
                 for (var i=1,len=arguments.length; i<len; i++) {
                     var b = arguments[i];
                     for (var prop in b) {
                         a[prop] = b[prop];
                     }
                 }
                 return a;
             }
         };
     }

     $.fn.pm = function() {
         console.log("usage: \nto send:    $.pm(options)\nto receive: $.pm.bind(type, fn, [origin])");
         return this;
     };

     // send postmessage
     $.pm = window.pm = function(options) {
         pm.send(options);
     };

     // bind postmessage handler
     $.pm.bind = window.pm.bind = function(type, fn, origin, hash, async_reply) {
         pm.bind(type, fn, origin, hash, async_reply === true);
     };

     // unbind postmessage handler
     $.pm.unbind = window.pm.unbind = function(type, fn) {
         pm.unbind(type, fn);
     };

     // default postmessage origin on bind
     $.pm.origin = window.pm.origin = null;

     // default postmessage polling if using location hash to pass postmessages
     $.pm.poll = window.pm.poll = 200;

     var pm = {

         send: function(options) {
             var o = $.extend({}, pm.defaults, options),
             target = o.target;
             if (!o.target) {
                 console.warn("postmessage target window required");
                 return;
             }
             if (!o.type) {
                 console.warn("postmessage type required");
                 return;
             }
             var msg = {data:o.data, type:o.type};
             if (o.success) {
                 msg.callback = pm._callback(o.success);
             }
             if (o.error) {
                 msg.errback = pm._callback(o.error);
             }
             if (("postMessage" in target) && !o.hash) {
                 pm._bind();
                 target.postMessage(JSON.stringify(msg), o.origin || '*');
             }
             else {
                 pm.hash._bind();
                 pm.hash.send(o, msg);
             }
         },

         bind: function(type, fn, origin, hash, async_reply) {
           pm._replyBind ( type, fn, origin, hash, async_reply );
         },

         _replyBind: function(type, fn, origin, hash, isCallback) {
           if (("postMessage" in window) && !hash) {
               pm._bind();
           }
           else {
               pm.hash._bind();
           }
           var l = pm.data("listeners.postmessage");
           if (!l) {
               l = {};
               pm.data("listeners.postmessage", l);
           }
           var fns = l[type];
           if (!fns) {
               fns = [];
               l[type] = fns;
           }
           fns.push({fn:fn, callback: isCallback, origin:origin || $.pm.origin});
         },

         unbind: function(type, fn) {
             var l = pm.data("listeners.postmessage");
             if (l) {
                 if (type) {
                     if (fn) {
                         // remove specific listener
                         var fns = l[type];
                         if (fns) {
                             var m = [];
                             for (var i=0,len=fns.length; i<len; i++) {
                                 var o = fns[i];
                                 if (o.fn !== fn) {
                                     m.push(o);
                                 }
                             }
                             l[type] = m;
                         }
                     }
                     else {
                         // remove all listeners by type
                         delete l[type];
                     }
                 }
                 else {
                     // unbind all listeners of all type
                     for (var i in l) {
                       delete l[i];
                     }
                 }
             }
         },

         data: function(k, v) {
             if (v === undefined) {
                 return pm._data[k];
             }
             pm._data[k] = v;
             return v;
         },

         _data: {},

         _CHARS: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split(''),

         _random: function() {
             var r = [];
             for (var i=0; i<32; i++) {
                 r[i] = pm._CHARS[0 | Math.random() * 32];
             };
             return r.join("");
         },

         _callback: function(fn) {
             var cbs = pm.data("callbacks.postmessage");
             if (!cbs) {
                 cbs = {};
                 pm.data("callbacks.postmessage", cbs);
             }
             var r = pm._random();
             cbs[r] = fn;
             return r;
         },

         _bind: function() {
             // are we already listening to message events on this w?
             if (!pm.data("listening.postmessage")) {
                 if (window.addEventListener) {
                     window.addEventListener("message", pm._dispatch, false);
                 }
                 else if (window.attachEvent) {
                     window.attachEvent("onmessage", pm._dispatch);
                 }
                 pm.data("listening.postmessage", 1);
             }
         },

         _dispatch: function(e) {
             //console.log("$.pm.dispatch", e, this);
             try {
                 var msg = JSON.parse(e.data);
             }
             catch (ex) {
                 //console.warn("postmessage data invalid json: ", ex); //message wasn't meant for pm
                 return;
             }
             if (!msg.type) {
                 //console.warn("postmessage message type required"); //message wasn't meant for pm
                 return;
             }
             var cbs = pm.data("callbacks.postmessage") || {},
             cb = cbs[msg.type];
             if (cb) {
                 cb(msg.data);
             }
             else {
                 var l = pm.data("listeners.postmessage") || {};
                 var fns = l[msg.type] || [];
                 for (var i=0,len=fns.length; i<len; i++) {
                     var o = fns[i];
                     if (o.origin && o.origin !== '*' && e.origin !== o.origin) {
                         console.warn("postmessage message origin mismatch", e.origin, o.origin);
                         if (msg.errback) {
                             // notify post message errback
                             var error = {
                                 message: "postmessage origin mismatch",
                                 origin: [e.origin, o.origin]
                             };
                             pm.send({target:e.source, data:error, type:msg.errback});
                         }
                         continue;
                     }

                     function sendReply ( data ) {
                       if (msg.callback) {
                           pm.send({target:e.source, data:data, type:msg.callback});
                       }
                     }

                     try {
                         if ( o.callback ) {
                           o.fn(msg.data, sendReply, e);
                         } else {
                           sendReply ( o.fn(msg.data, e) );
                         }
                     }
                     catch (ex) {
                         if (msg.errback) {
                             // notify post message errback
                             pm.send({target:e.source, data:ex, type:msg.errback});
                         } else {
                             throw ex;
                         }
                     }
                 };
             }
         }
     };

     // location hash polling
     pm.hash = {

         send: function(options, msg) {
             //console.log("hash.send", target_window, options, msg);
             var target_window = options.target,
             target_url = options.url;
             if (!target_url) {
                 console.warn("postmessage target window url is required");
                 return;
             }
             target_url = pm.hash._url(target_url);
             var source_window,
             source_url = pm.hash._url(window.location.href);
             if (window == target_window.parent) {
                 source_window = "parent";
             }
             else {
                 try {
                     for (var i=0,len=parent.frames.length; i<len; i++) {
                         var f = parent.frames[i];
                         if (f == window) {
                             source_window = i;
                             break;
                         }
                     };
                 }
                 catch(ex) {
                     // Opera: security error trying to access parent.frames x-origin
                     // juse use window.name
                     source_window = window.name;
                 }
             }
             if (source_window == null) {
                 console.warn("postmessage windows must be direct parent/child windows and the child must be available through the parent window.frames list");
                 return;
             }
             var hashmessage = {
                 "x-requested-with": "postmessage",
                 source: {
                     name: source_window,
                     url: source_url
                 },
                 postmessage: msg
             };
             var hash_id = "#x-postmessage-id=" + pm._random();
             target_window.location = target_url + hash_id + encodeURIComponent(JSON.stringify(hashmessage));
         },

         _regex: /^\#x\-postmessage\-id\=(\w{32})/,

         _regex_len: "#x-postmessage-id=".length + 32,

         _bind: function() {
             // are we already listening to message events on this w?
             if (!pm.data("polling.postmessage")) {
                 setInterval(function() {
                                 var hash = "" + window.location.hash,
                                 m = pm.hash._regex.exec(hash);
                                 if (m) {
                                     var id = m[1];
                                     if (pm.hash._last !== id) {
                                         pm.hash._last = id;
                                         pm.hash._dispatch(hash.substring(pm.hash._regex_len));
                                     }
                                 }
                             }, $.pm.poll || 200);
                 pm.data("polling.postmessage", 1);
             }
         },

         _dispatch: function(hash) {
             if (!hash) {
                 return;
             }
             try {
                 hash = JSON.parse(decodeURIComponent(hash));
                 if (!(hash['x-requested-with'] === 'postmessage' &&
                       hash.source && hash.source.name != null && hash.source.url && hash.postmessage)) {
                     // ignore since hash could've come from somewhere else
                     return;
                 }
             }
             catch (ex) {
                 // ignore since hash could've come from somewhere else
                 return;
             }
             var msg = hash.postmessage,
             cbs = pm.data("callbacks.postmessage") || {},
             cb = cbs[msg.type];
             if (cb) {
                 cb(msg.data);
             }
             else {
                 var source_window;
                 if (hash.source.name === "parent") {
                     source_window = window.parent;
                 }
                 else {
                     source_window = window.frames[hash.source.name];
                 }
                 var l = pm.data("listeners.postmessage") || {};
                 var fns = l[msg.type] || [];
                 for (var i=0,len=fns.length; i<len; i++) {
                     var o = fns[i];
                     if (o.origin) {
                         var origin = /https?\:\/\/[^\/]*/.exec(hash.source.url)[0];
                         if (o.origin !== '*' && origin !== o.origin) {
                             console.warn("postmessage message origin mismatch", origin, o.origin);
                             if (msg.errback) {
                                 // notify post message errback
                                 var error = {
                                     message: "postmessage origin mismatch",
                                     origin: [origin, o.origin]
                                 };
                                 pm.send({target:source_window, data:error, type:msg.errback, hash:true, url:hash.source.url});
                             }
                             continue;
                         }
                     }

                     function sendReply ( data ) {
                       if (msg.callback) {
                         pm.send({target:source_window, data:data, type:msg.callback, hash:true, url:hash.source.url});
                       }
                     }

                     try {
                         if ( o.callback ) {
                           o.fn(msg.data, sendReply);
                         } else {
                           sendReply ( o.fn(msg.data) );
                         }
                     }
                     catch (ex) {
                         if (msg.errback) {
                             // notify post message errback
                             pm.send({target:source_window, data:ex, type:msg.errback, hash:true, url:hash.source.url});
                         } else {
                             throw ex;
                         }
                     }
                 };
             }
         },

         _url: function(url) {
             // url minus hash part
             return (""+url).replace(/#.*$/, "");
         }

     };

     $.extend(pm, {
                  defaults: {
                      target: null,  /* target window (required) */
                      url: null,     /* target window url (required if no window.postMessage or hash == true) */
                      type: null,    /* message type (required) */
                      data: null,    /* message data (required) */
                      success: null, /* success callback (optional) */
                      error: null,   /* error callback (optional) */
                      origin: "*",   /* postmessage origin (optional) */
                      hash: false    /* use location hash for message passing (optional) */
                  }
              });

 })(this, typeof jQuery === "undefined" ? NO_JQUERY : jQuery);
;
/*
 * Thickbox 3.1 - One Box To Rule Them All.
 * By Cody Lindley (http://www.codylindley.com)
 * Copyright (c) 2007 cody lindley
 * Licensed under the MIT License: http://www.opensource.org/licenses/mit-license.php
*/

if ( typeof tb_pathToImage != 'string' ) {
	var tb_pathToImage = thickboxL10n.loadingAnimation;
}

/*!!!!!!!!!!!!!!!!! edit below this line at your own risk !!!!!!!!!!!!!!!!!!!!!!!*/

//on page load call tb_init
jQuery(document).ready(function(){
	tb_init('a.thickbox, area.thickbox, input.thickbox');//pass where to apply thickbox
	imgLoader = new Image();// preload image
	imgLoader.src = tb_pathToImage;
});

/*
 * Add thickbox to href & area elements that have a class of .thickbox.
 * Remove the loading indicator when content in an iframe has loaded.
 */
function tb_init(domChunk){
	jQuery( 'body' )
		.on( 'click', domChunk, tb_click )
		.on( 'thickbox:iframe:loaded', function() {
			jQuery( '#TB_window' ).removeClass( 'thickbox-loading' );
		});
}

function tb_click(){
	var t = this.title || this.name || null;
	var a = this.href || this.alt;
	var g = this.rel || false;
	tb_show(t,a,g);
	this.blur();
	return false;
}

function tb_show(caption, url, imageGroup) {//function called when the user clicks on a thickbox link

	var $closeBtn;

	try {
		if (typeof document.body.style.maxHeight === "undefined") {//if IE 6
			jQuery("body","html").css({height: "100%", width: "100%"});
			jQuery("html").css("overflow","hidden");
			if (document.getElementById("TB_HideSelect") === null) {//iframe to hide select elements in ie6
				jQuery("body").append("<iframe id='TB_HideSelect'>"+thickboxL10n.noiframes+"</iframe><div id='TB_overlay'></div><div id='TB_window' class='thickbox-loading'></div>");
				jQuery("#TB_overlay").click(tb_remove);
			}
		}else{//all others
			if(document.getElementById("TB_overlay") === null){
				jQuery("body").append("<div id='TB_overlay'></div><div id='TB_window' class='thickbox-loading'></div>");
				jQuery("#TB_overlay").click(tb_remove);
				jQuery( 'body' ).addClass( 'modal-open' );
			}
		}

		if(tb_detectMacXFF()){
			jQuery("#TB_overlay").addClass("TB_overlayMacFFBGHack");//use png overlay so hide flash
		}else{
			jQuery("#TB_overlay").addClass("TB_overlayBG");//use background and opacity
		}

		if(caption===null){caption="";}
		jQuery("body").append("<div id='TB_load'><img src='"+imgLoader.src+"' width='208' /></div>");//add loader to the page
		jQuery('#TB_load').show();//show loader

		var baseURL;
	   if(url.indexOf("?")!==-1){ //ff there is a query string involved
			baseURL = url.substr(0, url.indexOf("?"));
	   }else{
	   		baseURL = url;
	   }

	   var urlString = /\.jpg$|\.jpeg$|\.png$|\.gif$|\.bmp$/;
	   var urlType = baseURL.toLowerCase().match(urlString);

		if(urlType == '.jpg' || urlType == '.jpeg' || urlType == '.png' || urlType == '.gif' || urlType == '.bmp'){//code to show images

			TB_PrevCaption = "";
			TB_PrevURL = "";
			TB_PrevHTML = "";
			TB_NextCaption = "";
			TB_NextURL = "";
			TB_NextHTML = "";
			TB_imageCount = "";
			TB_FoundURL = false;
			if(imageGroup){
				TB_TempArray = jQuery("a[rel="+imageGroup+"]").get();
				for (TB_Counter = 0; ((TB_Counter < TB_TempArray.length) && (TB_NextHTML === "")); TB_Counter++) {
					var urlTypeTemp = TB_TempArray[TB_Counter].href.toLowerCase().match(urlString);
						if (!(TB_TempArray[TB_Counter].href == url)) {
							if (TB_FoundURL) {
								TB_NextCaption = TB_TempArray[TB_Counter].title;
								TB_NextURL = TB_TempArray[TB_Counter].href;
								TB_NextHTML = "<span id='TB_next'>&nbsp;&nbsp;<a href='#'>"+thickboxL10n.next+"</a></span>";
							} else {
								TB_PrevCaption = TB_TempArray[TB_Counter].title;
								TB_PrevURL = TB_TempArray[TB_Counter].href;
								TB_PrevHTML = "<span id='TB_prev'>&nbsp;&nbsp;<a href='#'>"+thickboxL10n.prev+"</a></span>";
							}
						} else {
							TB_FoundURL = true;
							TB_imageCount = thickboxL10n.image + ' ' + (TB_Counter + 1) + ' ' + thickboxL10n.of + ' ' + (TB_TempArray.length);
						}
				}
			}

			imgPreloader = new Image();
			imgPreloader.onload = function(){
			imgPreloader.onload = null;

			// Resizing large images - original by Christian Montoya edited by me.
			var pagesize = tb_getPageSize();
			var x = pagesize[0] - 150;
			var y = pagesize[1] - 150;
			var imageWidth = imgPreloader.width;
			var imageHeight = imgPreloader.height;
			if (imageWidth > x) {
				imageHeight = imageHeight * (x / imageWidth);
				imageWidth = x;
				if (imageHeight > y) {
					imageWidth = imageWidth * (y / imageHeight);
					imageHeight = y;
				}
			} else if (imageHeight > y) {
				imageWidth = imageWidth * (y / imageHeight);
				imageHeight = y;
				if (imageWidth > x) {
					imageHeight = imageHeight * (x / imageWidth);
					imageWidth = x;
				}
			}
			// End Resizing

			TB_WIDTH = imageWidth + 30;
			TB_HEIGHT = imageHeight + 60;
			jQuery("#TB_window").append("<a href='' id='TB_ImageOff'><span class='screen-reader-text'>"+thickboxL10n.close+"</span><img id='TB_Image' src='"+url+"' width='"+imageWidth+"' height='"+imageHeight+"' alt='"+caption+"'/></a>" + "<div id='TB_caption'>"+caption+"<div id='TB_secondLine'>" + TB_imageCount + TB_PrevHTML + TB_NextHTML + "</div></div><div id='TB_closeWindow'><button type='button' id='TB_closeWindowButton'><span class='screen-reader-text'>"+thickboxL10n.close+"</span><span class='tb-close-icon'></span></button></div>");

			jQuery("#TB_closeWindowButton").click(tb_remove);

			if (!(TB_PrevHTML === "")) {
				function goPrev(){
					if(jQuery(document).unbind("click",goPrev)){jQuery(document).unbind("click",goPrev);}
					jQuery("#TB_window").remove();
					jQuery("body").append("<div id='TB_window'></div>");
					tb_show(TB_PrevCaption, TB_PrevURL, imageGroup);
					return false;
				}
				jQuery("#TB_prev").click(goPrev);
			}

			if (!(TB_NextHTML === "")) {
				function goNext(){
					jQuery("#TB_window").remove();
					jQuery("body").append("<div id='TB_window'></div>");
					tb_show(TB_NextCaption, TB_NextURL, imageGroup);
					return false;
				}
				jQuery("#TB_next").click(goNext);

			}

			jQuery(document).bind('keydown.thickbox', function(e){
				if ( e.which == 27 ){ // close
					tb_remove();

				} else if ( e.which == 190 ){ // display previous image
					if(!(TB_NextHTML == "")){
						jQuery(document).unbind('thickbox');
						goNext();
					}
				} else if ( e.which == 188 ){ // display next image
					if(!(TB_PrevHTML == "")){
						jQuery(document).unbind('thickbox');
						goPrev();
					}
				}
				return false;
			});

			tb_position();
			jQuery("#TB_load").remove();
			jQuery("#TB_ImageOff").click(tb_remove);
			jQuery("#TB_window").css({'visibility':'visible'}); //for safari using css instead of show
			};

			imgPreloader.src = url;
		}else{//code to show html

			var queryString = url.replace(/^[^\?]+\??/,'');
			var params = tb_parseQuery( queryString );

			TB_WIDTH = (params['width']*1) + 30 || 630; //defaults to 630 if no parameters were added to URL
			TB_HEIGHT = (params['height']*1) + 40 || 440; //defaults to 440 if no parameters were added to URL
			ajaxContentW = TB_WIDTH - 30;
			ajaxContentH = TB_HEIGHT - 45;

			if(url.indexOf('TB_iframe') != -1){// either iframe or ajax window
					urlNoQuery = url.split('TB_');
					// if src is set, we request the same page then cancel request (which still results in a page view on the backend)
					if ( params['noIframeSrc'] ) {
						urlNoQuery = [ '' ];
					}
					jQuery("#TB_iframeContent").remove();
					if(params['modal'] != "true"){//iframe no modal
						jQuery("#TB_window").append("<div id='TB_title'><div id='TB_ajaxWindowTitle'>"+caption+"</div><div id='TB_closeAjaxWindow'><button type='button' id='TB_closeWindowButton'><span class='screen-reader-text'>"+thickboxL10n.close+"</span><span class='tb-close-icon'></span></button></div></div><iframe frameborder='0' hspace='0' allowtransparency='true' src='"+urlNoQuery[0]+"' id='TB_iframeContent' name='TB_iframeContent"+Math.round(Math.random()*1000)+"' onload='tb_showIframe()' style='width:"+(ajaxContentW + 29)+"px;height:"+(ajaxContentH + 17)+"px;' >"+thickboxL10n.noiframes+"</iframe>");
					}else{//iframe modal
					jQuery("#TB_overlay").unbind();
						jQuery("#TB_window").append("<iframe frameborder='0' hspace='0' allowtransparency='true' src='"+urlNoQuery[0]+"' id='TB_iframeContent' name='TB_iframeContent"+Math.round(Math.random()*1000)+"' onload='tb_showIframe()' style='width:"+(ajaxContentW + 29)+"px;height:"+(ajaxContentH + 17)+"px;'>"+thickboxL10n.noiframes+"</iframe>");
					}
			}else{// not an iframe, ajax
					if(jQuery("#TB_window").css("visibility") != "visible"){
						if(params['modal'] != "true"){//ajax no modal
						jQuery("#TB_window").append("<div id='TB_title'><div id='TB_ajaxWindowTitle'>"+caption+"</div><div id='TB_closeAjaxWindow'><button type='button' id='TB_closeWindowButton'><span class='screen-reader-text'>"+thickboxL10n.close+"</span><span class='tb-close-icon'></span></button></div></div><div id='TB_ajaxContent' style='width:"+ajaxContentW+"px;height:"+ajaxContentH+"px'></div>");
						}else{//ajax modal
						jQuery("#TB_overlay").unbind();
						jQuery("#TB_window").append("<div id='TB_ajaxContent' class='TB_modal' style='width:"+ajaxContentW+"px;height:"+ajaxContentH+"px;'></div>");
						}
					}else{//this means the window is already up, we are just loading new content via ajax
						jQuery("#TB_ajaxContent")[0].style.width = ajaxContentW +"px";
						jQuery("#TB_ajaxContent")[0].style.height = ajaxContentH +"px";
						jQuery("#TB_ajaxContent")[0].scrollTop = 0;
						jQuery("#TB_ajaxWindowTitle").html(caption);
					}
			}

			jQuery("#TB_closeWindowButton").click(tb_remove);

				if(url.indexOf('TB_inline') != -1){
					jQuery("#TB_ajaxContent").append(jQuery('#' + params['inlineId']).children());
					jQuery("#TB_window").bind('tb_unload', function () {
						jQuery('#' + params['inlineId']).append( jQuery("#TB_ajaxContent").children() ); // move elements back when you're finished
					});
					tb_position();
					jQuery("#TB_load").remove();
					jQuery("#TB_window").css({'visibility':'visible'});
				}else if(url.indexOf('TB_iframe') != -1){
					tb_position();
					jQuery("#TB_load").remove();
					jQuery("#TB_window").css({'visibility':'visible'});
				}else{
					var load_url = url;
					load_url += -1 === url.indexOf('?') ? '?' : '&';
					jQuery("#TB_ajaxContent").load(load_url += "random=" + (new Date().getTime()),function(){//to do a post change this load method
						tb_position();
						jQuery("#TB_load").remove();
						tb_init("#TB_ajaxContent a.thickbox");
						jQuery("#TB_window").css({'visibility':'visible'});
					});
				}

		}

		if(!params['modal']){
			jQuery(document).bind('keydown.thickbox', function(e){
				if ( e.which == 27 ){ // close
					tb_remove();
					return false;
				}
			});
		}

		$closeBtn = jQuery( '#TB_closeWindowButton' );
		/*
		 * If the native Close button icon is visible, move focus on the button
		 * (e.g. in the Network Admin Themes screen).
		 * In other admin screens is hidden and replaced by a different icon.
		 */
		if ( $closeBtn.find( '.tb-close-icon' ).is( ':visible' ) ) {
			$closeBtn.focus();
		}

	} catch(e) {
		//nothing here
	}
}

//helper functions below
function tb_showIframe(){
	jQuery("#TB_load").remove();
	jQuery("#TB_window").css({'visibility':'visible'}).trigger( 'thickbox:iframe:loaded' );
}

function tb_remove() {
 	jQuery("#TB_imageOff").unbind("click");
	jQuery("#TB_closeWindowButton").unbind("click");
	jQuery( '#TB_window' ).fadeOut( 'fast', function() {
		jQuery( '#TB_window, #TB_overlay, #TB_HideSelect' ).trigger( 'tb_unload' ).unbind().remove();
		jQuery( 'body' ).trigger( 'thickbox:removed' );
	});
	jQuery( 'body' ).removeClass( 'modal-open' );
	jQuery("#TB_load").remove();
	if (typeof document.body.style.maxHeight == "undefined") {//if IE 6
		jQuery("body","html").css({height: "auto", width: "auto"});
		jQuery("html").css("overflow","");
	}
	jQuery(document).unbind('.thickbox');
	return false;
}

function tb_position() {
var isIE6 = typeof document.body.style.maxHeight === "undefined";
jQuery("#TB_window").css({marginLeft: '-' + parseInt((TB_WIDTH / 2),10) + 'px', width: TB_WIDTH + 'px'});
	if ( ! isIE6 ) { // take away IE6
		jQuery("#TB_window").css({marginTop: '-' + parseInt((TB_HEIGHT / 2),10) + 'px'});
	}
}

function tb_parseQuery ( query ) {
   var Params = {};
   if ( ! query ) {return Params;}// return empty object
   var Pairs = query.split(/[;&]/);
   for ( var i = 0; i < Pairs.length; i++ ) {
      var KeyVal = Pairs[i].split('=');
      if ( ! KeyVal || KeyVal.length != 2 ) {continue;}
      var key = unescape( KeyVal[0] );
      var val = unescape( KeyVal[1] );
      val = val.replace(/\+/g, ' ');
      Params[key] = val;
   }
   return Params;
}

function tb_getPageSize(){
	var de = document.documentElement;
	var w = window.innerWidth || self.innerWidth || (de&&de.clientWidth) || document.body.clientWidth;
	var h = window.innerHeight || self.innerHeight || (de&&de.clientHeight) || document.body.clientHeight;
	arrayPageSize = [w,h];
	return arrayPageSize;
}

function tb_detectMacXFF() {
  var userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.indexOf('mac') != -1 && userAgent.indexOf('firefox')!=-1) {
    return true;
  }
}
;
( function ( g ) {

  var t = {
      PLATFORM_WINDOWS: 'windows',
      PLATFORM_IPHONE: 'iphone',
      PLATFORM_IPOD: 'ipod',
      PLATFORM_IPAD: 'ipad',
      PLATFORM_BLACKBERRY: 'blackberry',
      PLATFORM_BLACKBERRY_10: 'blackberry_10',
      PLATFORM_SYMBIAN: 'symbian_series60',
      PLATFORM_SYMBIAN_S40: 'symbian_series40',
      PLATFORM_J2ME_MIDP: 'j2me_midp',
      PLATFORM_ANDROID: 'android',
      PLATFORM_ANDROID_TABLET: 'android_tablet',
      PLATFORM_FIREFOX_OS: 'firefoxOS',
      PLATFORM_MOBILE_GENERIC: 'mobile_generic',

      userAgent : false, // Shortcut to the browser User Agent String.
      matchedPlatformName : false, // Matched platform name. False otherwise.
      matchedUserAgentName : false, // Matched UA String. False otherwise.

      init: function() {
        try {
          t.userAgent = g.navigator.userAgent.toLowerCase();
          t.getPlatformName();
          t.getMobileUserAgentName();
        }	catch ( e ) {
          console.error( e );
        }
      },

      initForTest: function( userAgent ) {
        t.matchedPlatformName = false;
        t.matchedUserAgentName = false;
        try {
          t.userAgent = userAgent.toLowerCase();
          t.getPlatformName();
          t.getMobileUserAgentName();
        }	catch ( e ) {
          console.error( e );
        }
      },

      /**
       * This method detects the mobile User Agent name.
       */
      getMobileUserAgentName: function() {
        if ( t.matchedUserAgentName !== false )
          return t.matchedUserAgentName;

        if ( t.userAgent === false )
          return false;

        if ( t.isChromeForIOS() )
          t.matchedUserAgentName = 'chrome-for-ios';
        else if ( t.isTwitterForIpad() )
          t.matchedUserAgentName =  'twitter-for-ipad';
        else if ( t.isTwitterForIphone() )
          t.matchedUserAgentName =  'twitter-for-iphone';
        else if ( t.isIPhoneOrIPod() )
          t.matchedUserAgentName = 'iphone';
        else if ( t.isIPad() )
          t.matchedUserAgentName = 'ipad';
        else if ( t.isAndroidTablet() )
          t.matchedUserAgentName = 'android_tablet';
        else if ( t.isAndroid() )
          t.matchedUserAgentName = 'android';
        else if ( t.isBlackberry10() )
          t.matchedUserAgentName = 'blackberry_10';
        else if ( has( 'blackberry' ) )
          t.matchedUserAgentName = 'blackberry';
        else if ( t.isBlackberryTablet() )
          t.matchedUserAgentName = 'blackberry_tablet';
        else if ( t.isWindowsPhone7() )
          t.matchedUserAgentName = 'win7';
        else if ( t.isWindowsPhone8() )
          t.matchedUserAgentName = 'winphone8';
        else if ( t.isOperaMini() )
          t.matchedUserAgentName = 'opera-mini';
        else if ( t.isOperaMobile() )
          t.matchedUserAgentName = 'opera-mobi';
        else if ( t.isKindleFire() )
          t.matchedUserAgentName = 'kindle-fire';
        else if ( t.isSymbianPlatform() )
          t.matchedUserAgentName = 'series60';
        else if ( t.isFirefoxMobile() )
          t.matchedUserAgentName = 'firefox_mobile';
        else if ( t.isFirefoxOS() )
          t.matchedUserAgentName = 'firefoxOS';
        else if ( t.isFacebookForIphone() )
          t.matchedUserAgentName = 'facebook-for-iphone';
        else if ( t.isFacebookForIpad() )
          t.matchedUserAgentName = 'facebook-for-ipad';
        else if ( t.isWordPressForIos() )
          t.matchedUserAgentName = 'ios-app';
        else if ( has( 'iphone' ) )
          t.matchedUserAgentName = 'iphone-unknown';
        else if ( has( 'ipad' ) )
          t.matchedUserAgentName = 'ipad-unknown';

        return t.matchedUserAgentName;
      },

      /**
       * This method detects the mobile platform name.
       */
      getPlatformName : function() {
        if ( t.matchedPlatformName !== false )
          return t.matchedPlatformName;

        if ( t.userAgent === false )
          return false;

        if ( has( 'windows ce' ) || has( 'windows phone' ) ) {
          t.matchedPlatformName = t.PLATFORM_WINDOWS;
        } else if ( has( 'ipad' ) ) {
          t.matchedPlatformName = t.PLATFORM_IPAD;
        } else if ( has( 'ipod' ) ) {
          t.matchedPlatformName = t.PLATFORM_IPOD;
        } else if ( has( 'iphone' ) ) {
          t.matchedPlatformName = t.PLATFORM_IPHONE;
        } else if ( has( 'android' ) ) {
          if ( t.isAndroidTablet() )
            t.matchedPlatformName = t.PLATFORM_ANDROID_TABLET;
          else
            t.matchedPlatformName = t.PLATFORM_ANDROID;
        } else if ( t.isKindleFire() ) {
          t.matchedPlatformName = t.PLATFORM_ANDROID_TABLET;
        } else if ( t.isBlackberry10() ) {
          t.matchedPlatformName = t.PLATFORM_BLACKBERRY_10;
        } else if ( has( 'blackberry' ) ) {
          t.matchedPlatformName = t.PLATFORM_BLACKBERRY;
        } else if ( t.isBlackberryTablet() ) {
          t.matchedPlatformName = t.PLATFORM_BLACKBERRY;
        } else if ( t.isSymbianPlatform() ) {
          t.matchedPlatformName = t.PLATFORM_SYMBIAN;
        } else if ( t.isSymbianS40Platform() ) {
          t.matchedPlatformName = t.PLATFORM_SYMBIAN_S40;
        } else if ( t.isJ2MEPlatform() ) {
          t.matchedPlatformName = t.PLATFORM_J2ME_MIDP;
        } else if ( t.isFirefoxOS() ) {
          t.matchedPlatformName = t.PLATFORM_FIREFOX_OS;
        } else if ( t.isFirefoxMobile() ) {
          t.matchedPlatformName = t.PLATFORM_MOBILE_GENERIC;
        }

        return t.matchedPlatformName;
      },


      /**
       * Detect the BlackBerry OS version.
       *
       * Note: This is for smartphones only. Does not work on BB tablets.
       */
      getBlackBerryOSVersion : check( function() {
        if ( t.isBlackberry10() )
          return '10';

        if ( ! has( 'blackberry' ) )
          return false;

        var rv = -1; // Return value assumes failure.
        var re;

        if ( has( 'webkit' ) ) { // Detecting the BB OS version for devices running OS 6.0 or higher
          re = /Version\/([\d\.]+)/i;
        } else {
          // BlackBerry devices <= 5.XX
          re = /BlackBerry\w+\/([\d\.]+)/i;
        }
        if ( re.exec( t.userAgent ) != null )
          rv =  RegExp.$1.toString();

        return rv === -1 ? false : rv;
      } ),

      /**
       * Detects if the current UA is iPhone Mobile Safari or another iPhone or iPod Touch Browser.
       */
      isIPhoneOrIPod : check( function() {
        return has( 'safari' ) && ( has( 'iphone' ) || has( 'ipod' ) );
      } ),

      /**
       * Detects if the current device is an iPad.
       */
      isIPad : check( function() {
        return has( 'ipad' ) && has( 'safari' );
      } ),


      /**
      *  Detects if the current UA is Chrome for iOS
      */
      isChromeForIOS : check( function() {
        return t.isIPhoneOrIPod() && has( 'crios/' );
      } ),

      /**
       * Detects if the current browser is the Native Android browser.
       */
      isAndroid : check( function() {
        if ( has( 'android' ) ) {
          return ! ( t.isOperaMini() || t.isOperaMobile() || t.isFirefoxMobile() );
        }
      } ),

      /**
       * Detects if the current browser is the Native Android Tablet browser.
       */
       isAndroidTablet : check( function() {
        if ( has( 'android' ) && ! has( 'mobile' ) ) {
          return ! ( t.isOperaMini() || t.isOperaMobile() || t.isFirefoxMobile() );
        }
      } ),


      /**
       * Detects if the current browser is Opera Mobile
       */
      isOperaMobile : check( function() {
        return has( 'opera' ) && has( 'mobi' );
      } ),

      /**
       * Detects if the current browser is Opera Mini
       */
      isOperaMini : check( function() {
        return has( 'opera' ) && has( 'mini' );
      } ),


      /**
       * isBlackberry10() can be used to check the User Agent for a BlackBerry 10 device.
       */
      isBlackberry10 : check( function() {
        return has( 'bb10' ) && has( 'mobile' );
      } ),

      /**
       * isBlackberryTablet() can be used to check the User Agent for a RIM blackberry tablet
       */
      isBlackberryTablet : check( function() {
        return has( 'playbook' ) && has( 'rim tablet' );
      } ),

      /**
       * Detects if the current browser is a Windows Phone 7 device.
       */
      isWindowsPhone7 : check( function () {
        return has( 'windows phone os 7' );
      } ),

      /**
       * Detects if the current browser is a Windows Phone 8 device.
       */
      isWindowsPhone8 : check( function () {
        return has( 'windows phone 8' );
      } ),

      /**
       * Detects if the device platform is J2ME.
       */
      isJ2MEPlatform : check( function () {
        return has( 'j2me/midp' ) || ( has( 'midp' ) && has( 'cldc' ) );
      } ),


      /**
       * Detects if the device platform is the Symbian Series 40.
       */
      isSymbianS40Platform : check( function() {
        if ( has( 'series40' ) ) {
          return has( 'nokia' ) || has( 'ovibrowser' ) || has( 'nokiabrowser' );
        }
      } ),


      /**
       * Detects if the device platform is the Symbian Series 60.
       */
      isSymbianPlatform : check( function() {
        if ( has( 'webkit' ) ) {
          // First, test for WebKit, then make sure it's either Symbian or S60.
          return has( 'symbian' ) || has( 'series60' );
        } else if ( has( 'symbianos' ) && has( 'series60' ) ) {
          return true;
        } else if ( has( 'nokia' ) && has( 'series60' ) ) {
          return true;
        } else if ( has( 'opera mini' ) ) {
          return has( 'symbianos' ) || has( 'symbos' ) || has( 'series 60' );
        }
      } ),


      /**
       * Detects if the current browser is the Kindle Fire Native browser.
       */
      isKindleFire : check( function() {
        return has( 'silk/' ) && has( 'silk-accelerated=' );
      } ),

      /**
       * Detects if the current browser is Firefox Mobile (Fennec)
       */
      isFirefoxMobile : check( function() {
        return has( 'fennec' );
      } ),


      /**
       * Detects if the current browser is the native FirefoxOS browser
       */
      isFirefoxOS : check( function() {
        return has( 'mozilla' ) && has( 'mobile' ) && has( 'gecko' ) && has( 'firefox' );
      } ),


      /**
       * Detects if the current UA is Facebook for iPad
       */
      isFacebookForIpad : check( function() {
        if ( ! has( 'ipad' ) )
          return false;

        return has( 'facebook' ) || has( 'fbforiphone' ) || has( 'fban/fbios;' );
      } ),

      /**
       * Detects if the current UA is Facebook for iPhone
       */
      isFacebookForIphone : check( function() {
        if ( ! has( 'iphone' ) )
          return false;

        return ( has( 'facebook' ) && ! has( 'ipad' ) ) ||
          ( has( 'fbforiphone' ) && ! has( 'tablet' ) ) ||
          ( has( 'fban/fbios;' ) && ! has( 'tablet' ) ); // FB app v5.0 or higher
      } ),

      /**
       * Detects if the current UA is Twitter for iPhone
       */
      isTwitterForIphone : check( function() {
        if ( has( 'ipad' ) )
          return false;

        return has( 'twitter for iphone' );
      } ),

      /**
       * Detects if the current UA is Twitter for iPad
       */
      isTwitterForIpad : check( function() {
        return has( 'twitter for ipad' ) || ( has( 'ipad' ) && has( 'twitter for iphone' ) );
      } ),


      /**
       * Detects if the current UA is WordPress for iOS
       */
      isWordPressForIos : check( function() {
        return has( 'wp-iphone' );
      } )
  };

  function has( str ) {
    return t.userAgent.indexOf( str ) != -1;
  }

  function check( fn ) {
    return function() {
      return t.userAgent === false ? false : fn() || false;
    }
  }

  g.wpcom_mobile_user_agent_info = t;

} )( typeof window !== 'undefined' ? window : this );
;
// Make the list of internal blogs in adminbar scrollable

jQuery( document ).ready( function( $ ) {
	// Handle the tap on menus on mobile, override the core js.
	$(document.body).off( '.wp-mobile-hover' );
	$('#wpadminbar').off('touchstart');

	setTimeout( function() {
		$('li.menupop').on( 'touchstart', function(e) {
			var $target = $(e.target).closest( 'li' );

			if ( $target.hasClass( 'menupop' ) && $target.attr( 'id' ) != 'wp-admin-bar-switch-site' ) {
				e.preventDefault();

				$('li.menupop').not($(this)).removeClass( 'hover' );
				$(this).toggleClass( 'hover' );
			}
		});
	}, 10 );

	// Handle sub menu list of sites scrolling (pre-calypso toolbar view)
	var ul = $('#wpadminbar #wp-admin-bar-my-sites'),
		li = ul.find('> li').not('.adminbar-handle'),
		size = Math.floor( ( $(window).height() - 100 ) / 30 ), // approx, based on current styling
		topHandle, bottomHandle, interval, speed = 100;

	if ( ! ul.length || li.length < size + 1 || ul.find('li:first').hasClass('.adminbar-handle') )
		return;

	function move( direction ) {
		var hide, show, next,
			visible = li.filter(':visible'),
			first = visible.first(),
			last = visible.last();

		if ( 'up' == direction ) {
			show = last.next().not('.adminbar-handle');
			hide = first;

			if ( topHandle.hasClass('scrollend') ) {
				topHandle.removeClass('scrollend');
			}

			if ( show.next().hasClass('adminbar-handle') ) {
				bottomHandle.addClass('scrollend');
			}

			if ( ! show.length ) {
				window.clearInterval( interval );
				return;
			}
		} else if ( 'down' == direction ) {
			show = first.prev().not('.adminbar-handle');
			hide = last;

			if ( bottomHandle.hasClass('scrollend') ) {
				bottomHandle.removeClass('scrollend');
			}

			if ( show.prev().hasClass('adminbar-handle') ) {
				topHandle.addClass('scrollend');
			}

			if ( ! show.length ) {
				window.clearInterval( interval );
				return;
			}
		} else {
			return;
		}

		if ( hide.length && show.length ) {
			// Maybe add some sliding animation?
			hide.hide()
			show.show()
		}
	}

	// hide the extra items
	li.slice(size).hide();

	topHandle = $('<li class="adminbar-handle">');
	bottomHandle = topHandle.clone().addClass('handle-bottom');
	ul.prepend( topHandle.addClass('handle-top scrollend') ).append( bottomHandle );

	topHandle.on( 'mouseenter', function() {
		interval = window.setInterval( function() { move('down'); }, speed );
	}).on( 'click', function() {
		 move('down');
	});

	bottomHandle.on( 'mouseenter', function() {
		interval = window.setInterval( function() { move('up'); }, speed );
	}).on( 'click', function() {
		 move('up');
	});

	topHandle.add( bottomHandle ).on( 'mouseleave click', function() {
		 window.clearInterval( interval );
	});
});
;
/* globals JSON */
( function () {
	var eventName = 'wpcom_masterbar_click';

	var linksTracksEvents = {
		// top level items
		'wp-admin-bar-blog'                        : 'my_sites',
		'wp-admin-bar-newdash'                     : 'reader',
		'wp-admin-bar-ab-new-post'                 : 'write_button',
		'wp-admin-bar-my-account'                  : 'my_account',
		'wp-admin-bar-notes'                       : 'notifications',
		// my sites - top items
		'wp-admin-bar-switch-site'                 : 'my_sites_switch_site',
		'wp-admin-bar-blog-info'                   : 'my_sites_site_info',
		'wp-admin-bar-site-view'                   : 'my_sites_view_site',
		'wp-admin-bar-blog-stats'                  : 'my_sites_site_stats',
		'wp-admin-bar-plan'                        : 'my_sites_plan',
		'wp-admin-bar-plan-badge'                  : 'my_sites_plan_badge',
		// my sites - manage
		'wp-admin-bar-edit-page'                   : 'my_sites_manage_site_pages',
		'wp-admin-bar-new-page-badge'              : 'my_sites_manage_add_page',
		'wp-admin-bar-edit-post'                   : 'my_sites_manage_blog_posts',
		'wp-admin-bar-new-post-badge'              : 'my_sites_manage_add_post',
		'wp-admin-bar-edit-attachment'             : 'my_sites_manage_media',
		'wp-admin-bar-new-attachment-badge'        : 'my_sites_manage_add_media',
		'wp-admin-bar-comments'                    : 'my_sites_manage_comments',
		'wp-admin-bar-edit-jetpack-testimonial'    : 'my_sites_manage_testimonials',
		'wp-admin-bar-new-jetpack-testimonial'     : 'my_sites_manage_add_testimonial',
		'wp-admin-bar-edit-jetpack-portfolio'      : 'my_sites_manage_portfolio',
		'wp-admin-bar-new-jetpack-portfolio'       : 'my_sites_manage_add_portfolio',
		// my sites - personalize
		'wp-admin-bar-themes'                      : 'my_sites_personalize_themes',
		'wp-admin-bar-cmz'                         : 'my_sites_personalize_themes_customize',
		// my sites - configure
		'wp-admin-bar-sharing'                     : 'my_sites_configure_sharing',
		'wp-admin-bar-people'                      : 'my_sites_configure_people',
		'wp-admin-bar-people-add'                  : 'my_sites_configure_people_add_button',
		'wp-admin-bar-plugins'                     : 'my_sites_configure_plugins',
		'wp-admin-bar-domains'                     : 'my_sites_configure_domains',
		'wp-admin-bar-domains-add'                 : 'my_sites_configure_add_domain',
		'wp-admin-bar-blog-settings'               : 'my_sites_configure_settings',
		'wp-admin-bar-legacy-dashboard'            : 'my_sites_configure_wp_admin',
		// reader
		'wp-admin-bar-followed-sites'              : 'reader_followed_sites',
		'wp-admin-bar-reader-followed-sites-manage': 'reader_manage_followed_sites',
		'wp-admin-bar-discover-discover'           : 'reader_discover',
		'wp-admin-bar-discover-search'             : 'reader_search',
		'wp-admin-bar-my-activity-my-likes'        : 'reader_my_likes',
		// account
		'wp-admin-bar-user-info'                   : 'my_account_user_name',
		// account - profile
		'wp-admin-bar-my-profile'                  : 'my_account_profile_my_profile',
		'wp-admin-bar-account-settings'            : 'my_account_profile_account_settings',
		'wp-admin-bar-billing'                     : 'my_account_profile_manage_purchases',
		'wp-admin-bar-security'                    : 'my_account_profile_security',
		'wp-admin-bar-notifications'               : 'my_account_profile_notifications',
		// account - special
		'wp-admin-bar-get-apps'                    : 'my_account_special_get_apps',
		'wp-admin-bar-next-steps'                  : 'my_account_special_next_steps',
		'wp-admin-bar-help'                        : 'my_account_special_help',
	};

	var notesTracksEvents = {
		openSite: function ( data ) {
			return {
				clicked: 'masterbar_notifications_panel_site',
				site_id: data.siteId
			};
		},
		openPost: function ( data ) {
			return {
				clicked: 'masterbar_notifications_panel_post',
				site_id: data.siteId,
				post_id: data.postId
			};
		},
		openComment: function ( data ) {
			return {
				clicked: 'masterbar_notifications_panel_comment',
				site_id: data.siteId,
				post_id: data.postId,
				comment_id: data.commentId
			};
		}
	};

	// Element.prototype.matches as a standalone function, with old browser fallback
	function matches( node, selector ) {
		if ( ! node ) {
			return undefined;
		}

		if ( ! Element.prototype.matches && ! Element.prototype.msMatchesSelector ) {
			throw new Error( 'Unsupported browser' );
		}

		return Element.prototype.matches ? node.matches( selector ) : node.msMatchesSelector( selector );
	}

	// Element.prototype.closest as a standalone function, with old browser fallback
	function closest( node, selector ) {
		if ( ! node ) {
			return undefined;
		}

		if ( Element.prototype.closest ) {
			return node.closest( selector );
		}

		do {
			if ( matches( node, selector ) ) {
				return node;
			}

			node = node.parentElement || node.parentNode;
		} while ( node !== null && node.nodeType === 1 );

		return null;
	}

	function recordTracksEvent( eventProps ) {
		eventProps = eventProps || {};
		window._tkq = window._tkq || [];
		window._tkq.push( [ 'recordEvent', eventName, eventProps ] );
	}

	function parseJson( s, defaultValue ) {
		try {
			return JSON.parse( s );
		} catch ( e ) {
			return defaultValue;
		}
	}

	function createTrackableLinkEventHandler( link ) {
		return function () {
			var parent = closest( link, 'li' );

			if ( ! parent ) {
				return;
			}

			var trackingId = link.getAttribute( 'ID' ) || parent.getAttribute( 'ID' );

			if ( ! linksTracksEvents.hasOwnProperty( trackingId ) ) {
				return;
			}

			var eventProps = { 'clicked': linksTracksEvents[ trackingId ] };
			recordTracksEvent( eventProps );
		}
	}

	function init() {
		var trackableLinkSelector = '.mb-trackable .ab-item:not(div),' +
			'#wp-admin-bar-notes .ab-item,' +
			'#wp-admin-bar-user-info .ab-item,' +
			'.mb-trackable .ab-secondary';

		var trackableLinks = document.querySelectorAll( trackableLinkSelector );

		for ( var i = 0; i < trackableLinks.length; i++ ) {
			var link = trackableLinks[ i ];
			var handler = createTrackableLinkEventHandler( link );

			link.addEventListener( 'click', handler );
			link.addEventListener( 'touchstart', handler );
		}
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}

	// listen for postMessage events from the notifications iframe
	window.addEventListener( 'message', function ( event ) {
		if ( event.origin !== 'https://widgets.wp.com' ) {
			return;
		}

		var data = ( typeof event.data === 'string' ) ? parseJson( event.data, {} ) : event.data;
		if ( data.type !== 'notesIframeMessage' ) {
			return;
		}

		var eventData = notesTracksEvents[ data.action ];
		if ( ! eventData ) {
			return;
		}

		recordTracksEvent( eventData( data ) );
	}, false );

} )();
;
