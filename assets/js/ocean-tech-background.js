(function () {
	'use strict';

	const canvas = document.getElementById('ocean-tech-background');
	if (!canvas || !canvas.getContext) return;

	const ctx = canvas.getContext('2d');
	if (!ctx) return;

	const palettes = {
		oceanTech: {
			base: [5, 13, 22], cold: [30, 180, 210], warm: [255, 120, 50],
			grid: [40, 160, 200], accent: [200, 240, 255]
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
	const random = (min, max) => min + Math.random() * (max - min);
	const rgb = (color) => 'rgb(' + color.join(',') + ')';
	const rgba = (color, alpha) => 'rgba(' + color.join(',') + ',' + alpha + ')';

	const particles = Array.from({ length: 110 }, (_, index) => ({
		x: Math.random(), y: Math.random(), size: random(0.7, 1.8),
		speed: random(0.035, 0.12), amplitude: random(5, 24),
		phase: random(0, Math.PI * 2), warm: index < 40
	}));

	const ripples = Array.from({ length: 7 }, () => ({
		x: Math.random(), y: Math.random(), phase: random(0, 240),
		speed: random(0.13, 0.28), period: random(180, 300),
		maxRadius: random(90, 230), cycle: -1
	}));

	function resize() {
		width = window.innerWidth;
		height = window.innerHeight;
		pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
		canvas.width = Math.round(width * pixelRatio);
		canvas.height = Math.round(height * pixelRatio);
		ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
		draw();
	}

	function drawDepth() {
		ctx.fillStyle = rgb(activePalette.base);
		ctx.fillRect(0, 0, width, height);

		let gradient = ctx.createRadialGradient(width * 0.5, 0, 0, width * 0.5, height * 0.48, height * 0.74);
		gradient.addColorStop(0, rgba(activePalette.cold, 0.10));
		gradient.addColorStop(1, rgba(activePalette.cold, 0));
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, width, height);

		gradient = ctx.createLinearGradient(0, height * 0.48, 0, height);
		gradient.addColorStop(0, rgba(activePalette.warm, 0));
		gradient.addColorStop(1, rgba(activePalette.warm, 0.13));
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, width, height);

		const pulse = 0.5 + 0.5 * Math.sin(time * 0.012);
		[
			{ x: 0, strength: 0.12 + pulse * 0.06 },
			{ x: width, strength: 0.12 + (1 - pulse) * 0.06 }
		].forEach((blob) => {
			const radius = Math.max(width, height) * 0.62;
			const glow = ctx.createRadialGradient(blob.x, height, 0, blob.x, height, radius);
			glow.addColorStop(0, rgba(activePalette.warm, blob.strength));
			glow.addColorStop(1, rgba(activePalette.warm, 0));
			ctx.fillStyle = glow;
			ctx.fillRect(0, 0, width, height);
		});

		gradient = ctx.createRadialGradient(width * 0.5, 0, 0, width * 0.5, 0, height * 0.55);
		gradient.addColorStop(0, rgba(activePalette.cold, 0.16));
		gradient.addColorStop(1, rgba(activePalette.cold, 0));
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, width, height);
	}

	function drawGrid() {
		const columns = 20;
		const rows = 11;
		ctx.lineWidth = 0.65;

		for (let column = 0; column <= columns; column += 1) {
			const x = (width * column) / columns;
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, height);
			ctx.strokeStyle = rgba(activePalette.grid, 0.018 + 0.022 * Math.abs(Math.sin(time * 0.018 + column)));
			ctx.stroke();
		}

		for (let row = 0; row <= rows; row += 1) {
			const y = (height * row) / rows;
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(width, y);
			ctx.strokeStyle = rgba(activePalette.grid, 0.018 + 0.022 * Math.abs(Math.sin(time * 0.018 + row + 20)));
			ctx.stroke();
		}

		for (let column = 0; column <= columns; column += 4) {
			for (let row = 0; row <= rows; row += 2) {
				if ((column * 7 + row * 11) % 13 > 2) continue;
				const x = (width * column) / columns;
				const y = (height * row) / rows;
				const pulse = 0.35 + 0.65 * Math.abs(Math.sin(time * 0.035 + column + row));
				const color = y < height * 0.52 ? activePalette.cold : activePalette.warm;
				const radius = 1.1 + pulse * 1.1;
				const halo = ctx.createRadialGradient(x, y, 0, x, y, radius * 4);
				halo.addColorStop(0, rgba(color, 0.28 * pulse));
				halo.addColorStop(1, rgba(color, 0));
				ctx.fillStyle = halo;
				ctx.fillRect(x - radius * 4, y - radius * 4, radius * 8, radius * 8);
				ctx.beginPath();
				ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
				ctx.fillStyle = rgba(color, 0.55 * pulse);
				ctx.fill();
			}
		}
	}

	function drawCurrents() {
		[0.12, 0.23, 0.34, 0.44, 0.61, 0.77, 0.9].forEach((level, index) => {
			const color = index === 4 || index === 5 ? activePalette.warm : activePalette.cold;
			const opacity = 0.06 + 0.05 * Math.abs(Math.sin(time * 0.013 + index));
			ctx.beginPath();
			for (let x = 0; x <= width + 8; x += 8) {
				const drift = time * (0.008 + index * 0.0012);
				const y = height * level + Math.sin(x * 0.009 + drift + index) * (5 + index) + Math.sin(x * 0.019 - drift * 0.7) * 2.5;
				if (x === 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}
			ctx.strokeStyle = rgba(color, opacity);
			ctx.lineWidth = 0.7;
			ctx.stroke();
		});
	}

	function drawRipples() {
		ripples.forEach((ripple) => {
			const elapsed = time * ripple.speed + ripple.phase;
			const cycle = Math.floor(elapsed / ripple.period);
			if (cycle !== ripple.cycle) {
				ripple.cycle = cycle;
				ripple.x = Math.random();
				ripple.y = Math.random();
				ripple.maxRadius = random(90, Math.max(100, Math.min(width, height) * 0.45));
			}
			const progress = (elapsed % ripple.period) / ripple.period;
			const radius = progress * ripple.maxRadius;
			const opacity = (1 - progress) * 0.11;
			if (radius < 1) return;

			ctx.beginPath();
			ctx.arc(ripple.x * width, ripple.y * height, radius, 0, Math.PI * 2);
			ctx.strokeStyle = rgba(activePalette.cold, opacity);
			ctx.lineWidth = 0.8;
			ctx.stroke();
			ctx.beginPath();
			ctx.arc(ripple.x * width, ripple.y * height, radius * 0.45, 0, Math.PI * 2);
			ctx.strokeStyle = rgba(activePalette.warm, opacity * 0.85);
			ctx.stroke();
		});
	}

	function drawParticles() {
		particles.forEach((particle) => {
			const y = ((particle.y * height - time * particle.speed) % (height + 24) + height + 24) % (height + 24) - 12;
			const x = particle.x * width + Math.sin(time * 0.02 + particle.phase) * particle.amplitude;
			const color = particle.warm ? activePalette.warm : activePalette.cold;
			const flicker = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * 0.045 + particle.phase));
			const haloRadius = particle.size * 5;
			const halo = ctx.createRadialGradient(x, y, 0, x, y, haloRadius);
			halo.addColorStop(0, rgba(color, 0.22 * flicker));
			halo.addColorStop(1, rgba(color, 0));
			ctx.fillStyle = halo;
			ctx.fillRect(x - haloRadius, y - haloRadius, haloRadius * 2, haloRadius * 2);
			ctx.beginPath();
			ctx.arc(x, y, particle.size * 0.7, 0, Math.PI * 2);
			ctx.fillStyle = rgba(color, 0.72 * flicker);
			ctx.fill();
		});
	}

	function drawThermocline() {
		const center = height * 0.52;
		const band = ctx.createLinearGradient(0, center - 18, 0, center + 18);
		band.addColorStop(0, rgba(activePalette.cold, 0.015));
		band.addColorStop(0.43, rgba(activePalette.accent, 0.095));
		band.addColorStop(0.58, rgba(activePalette.accent, 0.11));
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
		ctx.strokeStyle = rgba(activePalette.accent, 0.18);
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
		drawGrid();
		drawCurrents();
		drawRipples();
		drawParticles();
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
