ig.module(
	'plugins.lattice.BFS'
).requires(
	'plugins.lattice.grid-plugin',
	'impact.entity'
).defines(function () {

// A plugin encapsulating the work involved in BFS
lat.BfsGridPlugin = lat.GridPlugin.extend({
	ignoreImpassable: false,
	neverRecalculate: false,
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
		if (this.ignoreImpassable) return false;
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

// List of all instances of BFS plugins
lat.BfsGridPlugin.instances = [];

// Call this to recalculate all BFS plugins
lat.BfsGridPlugin.recalculateAll = function () {
	lat.BfsGridPlugin.instances.forEach(function (bfs) {
		bfs.ignoreImpassable || bfs.neverRecalculate || bfs.calculate();
	});
};

// When an impassable object is created or destroyed, recalculate
ig.Game.inject({
	spawnEntity: function () {
		var ent = this.parent.apply(this, arguments);
		if (ent.impassable === true) {
			lat.BfsGridPlugin.recalculateAll();
		}
		return ent;
	},

	removeEntity: function (ent) {
		this.parent.apply(this, arguments);
		if (ent.impassable === true) {
			lat.BfsGridPlugin.recalculateAll();
		}
	}
});

// Give each entity an `impassable` property. Also implement some utility
// methods for interfacing with BFS plugins without having to call methods
// directly on ig.game.grid
ig.Entity.inject({
	impassable: false,
	_bfs_data: { },

	init: function () {
		this.parent.apply(this, arguments);
		var impassable = this.impassable;
		Object.defineProperty(this, 'impassable', {
			enumerable: true,
			get: function () { return impassable; },
			set: function (v) {
				if (v === impassable) return;
				if (impassable = !!v) {
					lat.BfsGridPlugin.recalculateAll();
				}
			}
		});
	},

	// Gets any data associated with this Entity by the given BFS plugin
	_getBfsEntityData: function (bfsName) {
		if (!ig.game.grid.plugins[bfsName]) {
			bfsName = lat.BfsGridPlugin.instances[0].name;
		}
		return this._bfs_data[bfsName] = this._bfs_data[bfsName] || { };
	},

	// Gets any BFS data associated with the cell this Entity is in
	_getBfsCellData: function (bfsName, prop, _default) {
		var grid = ig.game.grid, pos = this.gridPos;
		var plugin = grid.plugins[bfsName] || lat.BfsGridPlugin.instances[0];
		var cell = grid.cellAt(pos.r, pos.c);
		return cell ? plugin.data(cell)[prop] : _default;
	},

	// Can I reach the BFS target?
	canReachTarget: function (bfsName) {
		return this._getBfsCellData(bfsName, 'reachable', false);
	},

	// Returns true if progress can be made, false otherwise
	// TODO: How to handle when the entity is moved, e.g., by a collision?
	stepTowardsTarget: function (speed, bfsName) {
		var data = this._getBfsEntityData(bfsName);

		// Calculate the next waypoint, if it hasn't been calculated already
		if (!data.delta) {
			if (!this.canReachTarget(bfsName)) {
				this.vel.x = this.vel.y = 0;
				return false;
			}
			data.delta = this._getBfsCellData(bfsName, 'delta', null);
			data.dest = {
				x: this.pos.x + data.delta.c * ig.game.tilesize,
				y: this.pos.y + data.delta.r * ig.game.tilesize
			};
		}

		// Am I at the final destination?
		if (data.delta.r === 0 && data.delta.c === 0) {
			data.done = data.delta = data.dest = null;
			this._bfs_data.lastBfs = null;
			this.vel.x = this.vel.y = 0;
			return true;
		}

		// Set up the entity to move next update
		this.vel.x = data.delta.c * (speed || 1);
		this.vel.y = data.delta.r * (speed || 1);
		this._bfs_data.lastBfs = bfsName;
		return true;
	},

	// Override. After doing the parent action, check to see if I have hit a
	// waypoint along a BFS path.
	handleMovementTrace: function (res) {
		this.parent(res);

		// Am I in the middle of BFS movement
		var bfs = this._bfs_data.lastBfs;
		if (bfs) {
			this._bfs_data.lastBfs = null;
			var data = this._getBfsEntityData(bfs);
			if (!data.delta || !data.dest) return;

			// Have I hit a BFS waypoint?
			var dr = data.delta.r, dc = data.delta.c, tx = data.dest.x,
				ty = data.dest.y, px = this.pos.x, py = this.pos.y;
			if (((dc > 0 && px >= tx) || (dc < 0 && px <= tx) || (px === tx)) &&
				((dr > 0 && py >= ty) || (dr < 0 && py <= ty) || (py === ty))) {
				this.pos = data.dest;
				data.delta = null;
			}
		}
	}
});

});