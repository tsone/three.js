/**
 * @author tsone https://github.com/tsone/
 */

THREE.GPUParticleSystem = function ( size, renderer, particleTex, options ) {

	options = options || {};

	var size = size || 4;
	var renderer = renderer;

	this.emitters = ( options.emitters !== undefined ) ? options.emitters : [];

	// Planes are represented in Hessian normal form; unit-length normal N and coefficient D.
	// Format: [ Nx, Ny, Nz, D ] = 4 floats (vec4)
	this.planeData = ( options.planeData !== undefined ) ? options.planeData : [ 0,0,0,0 ];

	// Capsules are represented by two endpoints (A, B), radius R and an unused value U.
	// Format: [ Ax, Ay, Az, R, Bx, By, Bz, U ] = 8 floats (2x vec4)
	this.capsuleData = ( options.capsuleData !== undefined ) ? options.capsuleData : [ 0,0,0,0,0,0,0,0 ];

	// Setup particle mesh, geometry, material.

// TODO: tsone: Particle material should be customizable, not hard-coded.
	var particleSize = ( options.particleSize !== undefined ) ? options.particleSize : 8;

	var particleUni = {
		positionTex:	{ type: "t", value: null },
		texture: 	{ type: "t", value: particleTex },
		particleSize: 	{ type: "f", value: particleSize }
	};
	var particleMat = new THREE.ShaderMaterial( {
		uniforms: 	particleUni,
		vertexShader:   THREE.GPUParticleSystem.particleVS.join('\n'),
		fragmentShader: THREE.GPUParticleSystem.particleFS.join('\n'),
		transparent: 	true,
		depthTest: 	false,
		depthWrite: 	false,
		blending: 	THREE.AdditiveBlending
	} );

	var particleGeo = new THREE.GPUParticleGeometry( size );

	THREE.Mesh.call( this, particleGeo, particleMat );

	// Setup simulation mesh, geometry, material.

	var simulationUni = {

		qTex: 		{ type: "t", value: null },
		pTex: 		{ type: "t", value: null },

		gravity:	{ type: "v3", value: new THREE.Vector3( 0, -0.0981, 0 ) },
		drag: 		{ type: "f", value: 0.996 },
		friction:	{ type: "f", value: 0.65 },
		bouncyness: 	{ type: "f", value: 0.43 },

		planes: 	{ type: "4fv", value: this.planeData },
		capsules: 	{ type: "4fv", value: this.capsuleData },

		emitterMatrix:	{ type: "Matrix4fv", value: [] },
		emitterRandom:	{ type: "4fv", value: [] },
		emitterSpawner:	{ type: "3fv", value: [] }

	};
	var simulationDef = {

		NUM_PLANES: this.planeData.length / 4,
		NUM_CAPSULES: this.capsuleData.length / 8,
		NUM_EMITTERS: this.emitters.length

	};
	var simulationMat = new THREE.ShaderMaterial( {

		uniforms: simulationUni, 
		defines: simulationDef,
		vertexShader: THREE.GPUParticleSystem.simulationVS.join( '\n' ),
		fragmentShader: THREE.GPUParticleSystem.simulationFS.join( '\n' )

	} );

	var quadMesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ), simulationMat );
	var quadCamera = new THREE.OrthographicCamera( -1, 1, 1, -1, 0, 1 );

	// Setup simulation rendertargets.

	this.rtPrev = null;
	this.rtCurr = null;

	function randomizeRenderTargetDecoy ( range ) {

		function randomizeTexture() {

			var a = new Float32Array( size*size * 4 );

			for ( var k = 0, kl = a.length; k < kl; k += 4 ) {

				var x = range * (Math.random() - 0.5);
				var y = range * (Math.random() - 0.5);
				var z = range * (Math.random() - 0.5);
				var life = 120.0; // TODO: tsone: set initial life

				a[ k + 0 ] = x;
				a[ k + 1 ] = y;
				a[ k + 2 ] = z;
				a[ k + 3 ] = life;

			}

			var texture = new THREE.DataTexture( a, size, size, THREE.RGBAFormat, THREE.FloatType );
			texture.minFilter = THREE.NearestFilter;
			texture.magFilter = THREE.NearestFilter;
			texture.needsUpdate = true;
			texture.flipY = false;

			return texture;

		};

		var renderTargetDecoy = randomizeTexture();
		renderTargetDecoy.extraColorTextures = [ randomizeTexture() ];
		return renderTargetDecoy;

	}

	function createRenderTarget ( type ) {

		var qParams = new THREE.TextureParams( {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			generateMipmaps: false,
			format: THREE.RGBAFormat,
			type: THREE.FloatType,
			depthTest: false,
			depthWrite: false
		} );

		return new THREE.WebGLRenderTarget( size, size, {
			extraColorTextures: [ qParams ],
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			generateMipmaps: false,
			format: THREE.RGBAFormat,
			type: THREE.FloatType,
			depthTest: false,
			depthWrite: false,
			stencilBuffer: false,
			depthBuffer: false
		} );

	}

	this.init = function () {

		this.rtPrev = randomizeRenderTargetDecoy( 3 );
		this.rtCurr = createRenderTarget();

		this.step();
		this.rtCurr = createRenderTarget();

	};

	this.step = function () {

		// Update emitter uniforms.

		this.updateMatrixWorld( false );

		var invSystemWorld = new THREE.Matrix4().getInverse( this.matrixWorld );
		var matrix = new THREE.Matrix4();
		var spawner = new THREE.Vector3();

		for ( var i = 0; i < this.emitters.length; i ++ ) {

			var emitter = this.emitters[ i ];

			emitter.updateMatrixWorld( false );

			matrix.multiplyMatrices( invSystemWorld, emitter.matrixWorld );
			matrix.flattenToArrayOffset( simulationUni.emitterMatrix.value, 16 * i );

			spawner.x = Math.random();
			spawner.y = Math.random();
			spawner.z = emitter.burstSize / size;
			spawner.toArray( simulationUni.emitterSpawner.value, 3 * i );

		}

		// Swap rendertargets and run simulation step (=render).

		simulationUni.qTex.value = this.rtPrev.extraColorTextures[ 0 ];
		simulationUni.pTex.value = this.rtPrev;

		renderer.render( quadMesh, quadCamera, this.rtCurr );

		var t = this.rtPrev;
		this.rtPrev = this.rtCurr;
		this.rtCurr = t;

		particleUni.positionTex.value = this.rtCurr;

	};

};

