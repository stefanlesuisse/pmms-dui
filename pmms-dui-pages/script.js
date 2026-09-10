const maxTimeDifference = 2;

var resourceName = 'pmms';
var isRDR = true;
var audioVisualizations = {};
var currentServerEndpoint = '127.0.0.1:30120';

function sendMessage(name, params) {
	return fetch(`https://${resourceName}/${name}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(params)
	});
}

function applyPhonographFilter(player) {
	var context = new (window.AudioContext || window.webkitAudioContext)();

	var source;

	if (player.youTubeApi) {
		var html5Player = player.youTubeApi.getIframe().contentWindow.document.querySelector('.html5-main-video');

		source = context.createMediaElementSource(html5Player);
	} else if (player.hlsPlayer) {
		source = context.createMediaElementSource(player.hlsPlayer.media);
	} else if (player.originalNode) {
		source = context.createMediaElementSource(player.originalNode);
	} else {
		source = context.createMediaElementSource(player);
	}

	if (source) {
		var splitter = context.createChannelSplitter(2);
		var merger = context.createChannelMerger(2);

		var gainNode = context.createGain();
		gainNode.gain.value = 0.5;

		var lowpass = context.createBiquadFilter();
		lowpass.type = 'lowpass';
		lowpass.frequency.value = 3000;
		lowpass.gain.value = -1;

		var highpass = context.createBiquadFilter();
		highpass.type = 'highpass';
		highpass.frequency.value = 300;
		highpass.gain.value = -1;

		source.connect(splitter);
		splitter.connect(merger, 0, 0);
		splitter.connect(merger, 1, 0);
		splitter.connect(merger, 0, 1);
		splitter.connect(merger, 1, 1);
		merger.connect(gainNode);
		gainNode.connect(lowpass);
		lowpass.connect(highpass);
		highpass.connect(context.destination);
	}

	var noise = document.createElement('audio');
	noise.id = player.id + '_noise';
	noise.src = 'https://redm.khzae.net/phonograph/noise.webm';
	noise.volume = 0;
	document.body.appendChild(noise);
	noise.play();

	player.style.filter = 'sepia()';

	player.addEventListener('play', event => {
		noise.play();
	});
	player.addEventListener('pause', event => {
		noise.pause();
	});
	player.addEventListener('volumechange', event => {
		noise.volume = player.volume;
	});
	player.addEventListener('seeked', event => {
		noise.currentTime = player.currentTime;
	});
}

function applyRadioFilter(player) {
	var context = new (window.AudioContext || window.webkitAudioContext)();

	var source;

	if (player.youTubeApi) {
		var html5Player = player.youTubeApi.getIframe().contentWindow.document.querySelector('.html5-main-video');

		source = context.createMediaElementSource(html5Player);
	} else if (player.hlsPlayer) {
		source = context.createMediaElementSource(player.hlsPlayer.media);
	} else if (player.originalNode) {
		source = context.createMediaElementSource(player.originalNode);
	} else {
		source = context.createMediaElementSource(player);
	}

	if (source) {
		var splitter = context.createChannelSplitter(2);
		var merger = context.createChannelMerger(2);

		var gainNode = context.createGain();
		gainNode.gain.value = 0.5;

		var lowpass = context.createBiquadFilter();
		lowpass.type = 'lowpass';
		lowpass.frequency.value = 5000;
		lowpass.gain.value = -1;

		var highpass = context.createBiquadFilter();
		highpass.type = 'highpass';
		highpass.frequency.value = 200;
		highpass.gain.value = -1;

		source.connect(splitter);
		splitter.connect(merger, 0, 0);
		splitter.connect(merger, 1, 0);
		splitter.connect(merger, 0, 1);
		splitter.connect(merger, 1, 1);
		merger.connect(gainNode);
		gainNode.connect(lowpass);
		lowpass.connect(highpass);
		highpass.connect(context.destination);
	}
}

function createAudioVisualization(player, visualization) {
	var waveCanvas = document.createElement('canvas');
	waveCanvas.id = player.id + '_visualization';
	waveCanvas.style.position = 'absolute';
	waveCanvas.style.top = '0';
	waveCanvas.style.left = '0';
	waveCanvas.style.width = '100%';
	waveCanvas.style.height = '100%';

	player.appendChild(waveCanvas);

	var html5Player;

	if (player.youTubeApi) {
		html5Player = player.youTubeApi.getIframe().contentWindow.document.querySelector('.html5-main-video');
	} else if (player.hlsPlayer) {
		html5Player = player.hlsPlayer.media;
	} else if (player.originalNode) {
		html5Player = player.originalNode;
	} else {
		html5Player = player;
	}

	if (!html5Player.id) {
		html5Player.id = player.id + '_html5Player';
	}

	html5Player.style.visibility = 'hidden';

	var doc = player.youTubeApi ? player.youTubeApi.getIframe().contentWindow.document : document;

	if (player.youTubeApi) {
		player.youTubeApi.getIframe().style.visibility = 'hidden';
	}

	var wave = new Wave();

	var options;

	if (visualization) {
		options = audioVisualizations[visualization] || {};

		if (options.type == undefined) {
			options.type = visualization;
		}
	} else {
		options = {type: 'cubes'}
	}

	options.skipUserEventsWatcher = true;
	options.elementDoc = doc;

	wave.fromElement(html5Player.id, waveCanvas.id, options);
}

function showLoadingIcon() {
	document.getElementById('loading').style.display = 'block';
}

function hideLoadingIcon() {
	document.getElementById('loading').style.display = 'none';
}

function resolveUrl(url) {
	if (url.startsWith('http://') || url.startsWith('https://')) {
		return url;
	} else {
		return 'http://' + currentServerEndpoint + '/pmms/media/' + url;
	}
}

/* ============================================================================
 * PMMS - anti-publicite YouTube
 * ----------------------------------------------------------------------------
 * Cette page DUI est chargee par le navigateur embarque (CEF) de chaque joueur.
 * FiveM demarre CEF sans web-security, ce qui autorise l'acces au document de
 * l'iframe YouTube (pmms s'en sert deja pour les filtres audio). C'est ce qui
 * rend le skip de pub possible ici, et uniquement ici.
 *
 * Deux problemes traites :
 *  1. la pub est jouee a la place du morceau demande ;
 *  2. l'evenement "canplay" se declenche PENDANT la pub, donc pmms enregistre
 *     la duree de la publicite (souvent 0) au lieu de celle du morceau, ce qui
 *     desynchronise tout le monde et donne l'impression que le lien ne marche
 *     pas.
 * ========================================================================== */

var adSkipIntervals = {};

function getYouTubeDoc(player) {
	try {
		if (!player || !player.youTubeApi) {
			return null;
		}

		var iframe = player.youTubeApi.getIframe();

		return iframe && iframe.contentWindow ? iframe.contentWindow.document : null;
	} catch (err) {
		return null;
	}
}

/*
 * Seule source fiable : les classes "ad-showing" / "ad-interrupting" que
 * YouTube pose sur #movie_player uniquement pendant une publicite.
 * Les conteneurs .ytp-ad-* existent en permanence dans le DOM (masques) :
 * s'en servir ferait croire a une pub permanente.
 */
function isAdShowing(doc) {
	var moviePlayer = doc.querySelector('#movie_player, .html5-video-player');

	if (!moviePlayer || !moviePlayer.classList) {
		return false;
	}

	return moviePlayer.classList.contains('ad-showing') || moviePlayer.classList.contains('ad-interrupting');
}

function isVisible(el) {
	return el && el.offsetParent !== null;
}

function skipYouTubeAd(player) {
	var doc = getYouTubeDoc(player);

	if (!doc) {
		return;
	}

	if (!player.pmms) {
		player.pmms = {};
	}

	var video = doc.querySelector('.html5-main-video');

	if (!isAdShowing(doc)) {
		/* Fin de pub : on restaure vitesse et volume d'origine. */
		if (player.pmms.adPlaying) {
			player.pmms.adPlaying = false;

			if (video) {
				try {
					video.playbackRate = 1;
					video.muted = player.pmms.mutedBeforeAd === true;
				} catch (err) {}
			}
		}

		return;
	}

	if (!player.pmms.adPlaying) {
		player.pmms.adPlaying = true;
		player.pmms.mutedBeforeAd = video ? video.muted === true : false;
	}

	/* Bannieres / overlays, uniquement si reellement affiches. */
	doc.querySelectorAll('.ytp-ad-overlay-close-button, .ytp-ad-overlay-close-container, .ytp-ad-feedback-dialog-close-button').forEach(function(btn) {
		if (isVisible(btn)) {
			try { btn.click(); } catch (err) {}
		}
	});

	/* Bouton "Passer" : plusieurs variantes de classes selon les versions. */
	var skipButton = doc.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-survey-answer-button');

	if (isVisible(skipButton)) {
		try { skipButton.click(); } catch (err) {}
	}

	/*
	 * Pub non skippable : sourdine + avance rapide jusqu'a la fin.
	 * Garde-fou : on n'avance que sur une duree courte et plausible pour une
	 * publicite (<= 180s), jamais sur un morceau.
	 */
	if (video) {
		try {
			video.muted = true;

			if (isFinite(video.duration) && video.duration > 0 && video.duration <= 180) {
				video.playbackRate = 16;
				video.currentTime = video.duration;
			}
		} catch (err) {}
	}
}

function startAdSkipper(player) {
	if (!player || !player.id || adSkipIntervals[player.id]) {
		return;
	}

	adSkipIntervals[player.id] = setInterval(function() {
		skipYouTubeAd(player);
	}, 250);
}

function stopAdSkipper(player) {
	if (player && player.id && adSkipIntervals[player.id]) {
		clearInterval(adSkipIntervals[player.id]);
		delete adSkipIntervals[player.id];
	}
}

/*
 * Attend la fin d'une eventuelle publicite avant de laisser pmms lire la duree
 * du media. Abandon au bout de 30 s pour ne jamais bloquer la lecture.
 */
function whenAdFree(player, callback) {
	var attempts = 0;

	function check() {
		attempts++;

		var doc = getYouTubeDoc(player);

		if (!doc) {
			callback();
			return;
		}

		var adDone = !isAdShowing(doc);
		var durationReady = isFinite(player.duration) && player.duration > 0;

		if ((adDone && durationReady) || attempts > 120) {
			callback();
		} else {
			setTimeout(check, 250);
		}
	}

	check();
}

/* ==================== fin anti-publicite YouTube ==================== */

function initPlayer(id, handle, options) {
	var player = document.createElement('video');
	player.id = id;
	player.src = resolveUrl(options.url);
	document.body.appendChild(player);

	if (options.attenuation == null) {
		options.attenuation = {sameRoom: 0, diffRoom: 0};
	}

	new MediaElement(id, {
		error: function(media) {
			hideLoadingIcon();

			sendMessage('initError', {
				url: options.url,
				message: media.error ? media.error.message : "unknown error"
			});

			media.remove();
		},
		success: function(media, domNode) {
			media.className = 'player';

			media.pmms = {};
			media.pmms.initialized = false;
			media.pmms.attenuationFactor = options.attenuation.diffRoom;
			media.pmms.volumeFactor = options.diffRoomVolume;

			media.volume = 0;

			startAdSkipper(media);

			media.addEventListener('error', event => {
				hideLoadingIcon();

				sendMessage('playError', {
					url: options.url,
					message: media.error ? media.error.message : "unknown error"
				});

				if (!media.pmms.initialized) {
					media.remove();
				}
			});

			media.addEventListener('canplay', () => {
				if (media.pmms.initialized || media.pmms.waitingForAd) {
					return;
				}

				media.pmms.waitingForAd = true;

				whenAdFree(media, () => {
				media.pmms.waitingForAd = false;

				if (media.pmms.initialized) {
					return;
				}

				hideLoadingIcon();

				var duration;
				
				if (media.duration == NaN || media.duration == Infinity || media.duration == 0 || media.hlsPlayer) {
					options.offset = 0;
					options.duration = false;
					options.loop = false;
				} else {
					options.duration = media.duration;
				}

				if (media.youTubeApi) {
					options.title = media.youTubeApi.getVideoData().title;

					media.videoTracks = {length: 1};
				} else if (media.hlsPlayer) {
					media.videoTracks = media.hlsPlayer.videoTracks;
				} else if (media.twitchPlayer) {
					/* Auto-click Twitch mature content warning button. */
					let button = media.twitchPlayer._iframe.contentWindow.document.querySelector('button[data-a-target="player-overlay-mature-accept"]');

					if (button) {
						button.click();
					}
				} else {
					media.videoTracks = media.originalNode.videoTracks;
				}

				options.video = true;
				options.videoSize = 0;

				sendMessage('init', {
					handle: handle,
					options: options
				});

				media.pmms.initialized = true;

				media.play();
				});
			});

			media.addEventListener('playing', () => {
				startAdSkipper(media);

				if (options.filter && !media.pmms.filterAdded) {
					if (isRDR) {
						applyPhonographFilter(media);
					} else {
						applyRadioFilter(media);
					}
					media.pmms.filterAdded = true;
				}

				if (options.visualization && !media.pmms.visualizationAdded) {
					createAudioVisualization(media, options.visualization);
					media.pmms.visualizationAdded = true;
				}
			});

			media.play();
		}
	});
}

function getPlayer(handle, options) {
	if (handle == undefined) {
		return;
	}

	var id = 'player_' + handle.toString();

	var player = document.getElementById(id);

	if (!player && options && options.url) {
		player = initPlayer(id, handle, options);
	}

	return player;
}

function parseTimecode(timecode) {
	if (typeof timecode != "string") {
		return timecode;
	} else if (timecode.includes(':')) {
		var a = timecode.split(':');
		return parseInt(a[0]) * 3600 + parseInt(a[1]) * 60 + parseInt(a[2]);
	} else {
		return parseInt(timecode);
	}
}

function init(data) {
	if (data.url == '') {
		return;
	}

	showLoadingIcon();

	data.options.offset = parseTimecode(data.options.offset);

	if (!data.options.title) {
		data.options.title = data.options.url;
	}

	getPlayer(data.handle, data.options);
}

function play(handle) {
	var player = getPlayer(handle);
}

function stop(handle) {
	var player = getPlayer(handle);

	if (player) {
		stopAdSkipper(player);

		var noise = document.getElementById(player.id + '_noise');
		if (noise) {
			noise.remove();
		}

		player.remove();
	}
}

function setAttenuationFactor(player, target) {
	if (player.pmms.attenuationFactor > target) {
		player.pmms.attenuationFactor -= 0.1;
	} else {
		player.pmms.attenuationFactor += 0.1;
	}
}

function setVolumeFactor(player, target) {
	if (player.pmms.volumeFactor > target) {
		player.pmms.volumeFactor -= 0.01;
	} else {
		player.pmms.volumeFactor += 0.01;
	}
}

function setVolume(player, target) {
	if (Math.abs(player.volume - target) > 0.1) {
		if (player.volume > target) {
			player.volume -= 0.05;
		} else{
			player.volume += 0.05;
		}
	}
}

function update(data) {
	var player = getPlayer(data.handle, data.options);

	if (player) {
		if (data.options.paused || data.distance < 0 || data.distance > data.options.range) {
			if (!player.paused) {
				player.pause();
			}
		} else {
			if (data.sameRoom) {
				setAttenuationFactor(player, data.options.attenuation.sameRoom);
				setVolumeFactor(player, 1.0);
			} else {
				setAttenuationFactor(player, data.options.attenuation.diffRoom);
				setVolumeFactor(player, data.options.diffRoomVolume);
			}

			if (player.readyState > 0) {
				var volume;

				if (data.options.muted || data.volume == 0) {
					volume = 0;
				} else {
					volume = (((100 - data.distance * player.pmms.attenuationFactor) / 100) * player.pmms.volumeFactor) * (data.volume / 100);
				}

				if (volume > 0) {
					if (data.distance > 100) {
						setVolume(player, volume);
					} else {
						player.volume = volume;
					}
				} else {
					player.volume = 0;
				}

				if (data.options.duration) {
					var currentTime = data.options.offset % player.duration;

					if (Math.abs(currentTime - player.currentTime) > maxTimeDifference) {
						player.currentTime = currentTime;
					}
				}

				if (player.paused) {
					player.play();
				}
			}
		}
	}
}

function setResourceNameFromUrl() {
	var url = new URL(window.location);
	var params = new URLSearchParams(url.search);
	resourceName = params.get('resourceName') || resourceName;
}

window.addEventListener('message', event => {
	switch (event.data.type) {
		case 'init':
			init(event.data);
			break;
		case 'play':
			play(event.data.handle);
			break;
		case 'stop':
			stop(event.data.handle);
			break;
		case 'update':
			update(event.data);
			break;
		case 'DuiBrowser:init':
			sendMessage('DuiBrowser:initDone', {handle: event.data.handle});
			break;
	}
});

window.addEventListener('load', () => {
	setResourceNameFromUrl();

	sendMessage('duiStartup', {}).then(resp => resp.json()).then(resp => {
		if (resp.isRDR != undefined) {
			isRDR = resp.isRDR;
		}
		if (resp.audioVisualizations != undefined) {
			audioVisualizations = resp.audioVisualizations;
		}
		if (resp.currentServerEndpoint != undefined) {
			currentServerEndpoint = resp.currentServerEndpoint;
		}
	});
});
