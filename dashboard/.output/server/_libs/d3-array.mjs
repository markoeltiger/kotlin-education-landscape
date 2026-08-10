//#region node_modules/d3-array/src/ascending.js
function ascending(a, b) {
	return a == null || b == null ? NaN : a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
}
//#endregion
//#region node_modules/d3-array/src/descending.js
function descending(a, b) {
	return a == null || b == null ? NaN : b < a ? -1 : b > a ? 1 : b >= a ? 0 : NaN;
}
//#endregion
//#region node_modules/d3-array/src/bisector.js
function bisector(f) {
	let compare1, compare2, delta;
	if (f.length !== 2) {
		compare1 = ascending;
		compare2 = (d, x) => ascending(f(d), x);
		delta = (d, x) => f(d) - x;
	} else {
		compare1 = f === ascending || f === descending ? f : zero;
		compare2 = f;
		delta = f;
	}
	function left(a, x, lo = 0, hi = a.length) {
		if (lo < hi) {
			if (compare1(x, x) !== 0) return hi;
			do {
				const mid = lo + hi >>> 1;
				if (compare2(a[mid], x) < 0) lo = mid + 1;
				else hi = mid;
			} while (lo < hi);
		}
		return lo;
	}
	function right(a, x, lo = 0, hi = a.length) {
		if (lo < hi) {
			if (compare1(x, x) !== 0) return hi;
			do {
				const mid = lo + hi >>> 1;
				if (compare2(a[mid], x) <= 0) lo = mid + 1;
				else hi = mid;
			} while (lo < hi);
		}
		return lo;
	}
	function center(a, x, lo = 0, hi = a.length) {
		const i = left(a, x, lo, hi - 1);
		return i > lo && delta(a[i - 1], x) > -delta(a[i], x) ? i - 1 : i;
	}
	return {
		left,
		center,
		right
	};
}
function zero() {
	return 0;
}
//#endregion
//#region node_modules/d3-array/src/number.js
function number(x) {
	return x === null ? NaN : +x;
}
//#endregion
//#region node_modules/d3-array/src/bisect.js
var ascendingBisect = bisector(ascending);
var bisectRight = ascendingBisect.right;
ascendingBisect.left;
bisector(number).center;
//#endregion
//#region node_modules/d3-array/src/count.js
function count(values, valueof) {
	let count = 0;
	if (valueof === void 0) {
		for (let value of values) if (value != null && (value = +value) >= value) ++count;
	} else {
		let index = -1;
		for (let value of values) if ((value = valueof(value, ++index, values)) != null && (value = +value) >= value) ++count;
	}
	return count;
}
//#endregion
//#region node_modules/d3-array/src/extent.js
function extent(values, valueof) {
	let min;
	let max;
	if (valueof === void 0) {
		for (const value of values) if (value != null) if (min === void 0) {
			if (value >= value) min = max = value;
		} else {
			if (min > value) min = value;
			if (max < value) max = value;
		}
	} else {
		let index = -1;
		for (let value of values) if ((value = valueof(value, ++index, values)) != null) if (min === void 0) {
			if (value >= value) min = max = value;
		} else {
			if (min > value) min = value;
			if (max < value) max = value;
		}
	}
	return [min, max];
}
//#endregion
//#region node_modules/d3-array/src/fsum.js
var Adder = class {
	constructor() {
		this._partials = /* @__PURE__ */ new Float64Array(32);
		this._n = 0;
	}
	add(x) {
		const p = this._partials;
		let i = 0;
		for (let j = 0; j < this._n && j < 32; j++) {
			const y = p[j], hi = x + y, lo = Math.abs(x) < Math.abs(y) ? x - (hi - y) : y - (hi - x);
			if (lo) p[i++] = lo;
			x = hi;
		}
		p[i] = x;
		this._n = i + 1;
		return this;
	}
	valueOf() {
		const p = this._partials;
		let n = this._n, x, y, lo, hi = 0;
		if (n > 0) {
			hi = p[--n];
			while (n > 0) {
				x = hi;
				y = p[--n];
				hi = x + y;
				lo = y - (hi - x);
				if (lo) break;
			}
			if (n > 0 && (lo < 0 && p[n - 1] < 0 || lo > 0 && p[n - 1] > 0)) {
				y = lo * 2;
				x = hi + y;
				if (y == x - hi) hi = x;
			}
		}
		return hi;
	}
};
//#endregion
//#region node_modules/d3-array/src/identity.js
function identity(x) {
	return x;
}
//#endregion
//#region node_modules/d3-array/src/array.js
var array = Array.prototype;
var slice = array.slice;
array.map;
//#endregion
//#region node_modules/d3-array/src/constant.js
function constant(x) {
	return () => x;
}
//#endregion
//#region node_modules/d3-array/src/ticks.js
var e10 = Math.sqrt(50);
var e5 = Math.sqrt(10);
var e2 = Math.sqrt(2);
function tickSpec(start, stop, count) {
	const step = (stop - start) / Math.max(0, count), power = Math.floor(Math.log10(step)), error = step / Math.pow(10, power), factor = error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1;
	let i1, i2, inc;
	if (power < 0) {
		inc = Math.pow(10, -power) / factor;
		i1 = Math.round(start * inc);
		i2 = Math.round(stop * inc);
		if (i1 / inc < start) ++i1;
		if (i2 / inc > stop) --i2;
		inc = -inc;
	} else {
		inc = Math.pow(10, power) * factor;
		i1 = Math.round(start / inc);
		i2 = Math.round(stop / inc);
		if (i1 * inc < start) ++i1;
		if (i2 * inc > stop) --i2;
	}
	if (i2 < i1 && .5 <= count && count < 2) return tickSpec(start, stop, count * 2);
	return [
		i1,
		i2,
		inc
	];
}
function ticks(start, stop, count) {
	stop = +stop, start = +start, count = +count;
	if (!(count > 0)) return [];
	if (start === stop) return [start];
	const reverse = stop < start, [i1, i2, inc] = reverse ? tickSpec(stop, start, count) : tickSpec(start, stop, count);
	if (!(i2 >= i1)) return [];
	const n = i2 - i1 + 1, ticks = new Array(n);
	if (reverse) if (inc < 0) for (let i = 0; i < n; ++i) ticks[i] = (i2 - i) / -inc;
	else for (let i = 0; i < n; ++i) ticks[i] = (i2 - i) * inc;
	else if (inc < 0) for (let i = 0; i < n; ++i) ticks[i] = (i1 + i) / -inc;
	else for (let i = 0; i < n; ++i) ticks[i] = (i1 + i) * inc;
	return ticks;
}
function tickIncrement(start, stop, count) {
	stop = +stop, start = +start, count = +count;
	return tickSpec(start, stop, count)[2];
}
function tickStep(start, stop, count) {
	stop = +stop, start = +start, count = +count;
	const reverse = stop < start, inc = reverse ? tickIncrement(stop, start, count) : tickIncrement(start, stop, count);
	return (reverse ? -1 : 1) * (inc < 0 ? 1 / -inc : inc);
}
//#endregion
//#region node_modules/d3-array/src/nice.js
function nice(start, stop, count) {
	let prestep;
	while (true) {
		const step = tickIncrement(start, stop, count);
		if (step === prestep || step === 0 || !isFinite(step)) return [start, stop];
		else if (step > 0) {
			start = Math.floor(start / step) * step;
			stop = Math.ceil(stop / step) * step;
		} else if (step < 0) {
			start = Math.ceil(start * step) / step;
			stop = Math.floor(stop * step) / step;
		}
		prestep = step;
	}
}
//#endregion
//#region node_modules/d3-array/src/threshold/sturges.js
function thresholdSturges(values) {
	return Math.max(1, Math.ceil(Math.log(count(values)) / Math.LN2) + 1);
}
//#endregion
//#region node_modules/d3-array/src/bin.js
function bin() {
	var value = identity, domain = extent, threshold = thresholdSturges;
	function histogram(data) {
		if (!Array.isArray(data)) data = Array.from(data);
		var i, n = data.length, x, step, values = new Array(n);
		for (i = 0; i < n; ++i) values[i] = value(data[i], i, data);
		var xz = domain(values), x0 = xz[0], x1 = xz[1], tz = threshold(values, x0, x1);
		if (!Array.isArray(tz)) {
			const max = x1, tn = +tz;
			if (domain === extent) [x0, x1] = nice(x0, x1, tn);
			tz = ticks(x0, x1, tn);
			if (tz[0] <= x0) step = tickIncrement(x0, x1, tn);
			if (tz[tz.length - 1] >= x1) if (max >= x1 && domain === extent) {
				const step = tickIncrement(x0, x1, tn);
				if (isFinite(step)) {
					if (step > 0) x1 = (Math.floor(x1 / step) + 1) * step;
					else if (step < 0) x1 = (Math.ceil(x1 * -step) + 1) / -step;
				}
			} else tz.pop();
		}
		var m = tz.length, a = 0, b = m;
		while (tz[a] <= x0) ++a;
		while (tz[b - 1] > x1) --b;
		if (a || b < m) tz = tz.slice(a, b), m = b - a;
		var bins = new Array(m + 1), bin;
		for (i = 0; i <= m; ++i) {
			bin = bins[i] = [];
			bin.x0 = i > 0 ? tz[i - 1] : x0;
			bin.x1 = i < m ? tz[i] : x1;
		}
		if (isFinite(step)) {
			if (step > 0) {
				for (i = 0; i < n; ++i) if ((x = values[i]) != null && x0 <= x && x <= x1) bins[Math.min(m, Math.floor((x - x0) / step))].push(data[i]);
			} else if (step < 0) {
				for (i = 0; i < n; ++i) if ((x = values[i]) != null && x0 <= x && x <= x1) {
					const j = Math.floor((x0 - x) * step);
					bins[Math.min(m, j + (tz[j] <= x))].push(data[i]);
				}
			}
		} else for (i = 0; i < n; ++i) if ((x = values[i]) != null && x0 <= x && x <= x1) bins[bisectRight(tz, x, 0, m)].push(data[i]);
		return bins;
	}
	histogram.value = function(_) {
		return arguments.length ? (value = typeof _ === "function" ? _ : constant(_), histogram) : value;
	};
	histogram.domain = function(_) {
		return arguments.length ? (domain = typeof _ === "function" ? _ : constant([_[0], _[1]]), histogram) : domain;
	};
	histogram.thresholds = function(_) {
		return arguments.length ? (threshold = typeof _ === "function" ? _ : constant(Array.isArray(_) ? slice.call(_) : _), histogram) : threshold;
	};
	return histogram;
}
//#endregion
//#region node_modules/d3-array/src/max.js
function max(values, valueof) {
	let max;
	if (valueof === void 0) {
		for (const value of values) if (value != null && (max < value || max === void 0 && value >= value)) max = value;
	} else {
		let index = -1;
		for (let value of values) if ((value = valueof(value, ++index, values)) != null && (max < value || max === void 0 && value >= value)) max = value;
	}
	return max;
}
//#endregion
//#region node_modules/d3-array/src/merge.js
function* flatten(arrays) {
	for (const array of arrays) yield* array;
}
function merge(arrays) {
	return Array.from(flatten(arrays));
}
//#endregion
//#region node_modules/d3-array/src/range.js
function range(start, stop, step) {
	start = +start, stop = +stop, step = (n = arguments.length) < 2 ? (stop = start, start = 0, 1) : n < 3 ? 1 : +step;
	var i = -1, n = Math.max(0, Math.ceil((stop - start) / step)) | 0, range = new Array(n);
	while (++i < n) range[i] = start + i * step;
	return range;
}
//#endregion
//#region node_modules/d3-array/src/sum.js
function sum(values, valueof) {
	let sum = 0;
	if (valueof === void 0) {
		for (let value of values) if (value = +value) sum += value;
	} else {
		let index = -1;
		for (let value of values) if (value = +valueof(value, ++index, values)) sum += value;
	}
	return sum;
}
//#endregion
export { bin as a, ticks as c, max as i, Adder as l, range as n, tickIncrement as o, merge as r, tickStep as s, sum as t, bisectRight as u };
