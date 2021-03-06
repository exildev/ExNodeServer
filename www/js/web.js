socket = io();
var marker = null;
var ruta = null;
var markers = [];
var motorizados = {};
var map;

var empresa = urlObject({url: document.location.href}).parameters.empresa;
var token = urlObject({url: document.location.href}).parameters.token;


if (empresa && token) {
	console.log("me loguere con la empresa: ", empresa);
	socket.emit('login',{usertype:'WEB', empresa: empresa, token: token});
};

socket.on('ionic-qr', function (msg){
	document.getElementById("cell_id").value = msg;
});

socket.on('rutas', function(msg){
    if (motorizados[msg.motorizado] == undefined) {
        motorizados[msg.motorizado] = {markers: [], marker: null};
    }

    motorizados[msg.motorizado].detenido = msg.retraso;

    if(motorizados[msg.motorizado].marker){
        motorizados[msg.motorizado].marker.setMap(null);
        motorizados[msg.motorizado].marker = null;
    }

    var cityCircle = new google.maps.Circle({
        strokeColor: motorizados[msg.motorizado].detenido?'#FF0000':'#0B9444',
        strokeOpacity: 1,
        strokeWeight: 2,
        fillColor: motorizados[msg.motorizado].detenido? '#FF0000':'#8DC63E',
        fillOpacity: 0.8,
        map: map,
        center: new google.maps.LatLng(msg.lat, msg.lng),
        radius: 10
    });

    motorizados[msg.motorizado].markers.push(cityCircle);


    var icon = motorizados[msg.motorizado].detenido?'img/pin_red.svg':'img/pin.svg';
    if (motorizados[msg.motorizado].seleccionado) {
        icon = 'img/sel_pin.svg'
    };
    motorizados[msg.motorizado].marker = new google.maps.Marker({
        position: new google.maps.LatLng(msg.lat, msg.lng),
        map: map,
        icon: icon,
        title: 'motorizado: ' + msg.motorizado,
        animation: google.maps.Animation.DROP
    });

    motorizados[msg.motorizado].marker.addListener('click', function() {
        socket.emit('get-data', {cell_id: msg.motorizado})
    });

    map.setCenter(new google.maps.LatLng(msg.lat, msg.lng));
});

socket.on('gps', function (msg){
	if (motorizados[msg.django_id] == undefined) {
		motorizados[msg.django_id] = {markers: [], marker: null};
	}

	if(motorizados[msg.django_id].marker){
		motorizados[msg.django_id].marker.setMap(null);
		motorizados[msg.django_id].marker = null;
	}

	var cityCircle = new google.maps.Circle({
	    strokeColor: motorizados[msg.django_id].detenido?'#FF0000':'#0B9444',
	    strokeOpacity: 1,
	    strokeWeight: 2,
	    fillColor: motorizados[msg.django_id].detenido?	'#FF0000':'#8DC63E',
	    fillOpacity: 0.8,
	    map: map,
	    center: msg,
	    radius: 10
	});

	motorizados[msg.django_id].markers.push(cityCircle);


	var icon = motorizados[msg.django_id].detenido?'img/pin_red.svg':'img/pin.svg';
    if (motorizados[msg.django_id].seleccionado) {
        icon = 'img/sel_pin.svg'
    };

	motorizados[msg.django_id].marker = new google.maps.Marker({
		position: msg,
		map: map,
		icon: icon,
		title: 'my ID ' + msg.django_id,
		animation: google.maps.Animation.DROP
	});

    motorizados[msg.django_id].marker.addListener('click', function() {
        socket.emit('get-data', {cell_id: msg.django_id})
    });

	map.setCenter(msg);
});

socket.on('get-data', function(msg) {
    var contentString = '<div id="content">'+
      '<p><i class="material-icons">account_circle</i> '+ msg.nombre + ' ' + msg.apellidos +'</p>'+
      '<p></p>'+
      '</div>';
    console.log(msg);
    infowindow.setContent(contentString);
    infowindow.open(map,motorizados[msg.identificador].marker);
});

socket.on('motorizado-detenido', function(message) {
	console.log(message);
    if (motorizados[message.identificador]) {
        motorizados[message.identificador].detenido = true;
    };
});

socket.on('motorizado-movimiento', function(message){
    console.log(message);
    if (motorizados[message.identificador]) {
        motorizados[message.identificador].detenido = false;
    };
});

