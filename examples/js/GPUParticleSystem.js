/**
 * @author tsone https://github.com/tsone/
 */

var GPUParticleSystem = function ( width, renderer, fragShader, planeData ) {

	var width = width || 4;

	var renderer = renderer;

	planeData = ( planeData !== undefined ) ? planeData : [ 0,0,0,0 ];

	var shader = new THREE.ShaderMaterial( {

		uniforms: {
			qTex: { type: "t", value: null },
			pTex: { type: "t", value: null },
			planes: { type: "4fv", value: planeData }
		},
		defines: {
			NUM_PLANES: planeData.length / 4
		},
		vertexShader: "varying vec2 vUv; void main() { vUv = 0.5 + 0.5 * position.xy; gl_Position = vec4( position.xy, 0.0, 1.0 ); }",
		fragmentShader: fragShader

	} );

	var quad = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ), shader );

	var camera = new THREE.OrthographicCamera( -1, 1, 1, -1, 0, 1 );

	var rtPrev, rtCurr;

	function randomizeRenderTargetDecoy ( range ) {

		function randomizeTexture() {

			var a = new Float32Array( width*width * 3 );

			for ( var k = 0, kl = a.length; k < kl; k += 3 ) {

				var x = range * (Math.random() - 0.5);
				var y = range * (Math.random() - 0.5);
				var z = range * (Math.random() - 0.5);

				a[ k + 0 ] = x;
				a[ k + 1 ] = y;
				a[ k + 2 ] = z;

			}

			var texture = new THREE.DataTexture( a, width, width, THREE.RGBFormat, THREE.FloatType );
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
			type: THREE.FloatType
		} );

		return new THREE.WebGLRenderTarget( width, width, {
			extraColorTextures: [ qParams ],
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			generateMipmaps: false,
			format: THREE.RGBFormat,
			type: THREE.FloatType,
			stencilBuffer: false
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
