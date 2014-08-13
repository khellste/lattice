ig.module(
	'plugins.lattice.lattice'
).requires(
	'impact.entity',
	'impact.game',
	'impact.collision-map',
	'impact.background-map',
	'impact.map',
	'plugins.cheese.cheese'
).defines(function () {
window.lat = window.lat || {};


// Convert canvas coordinates into grid-aligned coordinates, but don't
// account for screen offset. (Thus, coordinates that are off the edge of the
// world will still be off the edge when they are snapped.)
var doSnap = function (pos) {
	var rs = ig.game._rscreen;
	var sn = ig.game.snap({ x: pos.x + rs.x, y: pos.y + rs.y });
	return { x: sn.x - rs.x, y: sn.y - rs.y };
};

// Cheese extensions
lat.SnapCursor = ig.Cursor.extend({
	draw: function (x, y) {
		var snap = doSnap({ x: x, y: y });
		this.parent(snap.x, snap.y);
	}
});
ig.ClickEvent.inject({
	snap: { x: 0, y: 0 },
	grid: { x: 0, y: 0, r: 0, c: 0 },
	init: function (settings) {
		this.parent(settings);
		this.snap = doSnap(this.pos);
		this.grid = {
			x: this.snap.x + ig.game._rscreen.x,
			y: this.snap.y + ig.game._rscreen.y
		};
		this.grid.r = this.grid.y / ig.game.tilesize;
		this.grid.c = this.grid.x / ig.game.tilesize;
	}
});


// Wall
lat.Wall = ig.Entity.extend({
	init: function (x, y, settings) {
		this.parent(x, y, settings);

		this.addAnim( '0', 1, [ 0]); // 0000 - NONE
		this.addAnim('10', 1, [ 1]); // 1010 - above/below
		this.addAnim( '8', 1, [ 2]); // 1000 - above
		this.addAnim( '2', 1, [ 3]); // 0010 - below
		this.addAnim( '5', 1, [ 4]); // 0101 - left/right
		this.addAnim( '1', 1, [ 5]); // 0001 - left
		this.addAnim( '4', 1, [ 6]); // 0100 - right
		this.addAnim( '3', 1, [ 7]); // 0011 - below/left
		this.addAnim( '9', 1, [ 8]); // 1001 - above/left
		this.addAnim('12', 1, [ 9]); // 1100 - above/right
		this.addAnim( '6', 1, [10]); // 0110 - right/below
		this.addAnim('13', 1, [11]); // 1101 - above/right/left
		this.addAnim('14', 1, [12]); // 1011 - above/below/left
		this.addAnim( '7', 1, [13]); // 0111 - right/below/left
		this.addAnim('11', 1, [14]); // 1110 - above/right/below
		this.addAnim('15', 1, [15]); // 1111 - above/right/below/left

		//this.currentAnim = this.anims[0];
		this._initWallProperties();
		ig.game._loaded && this._orient();
	},

	ready: function () {
		this.parent();
		this._orient();
	},

	_initWallProperties: function () {
		var bit = { N: 8, E: 4, S: 2, W: 1 }, dir = 0;
		Object.defineProperties(this, {
			dir: {
				get: function () {
					return dir;
				}.bind(this),
				set: function (v) {
					this.currentAnim = this.anims[dir = v];
				}.bind(this)
			},
			north: {
				get: function () {
					return !!(this.dir & bit.N);
				}.bind(this),
				set: function (v) {
					this.dir = v ? (this.dir|bit.N) : (this.dir&~bit.N);
				}.bind(this)
			},
			east: {
				get: function () {
					return !!(this.dir & bit.E);
				}.bind(this),
				set: function (v) {
					this.dir = v ? (this.dir|bit.E) : (this.dir&~bit.E);
				}.bind(this)
			},
			south: {
				get: function () {
					return !!(this.dir & bit.S);
				}.bind(this),
				set: function (v) {
					this.dir = v ? (this.dir|bit.S) : (this.dir&~bit.S);
				}.bind(this)
			},
			west: {
				get: function () {
					return !!(this.dir & bit.W);
				}.bind(this),
				set: function (v) {
					this.dir = v ? (this.dir|bit.W) : (this.dir&~bit.W);
				}.bind(this)
			}		});
	},

	_orient: function (erase) {
		var nbr = this.neighbors(), val = !erase;
		var set = function (p, v) { return function (o) { o[p] = v; }; };

		this.north = this.south = this.east = this.west = false;
		nbr.up.length && nbr.up.forEach(set('south', this.north = val));
		nbr.down.length && nbr.down.forEach(set('north', this.south = val));
		nbr.left.length && nbr.left.forEach(set('east', this.west = val));
		nbr.right.length && nbr.right.forEach(set('west', this.east = val));
	}
});

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