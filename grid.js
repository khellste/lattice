ig.module(
	'plugins.lattice.grid'
).requires(
).defines(function () {
window.lat = window.lat || {};

lat.GridCell = ig.Class.extend({
	tenants: [],
	data: {},
	pos: { r: -1, c: -1 },
	grid: null,

	init: function (settings) {
		ig.merge(this, settings);
	}
});

lat.Grid = ig.Class.extend({
	size: { r: 0, c: 0 },
	singleTenant: false,
	cells: [],

	init: function (settings) {
		ig.merge(this, settings);
		for (var i = 0; i < this.size.r; i++) {
			for (var j = 0; j < this.size.c; j++) {
				this.cellAt(i, j);
			}
		}
	},

	cellAt: function (r, c) {
		if (r < 0 || r >= this.size.r || c < 0 || c >= this.size.c) {
			return null;
		}
		this.cells[r] = this.cells[r] || [];
		return this.cells[r][c] = this.cells[r][c] || new lat.GridCell({
			pos: { r: r, c: c },
			grid: this
		});
	},

	forEach: function (cb) {
		this.cells.forEach(function (row, r) {
			row.forEach(function (cell, c) {
				cb(cell, r, c);
			});
		});
	},

	get: function (r, c) {
		var cell = this.cellAt(r, c), many = !this.singleTenant;
		if (!cell) return null;
		return many ? cell.tenants : (cell.tenants[0] ? cell.tenants[0] : null);
	},

	put: function (r, c, item) {
		var cell = this.cellAt(r, c);
		cell && cell.tenants.push(item);
	},

	rem: function (r, c, item) {
		var cell = this.cellAt(r, c);
		cell && cell.tenants.erase(item);
	},

	neighborCells: function (cell) {
		var r = cell.pos.r, c = cell.pos.c, ret = [];
		var n = this.cellAt(r - 1, c), e = this.cellAt(r, c + 1),
			s = this.cellAt(r + 1, c), w = this.cellAt(r, c - 1);
		n && ret.push(n); e && ret.push(e);
		s && ret.push(s); w && ret.push(w);
		ret.north = n; ret.east = e; ret.south = s; ret.west = w;
		return ret;
	},

	neighbors: function (r, c, Type) {
		var test = function (o) { return (!Type) || (o instanceof Type); };
		var ret = [],
			n = this.get(r - 1, c), e = this.get(r, c + 1),
			s = this.get(r + 1, c), w = this.get(r, c - 1);
		if (this.singleTenant) {
			n && test(n) && ret.push(n) && (ret.north = n);
			e && test(n) && ret.push(e) && (ret.east = e);
			s && test(n) && ret.push(s) && (ret.south = s);
			w && test(n) && ret.push(w) && (ret.west = w);
		}
		else {
			ret.north = []; ret.east = [];
			ret.south = []; ret.west = [];
			var push = function (arr, i) {
				test(i) && ret.push(i) && arr.push(i);
			};
			n && n.forEach(push.bind(null, ret.north));
			e && e.forEach(push.bind(null, ret.east));
			s && s.forEach(push.bind(null, ret.south));
			w && w.forEach(push.bind(null, ret.west));
		}
		return ret;
	}
});

});