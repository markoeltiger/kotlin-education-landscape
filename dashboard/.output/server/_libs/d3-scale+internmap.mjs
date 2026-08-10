import { c as ticks, n as range, o as tickIncrement, s as tickStep, u as bisectRight } from "./d3-array.mjs";
import { r as number_default } from "./d3+[...].mjs";
import { n as round_default, r as value_default } from "./d3-interpolate.mjs";
import { a as formatPrefix, i as format, n as precisionPrefix_default, o as formatSpecifier, r as precisionFixed_default, t as precisionRound_default } from "./d3-format.mjs";
//#region node_modules/internmap/src/index.js
var InternMap = class extends Map {
	constructor(entries, key = keyof) {
		super();
		Object.defineProperties(this, {
			_intern: { value: /* @__PURE__ */ new Map() },
			_key: { value: key }
		});
		if (entries != null) for (const [key, value] of entries) this.set(key, value);
	}
	get(key) {
		return super.get(intern_get(this, key));
	}
	has(key) {
		return super.has(intern_get(this, key));
	}
	set(key, value) {
		return super.set(intern_set(this, key), value);
	}
	delete(key) {
		return super.delete(intern_delete(this, key));
	}
};
function intern_get({ _intern, _key }, value) {
	const key = _key(value);
	return _intern.has(key) ? _intern.get(key) : value;
}
function intern_set({ _intern, _key }, value) {
	const key = _key(value);
	if (_intern.has(key)) return _intern.get(key);
	_intern.set(key, value);
	return value;
}
function intern_delete({ _intern, _key }, value) {
	const key = _key(value);
	if (_intern.has(key)) {
		value = _intern.get(key);
		_intern.delete(key);
	}
	return value;
}
function keyof(value) {
	return value !== null && typeof value === "object" ? value.valueOf() : value;
}
//#endregion
//#region node_modules/d3-scale/src/init.js
function initRange(domain, range) {
	switch (arguments.length) {
		case 0: break;
		case 1:
			this.range(domain);
			break;
		default:
			this.range(range).domain(domain);
			break;
	}
	return this;
}
//#endregion
//#region node_modules/d3-scale/src/ordinal.js
var implicit = Symbol("implicit");
function ordinal() {
	var index = new InternMap(), domain = [], range = [], unknown = implicit;
	function scale(d) {
		let i = index.get(d);
		if (i === void 0) {
			if (unknown !== implicit) return unknown;
			index.set(d, i = domain.push(d) - 1);
		}
		return range[i % range.length];
	}
	scale.domain = function(_) {
		if (!arguments.length) return domain.slice();
		domain = [], index = new InternMap();
		for (const value of _) {
			if (index.has(value)) continue;
			index.set(value, domain.push(value) - 1);
		}
		return scale;
	};
	scale.range = function(_) {
		return arguments.length ? (range = Array.from(_), scale) : range.slice();
	};
	scale.unknown = function(_) {
		return arguments.length ? (unknown = _, scale) : unknown;
	};
	scale.copy = function() {
		return ordinal(domain, range).unknown(unknown);
	};
	initRange.apply(scale, arguments);
	return scale;
}
//#endregion
//#region node_modules/d3-scale/src/band.js
function band() {
	var scale = ordinal().unknown(void 0), domain = scale.domain, ordinalRange = scale.range, r0 = 0, r1 = 1, step, bandwidth, round = false, paddingInner = 0, paddingOuter = 0, align = .5;
	delete scale.unknown;
	function rescale() {
		var n = domain().length, reverse = r1 < r0, start = reverse ? r1 : r0, stop = reverse ? r0 : r1;
		step = (stop - start) / Math.max(1, n - paddingInner + paddingOuter * 2);
		if (round) step = Math.floor(step);
		start += (stop - start - step * (n - paddingInner)) * align;
		bandwidth = step * (1 - paddingInner);
		if (round) start = Math.round(start), bandwidth = Math.round(bandwidth);
		var values = range(n).map(function(i) {
			return start + step * i;
		});
		return ordinalRange(reverse ? values.reverse() : values);
	}
	scale.domain = function(_) {
		return arguments.length ? (domain(_), rescale()) : domain();
	};
	scale.range = function(_) {
		return arguments.length ? ([r0, r1] = _, r0 = +r0, r1 = +r1, rescale()) : [r0, r1];
	};
	scale.rangeRound = function(_) {
		return [r0, r1] = _, r0 = +r0, r1 = +r1, round = true, rescale();
	};
	scale.bandwidth = function() {
		return bandwidth;
	};
	scale.step = function() {
		return step;
	};
	scale.round = function(_) {
		return arguments.length ? (round = !!_, rescale()) : round;
	};
	scale.padding = function(_) {
		return arguments.length ? (paddingInner = Math.min(1, paddingOuter = +_), rescale()) : paddingInner;
	};
	scale.paddingInner = function(_) {
		return arguments.length ? (paddingInner = Math.min(1, _), rescale()) : paddingInner;
	};
	scale.paddingOuter = function(_) {
		return arguments.length ? (paddingOuter = +_, rescale()) : paddingOuter;
	};
	scale.align = function(_) {
		return arguments.length ? (align = Math.max(0, Math.min(1, _)), rescale()) : align;
	};
	scale.copy = function() {
		return band(domain(), [r0, r1]).round(round).paddingInner(paddingInner).paddingOuter(paddingOuter).align(align);
	};
	return initRange.apply(rescale(), arguments);
}
//#endregion
//#region node_modules/d3-scale/src/constant.js
function constants(x) {
	return function() {
		return x;
	};
}
//#endregion
//#region node_modules/d3-scale/src/number.js
function number(x) {
	return +x;
}
//#endregion
//#region node_modules/d3-scale/src/continuous.js
var unit = [0, 1];
function identity(x) {
	return x;
}
function normalize(a, b) {
	return (b -= a = +a) ? function(x) {
		return (x - a) / b;
	} : constants(isNaN(b) ? NaN : .5);
}
function clamper(a, b) {
	var t;
	if (a > b) t = a, a = b, b = t;
	return function(x) {
		return Math.max(a, Math.min(b, x));
	};
}
function bimap(domain, range, interpolate) {
	var d0 = domain[0], d1 = domain[1], r0 = range[0], r1 = range[1];
	if (d1 < d0) d0 = normalize(d1, d0), r0 = interpolate(r1, r0);
	else d0 = normalize(d0, d1), r0 = interpolate(r0, r1);
	return function(x) {
		return r0(d0(x));
	};
}
function polymap(domain, range, interpolate) {
	var j = Math.min(domain.length, range.length) - 1, d = new Array(j), r = new Array(j), i = -1;
	if (domain[j] < domain[0]) {
		domain = domain.slice().reverse();
		range = range.slice().reverse();
	}
	while (++i < j) {
		d[i] = normalize(domain[i], domain[i + 1]);
		r[i] = interpolate(range[i], range[i + 1]);
	}
	return function(x) {
		var i = bisectRight(domain, x, 1, j) - 1;
		return r[i](d[i](x));
	};
}
function copy(source, target) {
	return target.domain(source.domain()).range(source.range()).interpolate(source.interpolate()).clamp(source.clamp()).unknown(source.unknown());
}
function transformer() {
	var domain = unit, range = unit, interpolate = value_default, transform, untransform, unknown, clamp = identity, piecewise, output, input;
	function rescale() {
		var n = Math.min(domain.length, range.length);
		if (clamp !== identity) clamp = clamper(domain[0], domain[n - 1]);
		piecewise = n > 2 ? polymap : bimap;
		output = input = null;
		return scale;
	}
	function scale(x) {
		return x == null || isNaN(x = +x) ? unknown : (output || (output = piecewise(domain.map(transform), range, interpolate)))(transform(clamp(x)));
	}
	scale.invert = function(y) {
		return clamp(untransform((input || (input = piecewise(range, domain.map(transform), number_default)))(y)));
	};
	scale.domain = function(_) {
		return arguments.length ? (domain = Array.from(_, number), rescale()) : domain.slice();
	};
	scale.range = function(_) {
		return arguments.length ? (range = Array.from(_), rescale()) : range.slice();
	};
	scale.rangeRound = function(_) {
		return range = Array.from(_), interpolate = round_default, rescale();
	};
	scale.clamp = function(_) {
		return arguments.length ? (clamp = _ ? true : identity, rescale()) : clamp !== identity;
	};
	scale.interpolate = function(_) {
		return arguments.length ? (interpolate = _, rescale()) : interpolate;
	};
	scale.unknown = function(_) {
		return arguments.length ? (unknown = _, scale) : unknown;
	};
	return function(t, u) {
		transform = t, untransform = u;
		return rescale();
	};
}
function continuous() {
	return transformer()(identity, identity);
}
//#endregion
//#region node_modules/d3-scale/src/tickFormat.js
function tickFormat(start, stop, count, specifier) {
	var step = tickStep(start, stop, count), precision;
	specifier = formatSpecifier(specifier == null ? ",f" : specifier);
	switch (specifier.type) {
		case "s":
			var value = Math.max(Math.abs(start), Math.abs(stop));
			if (specifier.precision == null && !isNaN(precision = precisionPrefix_default(step, value))) specifier.precision = precision;
			return formatPrefix(specifier, value);
		case "":
		case "e":
		case "g":
		case "p":
		case "r":
			if (specifier.precision == null && !isNaN(precision = precisionRound_default(step, Math.max(Math.abs(start), Math.abs(stop))))) specifier.precision = precision - (specifier.type === "e");
			break;
		case "f":
		case "%":
			if (specifier.precision == null && !isNaN(precision = precisionFixed_default(step))) specifier.precision = precision - (specifier.type === "%") * 2;
			break;
	}
	return format(specifier);
}
//#endregion
//#region node_modules/d3-scale/src/linear.js
function linearish(scale) {
	var domain = scale.domain;
	scale.ticks = function(count) {
		var d = domain();
		return ticks(d[0], d[d.length - 1], count == null ? 10 : count);
	};
	scale.tickFormat = function(count, specifier) {
		var d = domain();
		return tickFormat(d[0], d[d.length - 1], count == null ? 10 : count, specifier);
	};
	scale.nice = function(count) {
		if (count == null) count = 10;
		var d = domain();
		var i0 = 0;
		var i1 = d.length - 1;
		var start = d[i0];
		var stop = d[i1];
		var prestep;
		var step;
		var maxIter = 10;
		if (stop < start) {
			step = start, start = stop, stop = step;
			step = i0, i0 = i1, i1 = step;
		}
		while (maxIter-- > 0) {
			step = tickIncrement(start, stop, count);
			if (step === prestep) {
				d[i0] = start;
				d[i1] = stop;
				return domain(d);
			} else if (step > 0) {
				start = Math.floor(start / step) * step;
				stop = Math.ceil(stop / step) * step;
			} else if (step < 0) {
				start = Math.ceil(start * step) / step;
				stop = Math.floor(stop * step) / step;
			} else break;
			prestep = step;
		}
		return scale;
	};
	return scale;
}
function linear() {
	var scale = continuous();
	scale.copy = function() {
		return copy(scale, linear());
	};
	initRange.apply(scale, arguments);
	return linearish(scale);
}
//#endregion
//#region node_modules/d3-scale/src/nice.js
function nice(domain, interval) {
	domain = domain.slice();
	var i0 = 0, i1 = domain.length - 1, x0 = domain[i0], x1 = domain[i1], t;
	if (x1 < x0) {
		t = i0, i0 = i1, i1 = t;
		t = x0, x0 = x1, x1 = t;
	}
	domain[i0] = interval.floor(x0);
	domain[i1] = interval.ceil(x1);
	return domain;
}
//#endregion
//#region node_modules/d3-scale/src/log.js
function transformLog(x) {
	return Math.log(x);
}
function transformExp(x) {
	return Math.exp(x);
}
function transformLogn(x) {
	return -Math.log(-x);
}
function transformExpn(x) {
	return -Math.exp(-x);
}
function pow10(x) {
	return isFinite(x) ? +("1e" + x) : x < 0 ? 0 : x;
}
function powp(base) {
	return base === 10 ? pow10 : base === Math.E ? Math.exp : (x) => Math.pow(base, x);
}
function logp(base) {
	return base === Math.E ? Math.log : base === 10 && Math.log10 || base === 2 && Math.log2 || (base = Math.log(base), (x) => Math.log(x) / base);
}
function reflect(f) {
	return (x, k) => -f(-x, k);
}
function loggish(transform) {
	const scale = transform(transformLog, transformExp);
	const domain = scale.domain;
	let base = 10;
	let logs;
	let pows;
	function rescale() {
		logs = logp(base), pows = powp(base);
		if (domain()[0] < 0) {
			logs = reflect(logs), pows = reflect(pows);
			transform(transformLogn, transformExpn);
		} else transform(transformLog, transformExp);
		return scale;
	}
	scale.base = function(_) {
		return arguments.length ? (base = +_, rescale()) : base;
	};
	scale.domain = function(_) {
		return arguments.length ? (domain(_), rescale()) : domain();
	};
	scale.ticks = (count) => {
		const d = domain();
		let u = d[0];
		let v = d[d.length - 1];
		const r = v < u;
		if (r) [u, v] = [v, u];
		let i = logs(u);
		let j = logs(v);
		let k;
		let t;
		const n = count == null ? 10 : +count;
		let z = [];
		if (!(base % 1) && j - i < n) {
			i = Math.floor(i), j = Math.ceil(j);
			if (u > 0) for (; i <= j; ++i) for (k = 1; k < base; ++k) {
				t = i < 0 ? k / pows(-i) : k * pows(i);
				if (t < u) continue;
				if (t > v) break;
				z.push(t);
			}
			else for (; i <= j; ++i) for (k = base - 1; k >= 1; --k) {
				t = i > 0 ? k / pows(-i) : k * pows(i);
				if (t < u) continue;
				if (t > v) break;
				z.push(t);
			}
			if (z.length * 2 < n) z = ticks(u, v, n);
		} else z = ticks(i, j, Math.min(j - i, n)).map(pows);
		return r ? z.reverse() : z;
	};
	scale.tickFormat = (count, specifier) => {
		if (count == null) count = 10;
		if (specifier == null) specifier = base === 10 ? "s" : ",";
		if (typeof specifier !== "function") {
			if (!(base % 1) && (specifier = formatSpecifier(specifier)).precision == null) specifier.trim = true;
			specifier = format(specifier);
		}
		if (count === Infinity) return specifier;
		const k = Math.max(1, base * count / scale.ticks().length);
		return (d) => {
			let i = d / pows(Math.round(logs(d)));
			if (i * base < base - .5) i *= base;
			return i <= k ? specifier(d) : "";
		};
	};
	scale.nice = () => {
		return domain(nice(domain(), {
			floor: (x) => pows(Math.floor(logs(x))),
			ceil: (x) => pows(Math.ceil(logs(x)))
		}));
	};
	return scale;
}
function log() {
	const scale = loggish(transformer()).domain([1, 10]);
	scale.copy = () => copy(scale, log()).base(scale.base());
	initRange.apply(scale, arguments);
	return scale;
}
//#endregion
export { linear as n, band as r, log as t };
