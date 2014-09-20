ig.module(
	'plugins.lattice.BFS'
).requires(
	'plugins.lattice.grid-plugin',
	'impact.entity'
).defines(function () {

// A plugin encapsulating the work involved in BFS
lat.BfsGridPlugin = lat.GridPlugin.extend({

	// Set this to `true` to indicate that this BFS plugin should not treat
	// any Entities as impassible. (This only necessarily works as long as you
	// don't override the default implementation of `isImpassable`.) Setting
	// this to `true` also has the effect that this BFS plugin will never be
	// asked to re-calculate automatically, e.g., when a new impassable Entity
	// is spawned in the game. (You can always manually, re-calculate, though.)
	ignoreImpassable: false,

	// The "target" cell of this BFS, which all Entities will move towards if
	// they call `stepTorwardsTarget('this-plugin')`, assuming this plugin is
	// named 'this-plugin'.
	target: null,

	// Keep track of all the instances of this plugin so that we can easily
	// ask them to re-calculate if we need to.
	init: function () {
		this.parent.apply(this, arguments);
		lat.BfsGridPlugin.instances.push(this);
	},

	// Don't call this function explicitly. This function is called either in
	// lat.Grid.addPlugin or ig.Game.loadLevel, depending on whether or not the
	// level has already loaded.
	setup: function () {
		if (!this.target) return;

		// Case: `target` is an entity
		if (this.target instanceof ig.Entity) {
			var pos = this.target.gridPos;
			this.target = this.grid.cellAt(pos.r, pos.c);
		}

		// Case: `target` is a pair of { r, c } coords
		else if (this.target.r != null && this.target.c != null) {
			this.target = this.grid.cellAt(this.targer.r, this.target.c);
		}

		// Case: `target` is a pair of { x, y } coords
		else if (this.target.x != null && this.target.y != null) {
			var snap = ig.game.snap(this.target), ts = ig.game.tilesize;
			this.target = this.grid.cellAt(snap.y / ts, snap.x / ts);
		}
		this.calculate();
	},

	// Called on a cell to determine whether or not that cell should be treated
	// as impassable, at least for the purposes of the BFS calculation.
	isImpassable: function (cell) {
		if (this.ignoreImpassable) return false;
		return cell.tenants.some(function (tenant) {
			return tenant.impassable;
		});
	},

	// Calculate or re-calculate the paths for this BFS plugin.
	calculate: function () {

		// Clean up any previous calculation
		this.grid.forEach(function (cell) {
			this.data(cell).next = null;
			this.data(cell).delta = null;
			this.data(cell).reachable = false;
			this.data(cell).name = this.name;
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

		// Calculate deltas, etc.
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

	// Return the "delta" metadata for the given grid cell
	deltaNext: function (r, c) {
		return this.data(this.grid.cellAt(r, c)).delta;
	},

	// Return whether or not the given cell can reach the BFS target
	reachable: function (r, c) {
		return this.data(this.grid.cellAt(r, c)).reachable;
	}
});

// List of all instances of BFS plugins
lat.BfsGridPlugin.instances = [];

// Call this to recalculate all BFS plugins
lat.BfsGridPlugin.recalculateAll = function () {
	lat.BfsGridPlugin.instances.forEach(function (bfs) {
		bfs.ignoreImpassable || bfs.calculate();
	});
};

// When an impassable object is created or destroyed, we need to
// re-calculate all the BFS plugins that care about impassability.
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

	// An object describing whatever BFS movement is currently being made, of
	// the form:
	// {
	// 		delta 	The { r, c } delta for this movement
	//		target 	The { r, c, x, y } target of the movement
	//		name 	The name of the BFS plugin that generated the movement
	//		vel		The velocity needed/used to effect the movement
	// }
	_bfs_curr: null,

	// The { r, c } delta object describing the *next* BFS movement the Entity
	// should take. This is used to "un-correct" the snap-to-target that occurs
	// after the Entity reaches its waypoint, provided `_bfs_next` represents a
	// movement in the same direction as `_bfs_curr`.
	_bfs_next: null,

	// Set this to true to pause the current BFS movement
	_bfs_pauseTimeoutId: null,
	_bfs_pause: false,
	_bfs_wasPaused: false,

	// Install `impassable` getter/setter that will cause all BFS plugins to
	// recalculate when changed.
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

	// Gets any BFS data associated either with the cell that this Entity is in
	// (for Entities that aren't currently moving), or with the cell that this
	// Entity is heading for (for Entities that are currently moving).
	_bfs_cellData: function (bfsName, pos) {
		pos = pos || (this._bfs_curr ? this._bfs_curr.target : this.gridPos);
		bfsName = bfsName || lat.BfsGridPlugin.instances[0].name;
		var cell = ig.game.grid.cellAt(pos.r, pos.c);
		return cell ? ig.game.grid.plugins[bfsName].data(cell) : null;
	},

	// Returns true if this Entity has just hit a BFS waypoint
	_bfs_checkWaypoint: function () {
		if (this._bfs_curr) {
			var curr = this._bfs_curr, d = curr.delta, t = curr.target;
			var px = this.pos.x, py = this.pos.y,
				tx = t.x, ty = t.y, dx = d.c, dy = d.r;
			if (((dx < 0 && px <= tx) || (dx > 0 && px >= tx) || (px === tx)) &&
				((dy < 0 && py <= ty) || (dy > 0 && py >= ty) || (py === ty))) {
				return true;
			}
		}
		return false;
	},

	// Override. Before invoking the parent, set velocities according to the
	// current BFS path, if there is one.
	update: function () {
		if (this._bfs_pause) {
			this.vel.x = this.vel.y = 0;
		}
		else if (this._bfs_curr) {
			this.vel.x = this._bfs_curr.vel.x;
			this.vel.y = this._bfs_curr.vel.y;
		}
		this.parent();
	},

	// Can I reach the BFS target?
	canReachTarget: function (bfsName, pos) {
		var data = this._bfs_cellData(bfsName, pos);
		return data ? data.reachable : false;
	},

	// Call this function to notify this Entity that you want it to move
	// towards the target of the given named BFS plugin.
	stepTowardsTarget: function (speed, bfsName) {
		bfsName = bfsName || lat.BfsGridPlugin.instances[0].name;

		// If I am already moving, do nothing.
		if (this._bfs_curr) {
			if (this.canReachTarget(bfsName)) {
				window.foobar = true;
				this._bfs_next = this._bfs_cellData(bfsName).delta;
				return true;
			}
			return false;
		}

		// Otherwise, find out where I need to move (if possible).
		else {
			var data = this._bfs_cellData(bfsName);
			if (data.reachable) {
				var del = data.delta, spe = speed || 1;
				if (!data.next) {
					return true;
				}
				var target = data.next.pos;
				target.x = target.c * ig.game.tilesize;
				target.y = target.r * ig.game.tilesize;
				this._bfs_curr = {
					delta: del,
					target: target,
					name: bfsName,
					vel: { x: del.c * spe, y: del.r * spe }
				};
				return true;
			}
			return false;
		}
	},

	pauseMovement: function (duration) {
		if (duration != null) {
			this._bfs_pauseTimeoutId = setTimeout(function () {
				this.resumeMovement();
			}.bind(this), duration);
		}
		this._bfs_pause = true;
	},

	resumeMovement: function () {
		this._bfs_pause = false;
		this._bfs_wasPaused = true;
		if (this._bfs_pauseTimeoutId != null) {
			clearTimeout(this._bfs_pauseTimeoutId);
			this._bfs_pauseTimeoutId = null;
		}
	},

	// Override. After invoking the parent behavior, check to see if this
	// Entity was on a BFS path and if it hit the waypoint on that path. If
	// both are true, remove the waypoint and correct the Entity's position to
	// match that of the waypoint. Removing the waypoint signals to the next
	// call to `stepTowardsTarget` that a new waypoint can be generated.
	// TODO: What happens when an Entity is displaced by a significantly large
	// dynamic collision?
	afterUpdate: function () {
		this.parent();

		// Check to see if I hit a waypoint.
		if (this._bfs_checkWaypoint()) {
			var curr = this._bfs_curr, next = this._bfs_next,
				_x = this.pos.x, _y = this.pos.y;

			// Snap my position to the waypoint I just hit
			this.pos.x = curr.target.x;
			this.pos.y = curr.target.y;
			ig.game.snapEntity(this);

			// If there is another BFS waiting to start, "un-correct" the
			// position if the next waypoint is in the same direction as the
			// waypoint this Entity just hit.
			if (next && next.r === curr.delta.r && next.c === curr.delta.c) {
				this._bfs_next = null;
				this.pos.x = _x;
				this.pos.y = _y;
			}

			this._bfs_curr = null;
			this.vel.x = this.vel.y = 0;
		}

		// If I'm trying to move to a waypoint but am blocked, remove the
		// offending waypoint.
		else if (!this._bfs_pause && !this._bfs_wasPaused && this._bfs_curr &&
			this.pos.x === this.last.x && this.pos.y === this.last.y) {
			this._bfs_curr = null;
			this.vel.x = this.vel.y = 0;
		}
		this._bfs_wasPaused = this._bfs_pause;
	}
});

});