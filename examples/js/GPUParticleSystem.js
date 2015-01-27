/**
 * @author tsone https://github.com/tsone/
 */

var GPUParticleSystem = function ( size, renderer, planeData, capsuleData ) {

	var vertSrc = [

		"varying vec2 vUv;",

		"void main() {",

			"vUv = 0.5 + 0.5 * position.xy;",
			"gl_Position = vec4( position.xy, 0.0, 1.0 );",

		"}"

	];

	var fragSrc = [

		"#extension GL_EXT_draw_buffers : require",

		"uniform sampler2D qTex;",
		"uniform sampler2D pTex;",

		"uniform vec3 gravity;",
		"uniform float drag;",
		"uniform float friction;",
		"uniform float bouncyness;",
//			uniform float frictionStatic; // 0.9
//			uniform float springConstant; // 0.4

		// Collision volumes.
		"uniform vec4 planes[ NUM_PLANES ];",
		"uniform vec4 capsules[ 2 * NUM_CAPSULES ];",

		"varying vec2 vUv;",

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

		"void main() {",

			"vec3 q = texture2D( qTex, vUv ).xyz;",
			"vec3 p = texture2D( pTex, vUv ).xyz;",

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

			"gl_FragData[ 0 ] = vec4( p, 0.0 );",
			"gl_FragData[ 1 ] = vec4( q, 0.0 );",

		"}"
	];

	var size = size || 4;

	var renderer = renderer;

	// Planes are represented in Hessian normal form; unit-length normal N and coefficient D.
	// Format: [ Nx, Ny, Nz, D ] = 4 floats (vec4)
	planeData = ( planeData !== undefined ) ? planeData : [ 0,0,0,0 ];

	// Capsules are represented by two endpoints (A, B), radius R and an unused value U.
	// Format: [ Ax, Ay, Az, R, Bx, By, Bz, U ] = 8 floats (2x vec4)
	capsuleData = ( capsuleData !== undefined ) ? capsuleData : [ 0,0,0,0,0,0,0,0 ];

	var shader = new THREE.ShaderMaterial( {

		uniforms: {
			qTex: 		{ type: "t", value: null },
			pTex: 		{ type: "t", value: null },

			gravity:	{ type: "v3", value: new THREE.Vector3( 0, -0.0981, 0 ) },
			drag: 		{ type: "f", value: 0.996 },
			friction:	{ type: "f", value: 0.65 },
			bouncyness: 	{ type: "f", value: 0.43 },

			planes: 	{ type: "4fv", value: planeData },
			capsules: 	{ type: "4fv", value: capsuleData }
		},
		defines: {
			NUM_PLANES: planeData.length / 4,
			NUM_CAPSULES: capsuleData.length / 8
		},
		vertexShader: vertSrc.join( '\n' ),
		fragmentShader: fragSrc.join( '\n' )

	} );

	var quad = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ), shader );

	var camera = new THREE.OrthographicCamera( -1, 1, 1, -1, 0, 1 );

	var rtPrev, rtCurr;

	function randomizeRenderTargetDecoy ( range ) {

		function randomizeTexture() {

			var a = new Float32Array( size*size * 3 );

			for ( var k = 0, kl = a.length; k < kl; k += 3 ) {

				var x = range * (Math.random() - 0.5);
				var y = range * (Math.random() - 0.5);
				var z = range * (Math.random() - 0.5);

				a[ k + 0 ] = x;
				a[ k + 1 ] = y;
				a[ k + 2 ] = z;

			}

			var texture = new THREE.DataTexture( a, size, size, THREE.RGBFormat, THREE.FloatType );
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
			format: THREE.RGBFormat,
			type: THREE.FloatType,
			depthTest: false,
			depthWrite: false
		} );

		return new THREE.WebGLRenderTarget( size, size, {
			extraColorTextures: [ qParams ],
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			generateMipmaps: false,
			format: THREE.RGBFormat,
			type: THREE.FloatType,
			depthTest: false,
			depthWrite: false,
			stencilBuffer: false,
			depthBuffer: false
		} );

	}

	this.step = function () {

		shader.uniforms.qTex.value = rtPrev.extraColorTextures[ 0 ];
		shader.uniforms.pTex.value = rtPrev;

		renderer.render( quad, camera, rtCurr );

		var t = rtPrev;
		rtPrev = rtCurr;
		rtCurr = t;

	};

	this.init = function () {

		rtPrev = randomizeRenderTargetDecoy( 3 );
		rtCurr = createRenderTarget();

		this.step();
		rtCurr = createRenderTarget();

	};

};

GPUParticleSystem.prototype = {

	constructor: GPUParticleSystem

};
