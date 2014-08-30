ig.module(
	'plugins.lattice.wall'
).requires(
	'impact.entity'
).defines(function () {
window.lat = window.lat || {};

// Wall
lat.Wall = ig.Entity.extend({
	impassable: true,
	snapping: true,

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

		this._initWallProperties();
		ig.game._loaded && this._orient();
	},

	ready: function () {
		this.parent();
		this._orient();
	},

	kill: function () {
		this.parent();
		this._orient(true)
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
			}
		});
	},

	_orient: function (erase) {
		var nbr = this.neighbors(true), val = !erase;
		this.north = this.south = this.east = this.west = false;
		nbr.north && (nbr.north.south = this.north = val);
		nbr.south && (nbr.south.north = this.south = val);
		nbr.east && (nbr.east.west = this.east = val);
		nbr.west && (nbr.west.east = this.west = val);
	}
});

});