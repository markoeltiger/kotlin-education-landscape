//#region node_modules/topojson-client/src/identity.js
function identity_default(x) {
	return x;
}
//#endregion
//#region node_modules/topojson-client/src/transform.js
function transform_default(transform) {
	if (transform == null) return identity_default;
	var x0, y0, kx = transform.scale[0], ky = transform.scale[1], dx = transform.translate[0], dy = transform.translate[1];
	return function(input, i) {
		if (!i) x0 = y0 = 0;
		var j = 2, n = input.length, output = new Array(n);
		output[0] = (x0 += input[0]) * kx + dx;
		output[1] = (y0 += input[1]) * ky + dy;
		while (j < n) output[j] = input[j], ++j;
		return output;
	};
}
//#endregion
//#region node_modules/topojson-client/src/reverse.js
function reverse_default(array, n) {
	var t, j = array.length, i = j - n;
	while (i < --j) t = array[i], array[i++] = array[j], array[j] = t;
}
//#endregion
//#region node_modules/topojson-client/src/feature.js
function feature_default(topology, o) {
	if (typeof o === "string") o = topology.objects[o];
	return o.type === "GeometryCollection" ? {
		type: "FeatureCollection",
		features: o.geometries.map(function(o) {
			return feature(topology, o);
		})
	} : feature(topology, o);
}
function feature(topology, o) {
	var id = o.id, bbox = o.bbox, properties = o.properties == null ? {} : o.properties, geometry = object(topology, o);
	return id == null && bbox == null ? {
		type: "Feature",
		properties,
		geometry
	} : bbox == null ? {
		type: "Feature",
		id,
		properties,
		geometry
	} : {
		type: "Feature",
		id,
		bbox,
		properties,
		geometry
	};
}
function object(topology, o) {
	var transformPoint = transform_default(topology.transform), arcs = topology.arcs;
	function arc(i, points) {
		if (points.length) points.pop();
		for (var a = arcs[i < 0 ? ~i : i], k = 0, n = a.length; k < n; ++k) points.push(transformPoint(a[k], k));
		if (i < 0) reverse_default(points, n);
	}
	function point(p) {
		return transformPoint(p);
	}
	function line(arcs) {
		var points = [];
		for (var i = 0, n = arcs.length; i < n; ++i) arc(arcs[i], points);
		if (points.length < 2) points.push(points[0]);
		return points;
	}
	function ring(arcs) {
		var points = line(arcs);
		while (points.length < 4) points.push(points[0]);
		return points;
	}
	function polygon(arcs) {
		return arcs.map(ring);
	}
	function geometry(o) {
		var type = o.type, coordinates;
		switch (type) {
			case "GeometryCollection": return {
				type,
				geometries: o.geometries.map(geometry)
			};
			case "Point":
				coordinates = point(o.coordinates);
				break;
			case "MultiPoint":
				coordinates = o.coordinates.map(point);
				break;
			case "LineString":
				coordinates = line(o.arcs);
				break;
			case "MultiLineString":
				coordinates = o.arcs.map(line);
				break;
			case "Polygon":
				coordinates = polygon(o.arcs);
				break;
			case "MultiPolygon":
				coordinates = o.arcs.map(polygon);
				break;
			default: return null;
		}
		return {
			type,
			coordinates
		};
	}
	return geometry(o);
}
//#endregion
export { feature_default as t };