socket.on('select-motorizado', function(message) {
    for (var i in motorizados) {
        var motorizado = motorizados[i];
        motorizado.seleccionado = false;
        if(motorizado.marker){
            var icon = motorizado.detenido?'img/pin_red.svg':'img/pin.svg';
            motorizado.marker.setIcon(icon);
        }
    };
    if (motorizados[message.motorizado]) {
        motorizados[message.motorizado].seleccionado = true;
        if(motorizados[message.motorizado].marker){
            motorizados[message.motorizado].marker.setIcon('img/sel_pin.svg');
        }
    }else{
        notifyMe('Este motorizado no tiene rutas asignadas');
    }
});

socket.on('clear-gps', function(message) {

    if(motorizados[message.identificador].marker){
        motorizados[message.identificador].marker.setMap(null);
        motorizados[message.identificador].marker = null;
    }
    
    if (motorizados[message.identificador] != undefined) {
        var markers = motorizados[message.identificador].markers;
        for (var i = markers.length - 1; i >= 0; i--) {
            markers[i].setMap(null);
        };
        motorizados[message.identificador] = undefined;
    }
});

socket.on('pedido-entregado', function(message){
    notifyMe("El motorizado " + message.motorizado.nombre + " a entregado el pedido con el consecutivo " + message.pedido._pedido_cache, function(event) {
        event.preventDefault(); // prevent the browser from focusing the Notification's tab
        window.open(message.pedido.imagen, '_blank');
    });
})

var map;

function initMap() {
    infowindow = new google.maps.InfoWindow();
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 10.3970683, lng: -75.4925649},
        zoom: 15
    });
}

function urlObject(options) {
    "use strict";
    /*global window, document*/

    var url_search_arr,
        option_key,
        i,
        urlObj,
        get_param,
        key,
        val,
        url_query,
        url_get_params = {},
        a = document.createElement('a'),
        default_options = {
            'url': window.location.href,
            'unescape': true,
            'convert_num': true
        };

    if (typeof options !== "object") {
        options = default_options;
    } else {
        for (option_key in default_options) {
            if (default_options.hasOwnProperty(option_key)) {
                if (options[option_key] === undefined) {
                    options[option_key] = default_options[option_key];
                }
            }
        }
    }

    a.href = options.url;
    url_query = a.search.substring(1);
    url_search_arr = url_query.split('&');

    if (url_search_arr[0].length > 1) {
        for (i = 0; i < url_search_arr.length; i += 1) {
            get_param = url_search_arr[i].split("=");

            if (options.unescape) {
                key = decodeURI(get_param[0]);
                val = decodeURI(get_param[1]);
            } else {
                key = get_param[0];
                val = get_param[1];
            }

            if (options.convert_num) {
                if (val.match(/^\d+$/)) {
                    val = parseInt(val, 10);
                } else if (val.match(/^\d+\.\d+$/)) {
                    val = parseFloat(val);
                }
            }

            if (url_get_params[key] === undefined) {
                url_get_params[key] = val;
            } else if (typeof url_get_params[key] === "string") {
                url_get_params[key] = [url_get_params[key], val];
            } else {
                url_get_params[key].push(val);
            }

            get_param = [];
        }
    }

    urlObj = {
        protocol: a.protocol,
        hostname: a.hostname,
        host: a.host,
        port: a.port,
        hash: a.hash.substr(1),
        pathname: a.pathname,
        search: a.search,
        parameters: url_get_params
    };

    return urlObj;
}

function notifyMe(message, click_event) {
  // Let's check if the browser supports notifications
  if (!("Notification" in window)) {
    alert("This browser does not support desktop notification");
  }

  // Let's check whether notification permissions have already been granted
  else if (Notification.permission === "granted") {
    // If it's okay let's create a notification
    var options = {
            body: message,
            icon: "/img/icon.png"
        }
    var notification = new Notification("Express del norte", options);
    notification.onclick = click_event;
  }

  // Otherwise, we need to ask the user for permission
  else if (Notification.permission !== 'denied') {
    Notification.requestPermission(function (permission) {
      // If the user accepts, let's create a notification
      if (permission === "granted") {
        var options = {
            body: message,
            icon: "/img/icon.png"
        }
        var notification = new Notification("Express del norte", options);
        notification.onclick = click_event;
      }
    });
  }

  // At last, if the user has denied notifications, and you 
  // want to be respectful there is no need to bother them any more.
}