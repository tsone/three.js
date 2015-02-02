/**
 * @author tsone https://github.com/tsone/
 */
 
THREE.GPUParticleGeometry = function ( size ) {

	var numParticles = size * size;
	var numTriangles = numParticles * 2;
	var numVertices = numTriangles * 3;

	THREE.BufferGeometry.call( this );

	var vertices = new THREE.BufferAttribute( new Float32Array( numVertices * 2 ), 2 );
	var uvs = new THREE.BufferAttribute( new Float32Array( numVertices * 2 ), 2 );

	this.addAttribute( 'position', vertices );
	this.addAttribute( 'uv', uvs );

	var v = 0;
	function pushVerts( arr ) {
		for (var i=0; i < arr.length; i++) {
			vertices.array[ v++ ] = arr[ i ];
		}
	}

	var s = 0.5;
	for (var f = 0; f < numParticles; f++ ) {

		pushVerts( [
			-s, -s,
			s, -s,
			-s, s
		] );

		pushVerts( [
			-s, s,
			s, -s,
			s, s
		] );

	}

	for( var v = 0; v < numVertices; v++ ) {

		var i = ( v / 6 ) |0;
		var x = ( ( i % size ) |0 ) / size;
		var y = ( ( i / size ) |0 ) / size;

		uvs.array[ v*2 ] = x;
		uvs.array[ v*2 + 1 ] = y;

	}

};

THREE.GPUParticleGeometry.prototype = Object.create( THREE.BufferGeometry.prototype );
THREE.GPUParticleGeometry.prototype.constructor = THREE.GPUParticleGeometry;
