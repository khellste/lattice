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
		this.snapping && ig.game._loaded && this._snap();
	},

	ready: function () {
		ig.game._afterLoadLevel();
		this.snapping && this._snap();
	},

	_snap: function () {
		ig.game.snapEntity(this);
	},

	update: function () {
		this.parent.apply(this, arguments);
		this.snapping && this._snap();
	},

	neighbors: function () {
		return ig.game.grid.neighbors(this.gridPos.r, this.gridPos.c);
	}
});

});