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

	_snapX: function (x) {
		if (!this.tilesize) {
			throw new Error('Invalid state: tilesize not set');
		}
		return this.round(x/this.tilesize) * this.tilesize;
	},

	_snapY: function (y) {
		if (!this.tilesize) {
			throw new Error('Invalid state: tilesize not set');
		}
		return this.round(y/this.tilesize) * this.tilesize;
	},

	snap: function (pos) {
		return this.snapInPlace({ x: pos.x, y: pos.y });
	},

	snapInPlace: function (pos) {
		pos.x = this._snapX(pos.x);
		pos.y = this._snapY(pos.y);
		return pos;
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
		if (this._loaded) return;
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
	},

	// Snap an entity to the grid. This includes:
	// - updating its position in the game to be grid-aligned
	// - updating which spot it occupies in `this._grid`
	snapEntity: function (ent) {

		// Remember where this Entity was in the Grid
		var prevGridPos = { r: ent.gridPos.r, c: ent.gridPos.c };

		// Figure out where this Entity should go
		var newPos = this.snap(ent.pos), ts = this.tilesize;
		var newGridPos = { r: newPos.y/ts, c: newPos.x/ts };

		// If nothing has changed, don't bother updating the Grid
		if (ent.pos.x === newPos.x && ent.pos.y === newPos.y &&
			ent.gridPos.r === newGridPos.r && ent.gridPos.c === newGridPos.c) {
			return;
		}

		// Update entity
		ent.pos.x = newPos.x;
		ent.pos.y = newPos.y;

		// Update `this._grid`
		this.grid.remove(ent);
		this.grid.add(ent, newGridPos.r, newGridPos.c);
	},

	neighborsOf: function (ent) {
		return this.grid.neighbors(ent.gridPos.r, ent.gridPos.c);
	},

	removeEntity: function (ent) {
		(ent instanceof lat.Wall) && ent._orient(true);
		this.parent(ent);
		ent.snapping && this.grid.remove(ent);
	}
});

ig.Entity.inject({
	snapping: true,
	gridPos: { r: -1, c: -1 },

	init: function (x, y, settings) {
		this.parent(x, y, settings);
		this._snap();
	},

	ready: function () {
		ig.game._afterLoadLevel();
		this._snap();
	},

	_snap: function () {
		this.snapping && ig.game._loaded && ig.game.snapEntity(this);
	},

	update: function () {
		this.parent.apply(this, arguments);
		this._snap();
	},

	neighbors: function () {
		return ig.game.neighborsOf(this);
	}
});

});