var audio = {
	analyser: {},
	buffer: {},
	buffer_effects: {},
	compatibility: {},
	convolver: {},
	effects: ["data/effect1.wav", "data/effect2.wav", "data/effect3.wav"],
	files: ["data/audio1.mp3", "data/audio4.mp3", "data/audio5.mp3"],
	gain: {},
	gain_loop: {},
	gain_once: {},
	message: {
		quote: ["I like audio loops... better than I like you.<br>~ Dr. McCoy to Spock", "There is the theory of the mobius, a twist in the fabric of space where time becomes a loop...<br>~ Worf", "Hey doll, is this audio boring you? Come and talk to me. I'm from a different planet.<br>~ Zaphod Beeblebrox", "I need your headphones, your record player and your glowsticks.<br>~ Arnold Schwarzenegger", "I'm the synthesizer. Are you the keymaster?<br>~ Sigourney Weaver", "Flash? Where we're going, we don't need flash.<br>~ Doc Brown", "I'll be history.back()<br>~ Arnold Schwarzenegger", "I don't want one loop, I want all loops!<br>~ Ruby Rhod", "If it reads, we can stream it.<br>~ Arnold Schwarzenegger"],
		quote_last: -1
	},
	pause_vis: true,
	playing: 0,
	proceed: true,
	source_loop: {},
	source_once: {},
	volume_fade_time: .7
};
audio.findSync = function (n) {
	var first = 0,
		current = 0,
		offset = 0;
	for (var i in audio.source_loop) {
		current = audio.source_loop[i]._startTime;
		if (current > 0) {
			if (current < first || first === 0) {
				first = current
			}
		}
	}
	if (audio.context.currentTime > first) {
		var duration = audio.buffer[n].duration;
		offset = (audio.context.currentTime - first) % duration
	}
	return offset
};
audio.message.random = function () {
	var num;
	do {
		num = Math.floor(Math.random() * audio.message.quote.length)
	} while (num === audio.message.quote_last);
	audio.message.quote_last = num;
	return audio.message.quote[num]
};
audio.play = function (n, playOnly) {
	if (audio.source_loop[n]._playing) {
		if (!playOnly) {
			audio.stop(n)
		}
	} else {
		audio.source_loop[n] = audio.context.createBufferSource();
		audio.source_loop[n].buffer = audio.buffer[n];
		audio.source_loop[n].connect(audio.gain_loop[n]);
		audio.source_loop[n].loop = true;
		var offset = audio.findSync(n);
		audio.source_loop[n]._startTime = audio.context.currentTime;
		if (audio.compatibility.start === "noteOn") {
			audio.source_once[n] = audio.context.createBufferSource();
			audio.source_once[n].buffer = audio.buffer[n];
			audio.source_once[n].connect(audio.gain_once[n]);
			audio.source_once[n].noteGrainOn(0, offset, audio.buffer[n].duration - offset);
			audio.gain_once[n].gain.setValueAtTime(0, audio.context.currentTime);
			audio.gain_once[n].gain.linearRampToValueAtTime(1, audio.context.currentTime + audio.volume_fade_time);
			audio.source_loop[n][audio.compatibility.start](audio.context.currentTime + (audio.buffer[n].duration - offset))
		} else {
			audio.source_loop[n][audio.compatibility.start](0, offset)
		}
		audio.gain_loop[n].gain.setValueAtTime(0, audio.context.currentTime);
		audio.gain_loop[n].gain.linearRampToValueAtTime(1, audio.context.currentTime + audio.volume_fade_time);
		document.getElementById("button-loop-" + n).className = "active";
		audio.source_loop[n]._playing = true;
		audio.playing = audio.playing + 1;
		if (audio.playing === 1) {
			audio.pause_vis = false;
			drawSpectrum();
			jQuery(".widget-vis p").stop().fadeOut(1500, function () {
				jQuery(this).html(audio.message.random())
			})
		}
	}
};
audio.playAll = function () {
	for (var a in audio.source_loop) {
		audio.play(a, true)
	}
};
audio.stop = function (n) {
	if (audio.source_loop[n]._playing && !audio.source_loop[n]._stopping) {
		audio.source_loop[n]._stopping = true;
		audio.source_loop[n][audio.compatibility.stop](audio.context.currentTime + audio.volume_fade_time);
		audio.source_loop[n]._startTime = 0;
		if (audio.compatibility.start === "noteOn") {
			audio.source_once[n][audio.compatibility.stop](audio.context.currentTime + audio.volume_fade_time);
			audio.gain_once[n].gain.setValueAtTime(1, audio.context.currentTime);
			audio.gain_once[n].gain.linearRampToValueAtTime(0, audio.context.currentTime + audio.volume_fade_time)
		} (function () {
			var num = n;
			setTimeout(function () {
				audio.source_loop[num]._playing = false;
				audio.source_loop[num]._stopping = false
			}, audio.volume_fade_time * 100)
		})();
		audio.gain_loop[n].gain.setValueAtTime(1, audio.context.currentTime);
		audio.gain_loop[n].gain.linearRampToValueAtTime(0, audio.context.currentTime + audio.volume_fade_time);
		document.getElementById("button-loop-" + n).className = "inactive";
		audio.playing = audio.playing - 1;
		if (audio.playing === 0) {
			setTimeout(function () {
				if (audio.playing === 0) {
					audio.pause_vis = true;
					jQuery(".widget-vis p").stop().fadeIn(3e3)
				}
			}, 5e3)
		}
	}
};
audio.stopAll = function () {
	for (var a in audio.source_loop) {
		audio.stop(a)
	}
};
try {
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	audio.context = new window.AudioContext
} catch (e) {
	audio.proceed = false;
	alert("Web Audio API not supported in this browser.")
}
if (audio.proceed) {
	(function () {
		var name = "createGain";
		if (typeof audio.context.createGain !== "function") {
			name = "createGainNode"
		}
		audio.compatibility.createGain = name
	})();
	(function () {
		var start = "start",
			stop = "stop",
			buffer = audio.context.createBufferSource();  //创建一个AudioBufferSourceNode对象，它可以通过AudioBuffer对象来播放和处理包含在内的音频数据
														  // AudioBuffer可以通过AudioContext.decodeAudioData方法解码音轨来创建
		if (typeof buffer.start !== "function") {
			start = "noteOn"
		}
		audio.compatibility.start = start;
		if (typeof buffer.stop !== "function") {
			stop = "noteOff"
		}
		audio.compatibility.stop = stop
	})();
	var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame;
	window.requestAnimationFrame = requestAnimationFrame;  //window.requestAnimationFrame方法告诉浏览器您希望执行动画并请求浏览器在下一次中重绘之前调用指定的函数来更新动画，canvas知识
	audio.gain.booster = audio.context[audio.compatibility.createGain]();
	audio.gain.booster.gain.value = 3;
	audio.convolver = audio.context.createConvolver(); //卷积节点，用于实现混响效果
	audio.convolver.connect(audio.gain.booster); //连接音量
	audio.gain.collapse = audio.context[audio.compatibility.createGain]();
	var img = new Image;  //创建一个img对象
	img.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAIAAAACUFjqAAAAEklEQVR4AWNsP/eaATcYlcYKANQJFotqqVYoAAAAAElFTkSuQmCC";
	var canvas_div = document.getElementById("vis-div");
	var canvas = document.getElementById("vis");
	canvas.height = canvas_div.offsetHeight;  //内容高+padding+边框
	canvas.width = canvas_div.offsetWidth;  
	var ctx = canvas.getContext("2d");  //返回一个用于在画布上绘图的环境
	ctx.imageSmoothingEnabled = false;  //用来设置图片是否平滑的属性，false控制图片的缩放行为
	ctx.webkitImageSmoothingEnabled = ctx.mozImageSmoothingEnabled = false;

	function drawSpectrum() {
		audio.analyser.getByteFrequencyData(audio.frequencyData);
		var bar_width = Math.ceil(canvas.width / (audio.analyser.frequencyBinCount * .85));
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		var freq, x, y, w, h;
		ctx.fillStyle = ctx.createPattern(img, "repeat");
		for (var i = 0; i < audio.analyser.frequencyBinCount; i++) {
			freq = audio.frequencyData[i] || 0;
			x = bar_width * i;
			if (x + bar_width < canvas.width) {
				y = canvas.height;
				w = bar_width - 1;
				h = -(Math.floor(freq / 255 * canvas.height) + 1);
				ctx.fillRect(x, y, w, h)
			}
		}
		if (!audio.pause_vis) {
			requestAnimationFrame(drawSpectrum)
		} else {
			ctx.clearRect(0, 0, canvas.width, canvas.height)
		}
	}
	audio.analyser = audio.context.createAnalyser(); //创建一个analyserNode，可以用来获取音频时间和频率数据，以及实现数据可视化
	audio.analyser.smoothingTimeConstant = .85;  
	// smoothingTimeConstant是一个双精度浮点型的值。表示最后一个分析帧的平均常数。使缓冲区的值变化更加平滑
	audio.analyser.fftSize = 256; //表示信号样本的窗口大小
	audio.frequencyData = new Uint8Array(audio.analyser.frequencyBinCount);
	//frequencyBinCount 的值固定为AnalyserNode接口中fftSize值的一半。该值通常用于可视化的数据值的数量
	jQuery("#master-volume").prop("disabled", false).knob({
		angleArc: 360,
		angleOffset: 0,
		displayInput: true,
		height: 104,
		thickness: ".2",
		width: 104,
		change: function (v) {
			v = v / 100;
			audio.gain.master.gain.value = v * v
		}
	});
	audio.gain.master = audio.context[audio.compatibility.createGain]();
	audio.gain.master.gain.value = .8649;
	audio.gain.master.connect(audio.analyser);
	audio.gain.master.connect(audio.context.destination);
	audio.gain.collapse.connect(audio.gain.master);
	jQuery(".widget-effects").delegate("button", "click", function (e) { //为指定元素添加一个或多个事件处理程序
		var val = parseInt(this.value);
		audio.gain.collapse.disconnect();
		audio.gain.booster.disconnect();
		var previous_vol = audio.gain.master.gain.value;
		audio.gain.master.gain.value = 0;
		if (this.className === "active") {
			jQuery(".widget-effects .active").removeClass("active");
			audio.gain.collapse.connect(audio.gain.master)
		} else {
			jQuery(".widget-effects .active").removeClass("active");
			audio.convolver.buffer = audio.buffer_effects[val];
			audio.gain.collapse.connect(audio.convolver);
			audio.gain.booster.connect(audio.gain.master);
			this.className = "active"
		}
		setTimeout(function () {
			audio.gain.master.gain.value = previous_vol
		}, 50)
	});
	document.getElementById("button-stop").addEventListener("click", audio.stopAll);
	document.getElementById("button-stop").disabled = false;
	document.getElementById("button-play").addEventListener("click", audio.playAll);
	document.getElementById("button-play").disabled = false;
	for (var a in audio.files) {
		(function () {
			var i = parseInt(a) + 1;
			var req = new XMLHttpRequest;
			req.open("GET", audio.files[i - 1], true);
			req.responseType = "arraybuffer";
			req.onload = function () {
				audio.context.decodeAudioData(req.response, function (buffer) {
					audio.buffer[i] = buffer;
					audio.source_loop[i] = {};
					var button = document.getElementById("button-loop-" + i);
					button.addEventListener("click", function (e) {
						e.preventDefault();
						audio.play(this.value, false)
					});
					jQuery(button).text(button.getAttribute("data-name")).removeClass("loading");
					button.disabled = false;
					audio.gain_loop[i] = audio.context[audio.compatibility.createGain]();
					audio.gain_loop[i].connect(audio.gain.collapse);
					if (audio.compatibility.start === "noteOn") {
						audio.gain_once[i] = audio.context[audio.compatibility.createGain]();
						audio.gain_once[i].connect(audio.gain.collapse)
					}
				}, function () {
					console.log('Error decoding audio "' + audio.files[i - 1] + '".')
				})
			};
			req.send()
		})()
	}
	for (var a in audio.effects) {
		(function () {
			var i = parseInt(a) + 1;
			var req = new XMLHttpRequest;
			req.open("GET", audio.effects[i - 1], true);
			req.responseType = "arraybuffer";
			req.onload = function () {
				audio.context.decodeAudioData(req.response, function (buffer) {
					audio.buffer_effects[i] = buffer;
					var button = document.getElementById("effect-" + i);
					button.disabled = false;
					jQuery(button).html(button.getAttribute("data-name").replace(" ", "<br>")).removeClass("loading")
				}, function () {
					console.log('Error decoding effect "' + audio.effects[i - 1] + '".')
				})
			};
			req.send()
		})()
	}
	jQuery(document).ready(function () {
		jQuery(window).resize(function () {
			canvas.height = canvas_div.offsetHeight;
			canvas.width = canvas_div.offsetWidth
		})
	})
}/*  |xGv00|63d497e1195e8d20436a227105ebbe7b */