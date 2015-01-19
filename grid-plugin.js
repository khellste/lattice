ig.module(
	'plugins.lattice.grid-plugin'
).requires(
	'plugins.lattice.grid',
	'plugins.lattice.lattice'
).defines(function () {

lat.Grid.inject({
	plugins: {},

	addPlugin: function (name, Ctor, settings) {
		var settings = ig.merge(settings || { }, {
			grid: this,
			name: name
		});
		var plugin = new Ctor(settings);
		this.plugins[plugin.name] = plugin;
		var data = lat.GridCell.prototype.data;
		data[name] = { };
		lat.GridCell.inject({ data: data })
		ig.game._loaded && plugin.setup();
		return plugin;
	}
});

lat.GridPlugin = ig.Class.extend({
	name: 'gridPlugin',
	grid: null,

	init: function (settings) {
		ig.merge(this, settings);
		this.grid.forEach(function (cell) {
			cell.data[this.name] = { };
		}.bind(this));
	},

	// Gets the data for a given cell
	data: function (cell) {
		return cell.data[this.name];
	},

	// Called after each level is loaded
	setup: function () { }
});

// Setup plugins after
ig.Game.inject({
	_afterLoadLevel: function () {
		if (this.parent()) {
			for (var plugin in this.grid.plugins) {
				this.grid.plugins[plugin].setup();
			}
		}
	}
});

});