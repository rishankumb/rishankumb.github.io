(function () {
	'use strict';

	const canvas = document.getElementById('ocean-tech-background');
	if (!canvas || !canvas.getContext) return;

	const ctx = canvas.getContext('2d');
	if (!ctx) return;

	const palettes = {
		oceanTech: {
			base: [21, 25, 30], cold: [52, 127, 140], warm: [182, 107, 61],
			grid: [77, 105, 116], accent: [195, 216, 218]
		},
		abyss: {
			base: [7, 12, 24], cold: [72, 145, 255], warm: [255, 155, 72],
			grid: [70, 125, 210], accent: [205, 225, 255]
		},
		biolume: {
			base: [4, 17, 20], cold: [45, 205, 174], warm: [255, 108, 93],
			grid: [42, 153, 147], accent: [200, 255, 229]
		}
	};

	let activePalette = palettes.oceanTech;
	let width = 0;
	let height = 0;
	let pixelRatio = 1;
	let time = 0;
	let frameId = 0;
	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
	const smallScreen = window.matchMedia('(max-width: 736px)');
	const rgb = (color) => 'rgb(' + color.join(',') + ')';
	const rgba = (color, alpha) => 'rgba(' + color.join(',') + ',' + alpha + ')';

	const signalChannels = [
		{ level: 0.29, phase: 0.4, color: 'cold' },
		{ level: 0.5, phase: 2.1, color: 'accent' },
		{ level: 0.71, phase: 4.2, color: 'warm' }
	];

	function resize() {
		width = window.innerWidth;
		height = window.innerHeight;
		pixelRatio = Math.min(window.devicePixelRatio || 1, smallScreen.matches ? 1.25 : 2);
		canvas.width = Math.round(width * pixelRatio);
		canvas.height = Math.round(height * pixelRatio);
		ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
		draw();
	}

	function drawDepth() {
		ctx.fillStyle = rgb(activePalette.base);
		ctx.fillRect(0, 0, width, height);

		let gradient = ctx.createRadialGradient(width * 0.5, 0, 0, width * 0.5, height * 0.48, height * 0.74);
		gradient.addColorStop(0, rgba(activePalette.cold, 0.08));
		gradient.addColorStop(1, rgba(activePalette.cold, 0));
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, width, height);

		gradient = ctx.createLinearGradient(0, height * 0.48, 0, height);
		gradient.addColorStop(0, rgba(activePalette.warm, 0));
		gradient.addColorStop(1, rgba(activePalette.warm, 0.10));
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, width, height);

		const pulse = 0.5 + 0.5 * Math.sin(time * 0.012);
		[
			{ x: 0, strength: 0.07 + pulse * 0.05 },
			{ x: width, strength: 0.07 + (1 - pulse) * 0.05 }
		].forEach((blob) => {
			const radius = Math.max(width, height) * 0.62;
			const glow = ctx.createRadialGradient(blob.x, height, 0, blob.x, height, radius);
			glow.addColorStop(0, rgba(activePalette.warm, blob.strength));
			glow.addColorStop(1, rgba(activePalette.warm, 0));
			ctx.fillStyle = glow;
			ctx.fillRect(0, 0, width, height);
		});

		gradient = ctx.createRadialGradient(width * 0.5, 0, 0, width * 0.5, 0, height * 0.55);
		gradient.addColorStop(0, rgba(activePalette.cold, 0.11));
		gradient.addColorStop(1, rgba(activePalette.cold, 0));
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, width, height);
	}

	function drawSignalNetwork() {
		const centerY = height * 0.52;
		const hubX = width > 980 ? Math.min(width * 0.18, 260) : (width > 736 ? 54 : 12);
		const sampleCount = Math.max(18, Math.ceil(hubX / 6));

		function pointAt(channel, progress, side) {
			const direction = side === 'left' ? 1 : -1;
			const x = side === 'left' ? hubX * progress : width - hubX * progress;
			const startY = height * channel.level;
			const envelope = Math.sin(Math.PI * progress);
			const wave = envelope * (
				Math.sin(progress * 8 + time * 0.018 + channel.phase) * height * 0.012 +
				Math.sin(progress * 19 - time * 0.011 + channel.phase) * height * 0.003
			);
			return {
				x,
				y: startY + (centerY - startY) * progress + wave,
				direction
			};
		}

		['left', 'right'].forEach((side) => {
			signalChannels.forEach((channel, channelIndex) => {
				const color = activePalette[channel.color];
				ctx.beginPath();
				for (let sample = 0; sample <= sampleCount; sample += 1) {
					const progress = sample / sampleCount;
					const point = pointAt(channel, progress, side);
					if (sample === 0) ctx.moveTo(point.x, point.y);
					else ctx.lineTo(point.x, point.y);
				}
				ctx.strokeStyle = rgba(color, 0.13);
				ctx.lineWidth = channelIndex === 1 ? 1.1 : 0.85;
				ctx.stroke();

				const pulseProgress = (time * 0.0018 + channelIndex * 0.29 + (side === 'right' ? 0.5 : 0)) % 1;
				const pulsePoint = pointAt(channel, pulseProgress, side);
				const pulse = 0.55 + 0.45 * Math.sin(time * 0.035 + channel.phase);
				const halo = ctx.createRadialGradient(pulsePoint.x, pulsePoint.y, 0, pulsePoint.x, pulsePoint.y, 10);
				halo.addColorStop(0, rgba(color, 0.16 * pulse));
				halo.addColorStop(1, rgba(color, 0));
				ctx.fillStyle = halo;
				ctx.fillRect(pulsePoint.x - 10, pulsePoint.y - 10, 20, 20);
				ctx.beginPath();
				ctx.arc(pulsePoint.x, pulsePoint.y, 1.5, 0, Math.PI * 2);
				ctx.fillStyle = rgba(color, 0.52 * pulse);
				ctx.fill();
			});

			const hubXPosition = side === 'left' ? hubX : width - hubX;
			const hubPulse = 0.5 + 0.5 * Math.sin(time * 0.02 + (side === 'left' ? 0 : 1.7));
			const hubGlow = ctx.createRadialGradient(hubXPosition, centerY, 0, hubXPosition, centerY, 22);
			hubGlow.addColorStop(0, rgba(activePalette.warm, 0.13 + hubPulse * 0.05));
			hubGlow.addColorStop(1, rgba(activePalette.warm, 0));
			ctx.fillStyle = hubGlow;
			ctx.fillRect(hubXPosition - 22, centerY - 22, 44, 44);
			ctx.beginPath();
			ctx.arc(hubXPosition, centerY, 2.2, 0, Math.PI * 2);
			ctx.fillStyle = rgba(activePalette.accent, 0.76);
			ctx.fill();
		});
	}

	function drawThermocline() {
		const center = height * 0.52;
		const band = ctx.createLinearGradient(0, center - 18, 0, center + 18);
		band.addColorStop(0, rgba(activePalette.cold, 0.015));
		band.addColorStop(0.43, rgba(activePalette.accent, 0.065));
		band.addColorStop(0.58, rgba(activePalette.accent, 0.075));
		band.addColorStop(1, rgba(activePalette.warm, 0.025));
		ctx.fillStyle = band;
		ctx.fillRect(0, center - 18, width, 36);

		ctx.beginPath();
		for (let x = 0; x <= width + 4; x += 4) {
			const wave = Math.sin(x * 0.012 + time * 0.025) * 3.2 + Math.sin(x * 0.027 - time * 0.018) * 1.4;
			const y = center + wave;
			if (x === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.strokeStyle = rgba(activePalette.accent, 0.12);
		ctx.lineWidth = 1;
		ctx.stroke();
	}

	function drawVignette() {
		const radius = Math.max(width, height) * 0.72;
		const vignette = ctx.createRadialGradient(width * 0.5, height * 0.5, Math.min(width, height) * 0.18, width * 0.5, height * 0.5, radius);
		vignette.addColorStop(0, 'rgba(0,0,0,0)');
		vignette.addColorStop(1, 'rgba(0,0,0,0.75)');
		ctx.fillStyle = vignette;
		ctx.fillRect(0, 0, width, height);
	}

	function draw() {
		if (!width || !height) return;
		ctx.clearRect(0, 0, width, height);
		drawDepth();
		drawSignalNetwork();
		drawThermocline();
		drawVignette();
	}

	function animate() {
		draw();
		time += 0.5;
		if (!reducedMotion.matches && !document.hidden) frameId = window.requestAnimationFrame(animate);
	}

	function start() {
		if (frameId) window.cancelAnimationFrame(frameId);
		frameId = 0;
		animate();
	}

	window.oceanTechPalettes = palettes;
	window.setOceanTechPalette = function (palette) {
		const next = typeof palette === 'string' ? palettes[palette] : palette;
		if (!next || !['base', 'cold', 'warm', 'grid', 'accent'].every((key) => Array.isArray(next[key]) && next[key].length === 3)) return false;
		activePalette = next;
		draw();
		return true;
	};

	window.addEventListener('resize', resize);
	document.addEventListener('visibilitychange', () => {
		if (document.hidden) {
			if (frameId) window.cancelAnimationFrame(frameId);
			frameId = 0;
		} else start();
	});
	if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', start);
	else if (reducedMotion.addListener) reducedMotion.addListener(start);
	resize();
	start();
})();
