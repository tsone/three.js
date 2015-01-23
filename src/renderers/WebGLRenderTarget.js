/**
 * @author szimek / https://github.com/szimek/
 * @author alteredq / http://alteredqualia.com/
 * @author tsone / http://github.com/tsone/
 */

THREE.WebGLRenderTarget = function ( width, height, options ) {

	options = options || {};

	THREE.TextureParams.call( this, options );

	this.depthBuffer = options.depthBuffer !== undefined ? options.depthBuffer : true;
	this.stencilBuffer = options.stencilBuffer !== undefined ? options.stencilBuffer : true;

	this.shareDepthFrom = options.shareDepthFrom !== undefined ? options.shareDepthFrom : null;

	this.extraColorTextures = [];

	if ( options.extraColorTextures !== undefined ) {

		for ( var i = 0; i < options.extraColorTextures.length; i ++ ) {

			this.extraColorTextures[ i ] = options.extraColorTextures[ i ].clone();

		}

	}

	this.setSize( width, height );

};

THREE.WebGLRenderTarget.prototype = {

	constructor: THREE.WebGLRenderTarget,

	setSize: function ( width, height ) {

		this.width = width;
		this.height = height;

		for ( var i = 0; i < this.extraColorTextures.length; i ++ ) {

			var texture = this.extraColorTextures[ i ];

			texture.width = width;
			texture.height = height;

		}

	},

	clone: function ( renderTarget ) {

		if ( renderTarget === undefined ) {

			return new THREE.WebGLRenderTarget( this.width, this.height, this );

		} else {

			THREE.WebGLRenderTarget.call( renderTarget, this.width, this.height, this );

			return renderTarget;

		}

	},

	dispose: function () {

		this.dispatchEvent( { type: 'dispose' } );

	}

};

THREE.EventDispatcher.prototype.apply( THREE.WebGLRenderTarget.prototype );
