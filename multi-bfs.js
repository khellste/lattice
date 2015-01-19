ig.module(
	'plugins.lattice.multi-bfs'
).requires(
	'plugins.lattice.bfs'
).defines(function () {

var id = 0;
lat.MultiBfsGridPlugin = lat.GridPlugin.extend({
	ignoreImpassable: false,

	// An array of { cell, bfs } objects
	targets: [],
	bfsPlugins: [],

	init: function (settings) {
		this.parent(settings);
		lat.MultiBfsGridPlugin.instances[this.name] = this;
	},

	setup: function () {
		if (this.targets.length === 0) return;

		// Parse the targets. After this map, all elements in the `targets`
		// array should be grid cells.
		this.targets = this.targets.map(function (target) {
			if (target instanceof ig.Entity) {
				var pos = target.gridPos;
				return this.grid.cellAt(pos.r, pos.c);
			}
			else if (target.r != null && target.c != null) {
				return this.grid.cellAt(target.r, target.c);
			}
			else if (target.x != null && target.y != null) {
				var snap = ig.game.snap(target), ts = ig.game.tilesize;
				return this.grid.cellAt(snap.y / ts, snap.x / ts);
			}
		}.bind(this));

		// Create a bunch of BFS plugins, one for each target
		this.bfsPlugins = this.targets.map(function (target) {
			var name = 'bfs-' + (id++) + '-' + Math.random();
			return this.grid.addPlugin(name,
				lat.BfsGridPlugin, { target: target }
			);
		}.bind(this));
	},

	findBestBfs: function (entity) {
		var cell = this.grid.cellAt(entity.gridPos.r, entity.gridPos.c);
		var bestBfs = this.bfsPlugins[0], bestDist = bestBfs.data(cell).dist;
		for (var i = 1; i < this.bfsPlugins.length; i++) {
			var bfs = this.bfsPlugins[i];
			var dist = bfs.data(cell).dist;
			if (dist < bestDist) {
				bestDist = dist;
				bestBfs = bfs;
			}
		}
		return bestBfs;
	},

	test: function (r, c) {
		return this.bfsPlugins.reduce(function (blocked, bfs) {
			return blocked || bfs.test(r, c);
		}, false);
	}
});
lat.MultiBfsGridPlugin.instances = { };

var maskBfs = function (bfsName, entity) {
	var multiPlugin = lat.MultiBfsGridPlugin.instances[bfsName];
	if (multiPlugin != null) {
		var bestBfs = multiPlugin.findBestBfs(entity);
		if (bestBfs != null) {
			return bestBfs.name;
		}
	}
	return bfsName;
};

ig.Entity.inject({
	stepTowardsTarget: function (speed, bfsName) {
		return this.parent(speed, maskBfs(bfsName, this));
	},

	canReachTarget: function (bfsName, pos) {
		return this.parent(maskBfs(bfsName, this), pos);
	},

	_bfs_callData: function (bfsName, pos) {
		return this.parent(maskBfs(bfsName, this), pos);
	}
});

});