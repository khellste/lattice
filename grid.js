ig.module(
	'plugins.lattice.grid'
).requires(
).defines(function () {
window.lat = window.lat || {};

// Grid class
lat.Grid = ig.Class.extend({
	size: { r: 0, c: 0 },
	_data: [],

	init: function (settings) {
		this.size = settings.size || this.size;
	},

	_bucket: function (r, c) {
		if (r < 0 || r >= this.size.r ||
			c < 0 || c >= this.size.c) {
			return null;
		}
		this._data[r] = this._data[r] || [];
		this._data[r][c] = this._data[r][c] || [];
		return this._data[r][c];
	},

	add: function (entity, r, c) {
		var data = this._bucket(r, c);
		if (!data) return false;
		if (data.indexOf(entity) >= 0) {
			return false;
		}
		data.push(entity);
		entity.gridPos = { r: r, c: c };
		return true;
	},

	remove: function (entity) {
		var r = entity.gridPos.r, c = entity.gridPos.c;
		var data = this._bucket(r, c);
		if (!data) return;
		data.erase(entity);
		entity.gridPos = { r: -1, c: -1 };
	},

	get: function (r, c) {
		return this._bucket(r, c);
	},

	neighbors: function (r, c) {
		return {
			up: this._bucket(r - 1, c) || [],
			down: this._bucket(r + 1, c) || [],
			left: this._bucket(r, c - 1) || [],
			right: this._bucket(r, c + 1) || [],
			upLeft: this._bucket(r - 1, c - 1) || [],
			upRight: this._bucket(r - 1, c + 1) || [],
			downLeft: this._bucket(r + 1, c - 1) || [],
			downRight: this._bucket(r + 1, c + 1) || []
		};
	}
});

});