//
// Simulation shaders.
//

THREE.GPUParticleSystem.simulationVS = [

	"varying vec2 vUv;",

	"void main() {",

		"vUv = 0.5 + 0.5 * position.xy;",
		"gl_Position = vec4( position.xy, 0.0, 1.0 );",

	"}"

];

THREE.GPUParticleSystem.simulationFS = [

	"#extension GL_EXT_draw_buffers : require",

	"uniform sampler2D qTex;",
	"uniform sampler2D pTex;",

	"uniform vec3 gravity;",
	"uniform float drag;",
	"uniform float friction;",
	"uniform float bouncyness;",
//			uniform float frictionStatic; // 0.9
//			uniform float springConstant; // 0.4

// TODO: tsone: proper emitters uniforms
	"uniform mat4 emitterMatrix[ NUM_EMITTERS ];",
	"uniform vec4 emitterRandom[ NUM_EMITTERS ];",
	"uniform vec3 emitterSpawner[ NUM_EMITTERS ];",

	// Collision volumes.
	"uniform vec4 planes[ NUM_PLANES ];",
	"uniform vec4 capsules[ 2 * NUM_CAPSULES ];",

	"varying vec2 vUv;",

// Function hash3() from 'Voronoise' shadertoy.
// Created by inigo quilez - iq/2014
// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.
// https://www.shadertoy.com/view/Xd23Dh
	"vec3 hash3 ( vec2 p ) {",

		"vec3 q = vec3( dot( p, vec2( 127.1, 311.7 ) ),",
			"dot( p, vec2( 269.5, 183.3 ) ),",
			"dot( p, vec2( 419.2, 371.9 ) ) );",
		"return fract( sin( q ) * 43758.5453 );",

	"}",

	"float planeDist( const in vec4 pl, const in vec3 p ) {",

		"return dot( vec4( p, 1.0 ), pl );",

	"}",

	"void responsePlane( inout vec3 p, inout vec3 q, inout vec3 v, const in vec4 pl ) {",

		"float h = - dot( pl.xyz, v );",
		// TODO: tsone: would be more optimal if we use dist to p instead directly.
		// dist calculation to q would become redundant in that case.
		"float d = planeDist( pl, q );",

		"vec3 rn = h * pl.xyz;",
		"vec3 rt = rn + v;",

		"v = rn * bouncyness + rt * friction;",
		"q = q - 2.0*d * pl.xyz + (rn + rt - v) * (d / h);",
		"p = q + v;",

	"}",

	"void collidePlane( inout vec3 p, inout vec3 q, inout vec3 v, const in vec4 pl ) {",

		"if ( planeDist( pl, p ) < 0.0 ) responsePlane( p, q, v, pl );",

	"}",

	"void collideCapsule( inout vec3 p, inout vec3 q, inout vec3 v, const in vec4 a, const in vec4 b ) {",

		// TODO: tsone: can be optimized by precalcing dot(ba,ba), but it needs extra uniform...
		"vec3 pa = p - a.xyz, ba = b.xyz - a.xyz;",
		"float h = clamp( dot( pa, ba ) / dot( ba, ba ), 0.0, 1.0 );",
		"vec3 delta = pa - h*ba;",
		"float len = length( delta );",
		"float d = len - a.w;",
		"if ( d < 0.0 ) {",

			"vec3 n = delta / len;",
			"vec4 pl = vec4( n, dot( d * n - p, n) );",
			"responsePlane( p, q, v, pl );",

		"}",

	"}",

	"void emitter( inout vec3 p, inout float life, inout vec3 q, const vec3 rnd, const in mat4 matrix, const in vec4 random, const in vec3 spawner ) {",

		"vec2 dist = abs( spawner.xy - vUv );",

		"if ( dist.x + dist.y <= spawner.z ) {",

			"life = 120.0;",

// TODO: tsone: replace with better hash

//				"vec3 v = emitZ.xyz * (emitP.w - rnd.z*emitZ.w) - rnd.x*emitX.w * emitX.xyz - rnd.y*emitY.w * emitY.xyz;",
//				"p = emitP.xyz + rnd.y * emitX.xyz + rnd.x * emitY.xyz;",
//				"q = p - v;",
			"p = ( matrix * vec4( rnd, 1.0 ) ).xyz;",
			"q = p;",

		"}",

	"}",

	"void main() {",

		"vec3 q = texture2D( qTex, vUv ).xyz;",
		"vec4 pa = texture2D( pTex, vUv );",
		"vec3 p = pa.xyz;",

		// Emit new particle if current particle is dead.

		"if ( pa.w <= 0.0 ) {",

//			"vec3 rnd = 2.0 * fract( (257.0 * 63.0 / 3.0) * vec3( vUv, vUv.x*vUv.y ) ) - 1.0;",
			"vec3 rnd = 2.0 * hash3( vUv ) - 1.0;",

			"for ( int i = 0; i < NUM_EMITTERS; i ++ ) {",

				"emitter( p, pa.w, q, rnd, emitterMatrix[ i ], emitterRandom[ i ], emitterSpawner[ i ] );",

			"}",

		"}",

		// Force accumulation.
		"vec3 a = vec3( 0.0 );",
//				a += p / (-1.0* length( p )); // Attractor at origin.
		"a += gravity;",

		// Integration.
		"vec3 v = drag * (p - q) + a;",
		"q = p;",
		"p += v;",

		// Collision.

		"for ( int i = 0; i < NUM_PLANES; i ++ ) {",

			"collidePlane( p, q, v, planes[ i ] );",

		"}",

		"for ( int i = 0; i < NUM_CAPSULES; i ++ ) {",

			"collideCapsule( p, q, v, capsules[ 2*i ], capsules[ 2*i + 1 ] );",

		"}",

// TODO: tsone: reduce life randomly
		"gl_FragData[ 0 ] = vec4( p, pa.w - 1.0 );",
		"gl_FragData[ 1 ] = vec4( q, 0.0 );",

	"}"
];

//
// Particle shaders.
//

THREE.GPUParticleSystem.particleVS = [

	"uniform sampler2D positionTex;",
	"uniform float particleSize;",

	"varying vec2 vUv;",
	"varying float fade;",

	"void main() {",

		"vUv = 0.5 + position.xy;",

		"vec4 p = texture2D( positionTex, uv );",

		"vec3 center = p.xyz;",
		"vec4 mvPosition = modelViewMatrix * vec4( center, 1.0 );",
		"mvPosition.xy += particleSize * position.xy;",
		"gl_Position = projectionMatrix * mvPosition;",

// TODO: tsone: set to use some proper life uniform?
		"fade = max( p.w / 120.0, 0.0 ); ",
	"}"

];

THREE.GPUParticleSystem.particleFS = [

	"uniform sampler2D texture;",

	"varying vec2 vUv;",
	"varying float fade;",

	"void main() {",

		"vec4 color = texture2D( texture, vUv );",
		"gl_FragColor = 0.5*fade * color;",

	"}"

];


THREE.GPUParticleSystem.prototype = Object.create( THREE.Mesh.prototype );
THREE.GPUParticleSystem.prototype.constructor = THREE.GPUParticleSystem;

