ig.module(
	'plugins.lattice.cheese-extensions'
).requires(
	'plugins.lattice.lattice',
	'plugins.cheese.mouse-event-queue',
	'plugins.cheese.cursor'
).defines(function () {

// Cheese extensions
lat.SnapCursor = ch.Cursor.extend({
	snapping: false,

	draw: function (x, y) {
		if (this.snapping) {
			var snap = ig.game.snap({ x: x, y: y }, true),
				rs = ig.game._rscreen;
			this.parent(snap.x - rs.x, snap.y - rs.y);
		}
		else {
			this.parent(x, y);
		}
	}
});

ch.MouseEvent.inject({
	snap: { x: 0, y: 0 },
	grid: { r: 0, c: 0 },
	init: function (settings) {
		this.parent(settings);
		this.snap = ig.game.snap(this.pos, true);
		this.grid = {
			r: this.snap.y / ig.game.tilesize,
			c: this.snap.x / ig.game.tilesize
		};
	}
});

});