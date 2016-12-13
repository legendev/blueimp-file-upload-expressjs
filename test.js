var im = require('imagemagick');

im.identify('gromit.gif', function(err, response){

	console.log(response);
});
