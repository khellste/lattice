ig.module(
	'plugins.lattice.BFS'
).requires(
	'plugins.lattice.grid-plugin',
	'impact.entity'
).defines(function () {

lat.BfsGridPlugin = lat.GridPlugin.extend({
	target: null,

	init: function () {
		this.parent.apply(this, arguments);
		lat.BfsGridPlugin.instances.push(this);
	},

	setup: function () {
		if (!this.target) return;

		// Fix up `this.target`
		if (this.target instanceof ig.Entity) {
			var pos = this.target.gridPos;
			this.target = this.grid.cellAt(pos.r, pos.c);
		}
		else if (this.target.r != null && this.target.c != null) {
			this.target = this.grid.cellAt(this.targer.r, this.target.c);
		}
		this.calculate();
	},

	isImpassable: function (cell) {
		return cell.tenants.some(function (tenant) {
			return tenant.impassable;
		});
	},

	calculate: function () {

		// Clean up any previous calculation
		this.grid.forEach(function (cell) {
			this.data(cell).next = null;
			this.data(cell).delta = null;
			this.data(cell).reachable = false;
		}.bind(this));

		// Setup
		var start = this.target;
		var frontier = [start];
		this.data(start).next = true;

		// Do BFS
		while (frontier.length) {
			var curr = frontier.shift();
			this.grid.neighborCells(curr).forEach(function (next) {
				if (this.isImpassable(next)) return;
				this.data(next).reachable = true;
				if (!this.data(next).next) {
					frontier.push(next);
					this.data(next).next = curr;
				}
			}.bind(this));
		}

		// Calculate deltas
		this.data(start).next = null;
		this.grid.forEach(function (cell) {
			if (this.data(cell).reachable) {
				var next = this.data(cell).next;
				this.data(cell).delta = {
					r: next ? next.pos.r - cell.pos.r : 0,
					c: next ? next.pos.c - cell.pos.c : 0
				}
			}
			else {
				this.data(cell).delta = null;
			}
		}.bind(this));
	},

	deltaNext: function (r, c) {
		return this.data(this.grid.cellAt(r, c)).delta;
	},

	reachable: function (r, c) {
		return this.data(this.grid.cellAt(r, c)).reachable;
	}
});
lat.BfsGridPlugin.instances = [];

ig.Entity.inject({
	impassable: false,

	_getBfsData: function (dataName, bfsName) {
		var grid = ig.game.grid, pos = this.gridPos;
		var plugin = grid.plugins[bfsName] || lat.BfsGridPlugin.instances[0];
		return plugin.data(grid.cellAt(pos.r, pos.c))[dataName];
	},

	isReachable: function (bfsName) {
		return this._getBfsData('reachable', bfsName);
	},

	getNextMove: function (bfsName) {
		return this._getBfsData('delta', bfsName);
	},

	moveToTarget: function (bfsName) {
		var delta = this.getNextMove(bfsName);
	}
});

});