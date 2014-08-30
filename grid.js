ig.module(
	'plugins.lattice.grid'
).requires(
).defines(function () {
window.lat = window.lat || {};

lat.GridCell = ig.Class.extend({
	tenants: [],
	meta: {}
});

lat.Grid = ig.Class.extend({
	size: { r: 0, c: 0 },
	singleTenant: true,
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
		return this.cells[r][c] = this.cells[r][c] || new lat.GridCell();
	},

	get: function (r, c) {
		var cell = this.cellAt(r, c), many = !this.singleTenant;
		return many ? cell.tenants : cell.tenants[0] ? cell.tenants[0] : null;
	},

	put: function (r, c, item) {
		var cell = this.cellAt(r, c);
		cell && cell.tenants.push(item);
	},

	rem: function (r, c, item) {
		var cell = this.cellAt(r, c);
		cell && cell.tenants.erase(item);
	},

	neighbors: function (r, c, named) {
		var n = this.get(r - 1, c), e = this.get(r, c + 1),
			s = this.get(r + 1, c), w = this.get(r, c - 1);
		if (named) {
			return { north: n, east: e, south: s, west: w };
		}
		else {
			var ret = [];
			if (this.singleTenant) {
				n && ret.push(n); e && ret.push(e);
				s && ret.push(s); w && ret.push(w);
			}
			else {
				var push = function (i) { ret.push(i); };
				n && n.forEach(push); e && e.forEach(push);
				s && s.forEach(push); w && w.forEach(push);
			}
			return ret;
		}
	}
});

});