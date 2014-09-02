ig.module(
	'plugins.lattice.lattice'
).requires(
	'impact.entity',
	'impact.game',
	'plugins.lattice.grid'
).defines(function () {
window.lat = window.lat || {};

// Game
ig.Game.inject({
	tilesize: 0,
	size: { x: 0, y: 0 },
	grid: null,
	round: Math.floor,
	_loaded: false,

	snap: function (pos, abs) {
		var ts = this.tilesize, rs = this._rscreen;
		return {
			x: this.round((pos.x + (abs ? rs.x : 0)) / ts) * ts,
			y: this.round((pos.y + (abs ? rs.y : 0)) / ts) * ts
		};
	},

	loadLevel: function () {
		this._loaded = false;
		var ret = this.parent.apply(this, arguments);
		this._afterLoadLevel();
		return ret;
	},

	// This function must be called at least once before `snap` will function
	// properly. Exposing this allows Entities created during the parent
	// implementation of `loadLevel` to use `snap` in their `ready` functions.
	_afterLoadLevel: function () {
		if (this._loaded) {
			return false;
		}
		this._loaded = true;
		var map = (function () {
			if (!ig.game.collisionMap.tilesize)
				return ig.game.backgroundMaps[0];
			return ig.game.collisionMap;
		})();
		this.tilesize = map.tilesize;
		this.grid = new lat.Grid({
			size: { r: map.height, c: map.width }
		});
		return true;
	},

	// Snap an entity to the grid. This includes:
	// - updating its position in the game to be grid-aligned
	// - updating which spot it occupies in `this._grid`
	snapEntity: function (ent) {
		if (ent.ignoreGrid) return;

		// Figure out where this Entity should go
		var newPos = this.snap(ent.pos), ts = this.tilesize;
		var newGridPos = { r: newPos.y/ts, c: newPos.x/ts };
		var x1 = ent.pos.x, y1 = ent.pos.y, x2 = newPos.x, y2 = newPos.y;
		var r1 = ent.gridPos.r, c1 = ent.gridPos.c,
			r2 = newGridPos.r, c2 = newGridPos.c;

		// Update entity position, if necessary and desired
		if (ent.snapping && (x1 !== x2 || y1 !== y2)) {
			ent.pos = newPos;
		}

		// Update grid, if necessary and if there isn't already a tenant at
		// the destination in a single-tenant grid
		if (r1 !== r2 || c1 !== c2 &&
			!(this.grid.singleTenant && this.grid.get(r2, c2))) {
			if (r1 >= 0 && c1 >= 0) {
				this.grid.rem(r1, c1, ent);
			}
			this.grid.put(r2, c2, ent);
			ent.gridPos = newGridPos;
		}
	},

	removeEntity: function (ent) {
		this.parent(ent);
		if (!ent.ignoreGrid) {
			this.grid.rem(ent.gridPos.r, ent.gridPos.c, ent);
		}
	}
});

ig.Entity.inject({
	ignoreGrid: false,
	snapping: true,
	gridPos: { r: -1, c: -1 },

	init: function (x, y, settings) {
		this.parent(x, y, settings);
		ig.game._loaded && ig.game.snapEntity(this);
	},

	ready: function () {
		ig.game._afterLoadLevel();
		ig.game.snapEntity(this);
	},

	update: function () {
		this.parent.apply(this, arguments);
		ig.game.snapEntity(this);
	},

	neighbors: function () {
		return ig.game.grid.neighbors(this.gridPos.r, this.gridPos.c);
	}
});

});