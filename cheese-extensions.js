ig.module(
	'plugins.lattice.cheese-extensions'
).requires(
	'plugins.lattice.lattice',
	'plugins.cheese.mouse-event-queue',
	'plugins.cheese.cursor'
).defines(function () {

// Convert canvas coordinates into grid-aligned coordinates, but don't
// account for screen offset. (Thus, coordinates that are off the edge of the
// world will still be off the edge when they are snapped.)
var doSnap = function (pos) {
	var rs = ig.game._rscreen;
	var sn = ig.game.snap({ x: pos.x + rs.x, y: pos.y + rs.y });
	return { x: sn.x - rs.x, y: sn.y - rs.y };
};

// Cheese extensions
lat.SnapCursor = ch.Cursor.extend({
	draw: function (x, y) {
		var snap = doSnap({ x: x, y: y });
		this.parent(snap.x, snap.y);
	}
});

ch.MouseEvent.inject({
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

});